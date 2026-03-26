"use client";

import { useEffect } from "react";

/** Reads dark-mode preference from localStorage and applies it to <html> on every mount. */
export default function ThemeProvider() {
  useEffect(() => {
    const isDark = localStorage.getItem("brgy_dark") === "1";
    document.documentElement.classList.toggle("dark", isDark);

    const lang = localStorage.getItem("brgy_lang") || "en";
    document.documentElement.lang = lang;
  }, []);

  return null;
}
