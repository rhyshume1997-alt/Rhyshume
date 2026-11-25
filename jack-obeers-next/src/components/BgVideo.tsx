"use client";

import { useEffect, useRef } from "react";
import type { Loop } from "@/lib/media";

/**
 * A silent looping video. Wide file on desktop, tall file on a phone. It loads when it is near the screen and
 * pauses when it is off screen. With reduced motion, or with no file yet, only the poster picture shows.
 * It is decoration, so it is hidden from screen readers.
 */
export function BgVideo({ loop, className, priority = false, afterInput = false }: { loop: Loop; className?: string; priority?: boolean; afterInput?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = matchMedia("(max-width: 832px)");
    const pick = () => (narrow.matches ? loop.tall || loop.wide : loop.wide || loop.tall);
    const setPoster = () => { v.poster = (narrow.matches && loop.posterTall) || loop.posterWide; };
    // Posters below the first screen load only when they are about to be seen.
    let posterSet = priority;
    const showPoster = () => { if (!posterSet) { posterSet = true; setPoster(); } };
    if (reduced) {
      const io0 = new IntersectionObserver((es) => { if (es[0].isIntersecting) { showPoster(); io0.disconnect(); } }, { rootMargin: "300px" });
      io0.observe(v);
      return () => io0.disconnect();
    }
    // Save-data or a slow connection: leave the poster picture on, so the page stays light.
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn && (conn.saveData || /(^|-)(2g|3g)$/.test(conn.effectiveType || ""))) {
      const io1 = new IntersectionObserver((es) => { if (es[0].isIntersecting) { showPoster(); io1.disconnect(); } }, { rootMargin: "300px" });
      io1.observe(v);
      return () => io1.disconnect();
    }
    let visible = false;
    let ready = false;
    // Video waits until the page has loaded, so the poster and the words paint first (this keeps the main picture fast).
    const go = () => window.setTimeout(() => { ready = true; if (visible) start(); }, 800);
    // afterInput: a decorative loop low on the page waits until the visitor scrolls or taps, so it never competes with the first screen.
    const arm = () => (document.readyState === "complete" ? go() : window.addEventListener("load", go, { once: true }));
    if (afterInput) {
      const once = () => { ["scroll", "pointerdown", "keydown"].forEach((t) => window.removeEventListener(t, once)); arm(); };
      ["scroll", "pointerdown", "keydown"].forEach((t) => window.addEventListener(t, once, { passive: true, once: true }));
    } else arm();
    const start = () => {
      if (!ready) return;
      const s = pick();
      if (!s) return;
      if (v.getAttribute("src") !== s) { v.setAttribute("src", s); v.load(); }
      v.play().catch(() => {});
    };
    const io = new IntersectionObserver(
      (es) => {
        visible = es[0].isIntersecting;
        if (visible) { showPoster(); start(); } else v.pause();
      },
      { rootMargin: "200px" },
    );
    io.observe(v);
    const onChange = () => { if (!priority) setPoster(); v.removeAttribute("src"); if (visible) start(); };
    narrow.addEventListener("change", onChange);
    return () => { io.disconnect(); narrow.removeEventListener("change", onChange); };
  }, [loop, priority]);
  const video = <video ref={ref} className={className} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} />;
  if (!priority) return video;
  // The first picture on the page: a real image with the right size for the screen, fetched early, behind the video.
  return (
    <>
      <picture className="bgv-poster">
        {loop.posterTall && <source media="(max-width: 832px)" srcSet={loop.posterTall} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={loop.posterWide} alt="" width={1920} height={1080} fetchPriority="high" decoding="async" />
      </picture>
      {video}
    </>
  );
}
