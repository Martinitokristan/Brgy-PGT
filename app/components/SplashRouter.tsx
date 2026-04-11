"use client";

import { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { useRouter } from "next/navigation";

interface SplashRouterProps {
  isAuthenticated: boolean;
  userRole?: string | null;
  children: React.ReactNode;
}

export default function SplashRouter({
  isAuthenticated,
  userRole,
  children,
}: SplashRouterProps) {
  const router = useRouter();
  const controls = useAnimation();
  const [showSplash, setShowSplash] = useState(true);
  const [isStandalone, setIsStandalone] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const pwaMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(pwaMode);

      // If NOT running in PWA standalone mode
      if (!pwaMode) {
        if (isAuthenticated) {
          router.push(userRole === "admin" ? "/admin/dashboard" : "/feed");
        } else {
          setShowSplash(false);
        }
      }
    }
  }, [isAuthenticated, userRole, router]);

  useEffect(() => {
    async function runSplashAnimation() {
      if (isStandalone !== true) return; // Only run if confirmed standalone

      // 1. Roll in from the right. We start at x: "100vw" and rotate: 450 (which is 360 + 90)
      // As it translates to x: 0, it rotates counter-clockwise to 90 degrees.
      await controls.start({
        x: 0,
        rotate: 90,
        transition: { duration: 1.0, ease: "backOut" },
      });

      // Brief pause at 90 degrees
      await new Promise((r) => setTimeout(r, 200));

      // 2. Fix the B! Rotate from 90 to 0 (upright)
      await controls.start({
        rotate: 0,
        transition: { type: "spring", stiffness: 260, damping: 20 },
      });

      // Pause briefly upright, looking perfect
      await new Promise((r) => setTimeout(r, 400));

      // 3. Zoom into the app
      await controls.start({
        scale: 30,
        opacity: 0,
        transition: { duration: 0.6, ease: "anticipate" },
      });

      // 4. Complete the routing
      if (isAuthenticated) {
        router.push(userRole === "admin" ? "/admin/dashboard" : "/feed");
      } else {
        setShowSplash(false); // Reveal the landing page!
      }
    }

    runSplashAnimation();
  }, [isStandalone, controls, isAuthenticated, userRole, router]);

  // While determining standalone state, avoid flashing the landing page
  if (isStandalone === null) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#1e3a8a] to-[#312e81]" />
    );
  }

  // If we decided not to show the splash screen (e.g. Chrome tab)
  if (!isStandalone) {
    return showSplash ? null : <>{children}</>;
  }

  // If the animation finished and user is not auth
  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1e3a8a] to-[#312e81]">
      <motion.div
        initial={{ x: "100vw", rotate: 450, scale: 1 }}
        animate={controls}
      >
        <img
          // We use the imported source or standard public route. Using the 512x512 PWA icon.
          src="/icon.png"
          alt="BarangayPGT Logo"
          className="h-32 w-32 drop-shadow-2xl rounded-3xl"
        />
      </motion.div>
    </div>
  );
}
