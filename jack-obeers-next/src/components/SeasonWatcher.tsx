"use client";
import { useEffect } from "react";
import { christmasOn } from "@/lib/season";

/**
 * Keeps <html data-xmas> right while a page stays open: checks every 30 seconds and whenever the tab comes back, so a
 * site left open over midnight on 1 December switches on, and over midnight on 1 January switches off, by itself.
 * A preview override (?xmas=on|off) is left alone. The rule itself lives in lib/season.ts.
 */
export function SeasonWatcher() {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      if (root.dataset.xmasOverride) return;
      const v = christmasOn(Date.now()) ? "on" : "off";
      if (root.dataset.xmas !== v) root.dataset.xmas = v;
    };
    apply();
    const t = setInterval(apply, 30_000);
    document.addEventListener("visibilitychange", apply);
    window.addEventListener("focus", apply);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", apply);
      window.removeEventListener("focus", apply);
    };
  }, []);
  return null;
}
