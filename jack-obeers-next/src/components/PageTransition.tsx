"use client";

import { useEffect, useRef } from "react";

const KEY = "jo_tr";
const FRAMES = [6, 7, 8, 9].map((n) => `/media/bull/f${n}.webp`);

/**
 * Page changes. When someone follows a link to another page on this site, the green wipe slides in with Jack on its
 * front edge, headbutting the old page out. The new page then opens as the wipe slides away. About 300ms to cover
 * and 250ms to uncover. Reduced motion gets a plain 150ms fade and no character.
 * Hard page loads, so the wipe is carried across with a flag in sessionStorage and a tiny script in the head.
 */
export function PageTransition() {
  const root = useRef<HTMLDivElement>(null);
  const bull = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    FRAMES.forEach((s) => { const i = new Image(); i.src = s; });
    let busy = false;
    let timers: number[] = [];
    const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(fn, ms)); };

    // the new page opens: the wipe is already covering it (set by the head script), so slide it away
    if (document.documentElement.dataset.tr === "1") {
      el.dataset.state = "open";
      later(() => { delete document.documentElement.dataset.tr; el.dataset.state = "idle"; }, reduced ? 170 : 280);
      try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    }

    const onClick = (e: MouseEvent) => {
      if (busy || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.dataset.noTransition !== undefined) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // same page, or a #link on it
      e.preventDefault();
      busy = true;
      el.dataset.state = "cover";
      if (!reduced && bull.current) {
        let f = 0;
        const step = () => { if (bull.current) bull.current.src = FRAMES[Math.min(f, FRAMES.length - 1)]; f++; if (f < FRAMES.length) later(step, 70); };
        step();
      }
      try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
      later(() => location.assign(url.href), reduced ? 150 : 300);
    };
    // if the browser comes back from the back button with the page frozen mid-wipe, clear it
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) { busy = false; el.dataset.state = "idle"; delete document.documentElement.dataset.tr; } };
    document.addEventListener("click", onClick);
    addEventListener("pageshow", onShow);
    return () => { document.removeEventListener("click", onClick); removeEventListener("pageshow", onShow); timers.forEach(clearTimeout); timers = []; };
  }, []);

  return (
    <div ref={root} className="tr" data-state="idle" aria-hidden="true">
      <div className="tr-wipe">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={bull} className="tr-bull" src={FRAMES[0]} alt="" width={482} height={362} />
      </div>
    </div>
  );
}
