"use client";

import { useEffect, useRef } from "react";
import type { Loop } from "@/lib/media";

/**
 * A silent looping video. Wide file on desktop, tall file on a phone. It loads when it is near the screen and
 * pauses when it is off screen. With reduced motion, or with no file yet, only the poster picture shows.
 * It is decoration, so it is hidden from screen readers.
 */
export function BgVideo({ loop, className }: { loop: Loop; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = matchMedia("(max-width: 832px)");
    const pick = () => (narrow.matches ? loop.tall || loop.wide : loop.wide || loop.tall);
    const setPoster = () => { v.poster = (narrow.matches && loop.posterTall) || loop.posterWide; };
    setPoster();
    if (reduced) return;
    let visible = false;
    const start = () => {
      const s = pick();
      if (!s) return;
      if (v.getAttribute("src") !== s) { v.setAttribute("src", s); v.load(); }
      v.play().catch(() => {});
    };
    const io = new IntersectionObserver(
      (es) => {
        visible = es[0].isIntersecting;
        if (visible) start(); else v.pause();
      },
      { rootMargin: "200px" },
    );
    io.observe(v);
    const onChange = () => { setPoster(); v.removeAttribute("src"); if (visible) start(); };
    narrow.addEventListener("change", onChange);
    return () => { io.disconnect(); narrow.removeEventListener("change", onChange); };
  }, [loop]);
  return <video ref={ref} className={className} muted loop playsInline preload="none" poster={loop.posterWide} aria-hidden="true" tabIndex={-1} />;
}
