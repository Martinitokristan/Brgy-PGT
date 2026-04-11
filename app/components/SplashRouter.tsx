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
      if (isStandalone !== true) return;

      // 1. Simply fade in
      await controls.start({
        opacity: 1,
        scale: 1,
        transition: { duration: 0.5, ease: "easeOut" },
      });

      // Show the beautifully simple splash for a smooth 1.5 seconds
      await new Promise((r) => setTimeout(r, 1500));

      // 2. Fade out slightly as we transition
      await controls.start({
        opacity: 0,
        scale: 1.05,
        transition: { duration: 0.4, ease: "easeInOut" },
      });

      if (isAuthenticated) {
        router.push(userRole === "admin" ? "/admin/dashboard" : "/feed");
      } else {
        setShowSplash(false);
      }
    }

    runSplashAnimation();
  }, [isStandalone, controls, isAuthenticated, userRole, router]);

  if (isStandalone === null) {
    return (
      <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-[#1e3a8a] to-[#312e81]" />
    );
  }

  if (!isStandalone) {
    return showSplash ? null : <>{children}</>;
  }

  if (!showSplash) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#1e3a8a] to-[#312e81]">
      <motion.div
        className="flex flex-col items-center justify-center gap-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={controls}
      >
        <img
          src="/icon.png"
          alt="BarangayPGT Logo"
          className="h-32 w-32 drop-shadow-2xl rounded-3xl"
        />
        <h1 className="text-3xl font-black text-white tracking-wide drop-shadow-lg text-center px-4">
          Barangay Pagatpatan
        </h1>
      </motion.div>
    </div>
  );
}
