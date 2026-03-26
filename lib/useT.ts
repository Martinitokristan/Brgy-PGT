"use client";

import { useState, useEffect, useCallback } from "react";
import { type Lang, getT } from "./translations";

/**
 * Returns a translation function `t(key)` that reads from the current language stored in localStorage.
 * Automatically re-renders when language changes (via a custom storage event).
 */
export function useT() {
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const stored = (localStorage.getItem("brgy_lang") || "en") as Lang;
    setLang(stored);

    function onStorageChange(e: StorageEvent) {
      if (e.key === "brgy_lang" && e.newValue) {
        setLang(e.newValue as Lang);
      }
    }

    // Listen for cross-tab changes
    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, []);

  // Memoized translation function
  const t = useCallback((key: string) => getT(lang)(key), [lang]);

  return { t, lang };
}
