"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Handles Android gesture navigation (swipe-back) in PWA standalone mode.
 * - Pushes ONE sentinel entry on mount at the bottom of history.
 * - Shows "Press back again to exit" toast when user reaches the bottom.
 * - Second back within 2 seconds exits the app.
 * - Only activates in PWA standalone mode (not desktop browser).
 * - Does NOT re-push on pathname change to avoid conflicts with drawers/modals.
 */
export default function MobileNavGuard() {
  const [showToast, setShowToast] = useState(false);
  const exitPending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches === true ||
      !!(window.navigator as { standalone?: boolean }).standalone;

    if (!isStandalone) return;

    // Push ONE sentinel at the bottom — only intercept when user backs all the way out
    window.history.pushState({ __pwaGuard: true }, "");

    const onPopState = (e: PopStateEvent) => {
      // Only intercept when arriving at our guard sentinel
      if (e.state?.__pwaGuard !== true) return;
      // Ignore if it's a drawer/modal sentinel on top
      if (e.state?.__drawer) return;

      if (exitPending.current) {
        // Second back confirmed — let system exit
        return;
      }

      // Block exit: push sentinel back and show "press again" toast
      window.history.pushState({ __pwaGuard: true }, "");
      exitPending.current = true;
      setShowToast(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        exitPending.current = false;
        setShowToast(false);
      }, 2000);
    };

    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      clearTimeout(timer.current);
    };
  }, []);

  if (!showToast) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 z-[9999] -translate-x-1/2 rounded-full bg-slate-800/90 px-5 py-2.5 text-sm font-medium text-white shadow-lg"
      style={{ animation: "fadeInUp 0.2s ease-out" }}
    >
      Press back again to exit
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
