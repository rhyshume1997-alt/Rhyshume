"use client";

import { useEffect, useRef, useState } from "react";

const FRAMES = Array.from({ length: 9 }, (_, i) => `/media/bull/f${i + 1}.webp`);
const LYING = 0, STANDING = 4, LAST = 8;

/**
 * The mascot in the opening medallion. Frame 1 is Jack lying down, frames 1 to 5 are him getting up,
 * frames 6 to 9 are the headbutt. The rise plays once when the page opens. The headbutt plays only
 * when someone presses "Come in". Reduced motion: Jack just stands there.
 * These nine frames are an AI-generated concept from the animation pack, not the final rig.
 */
export function BullFrames() {
  const [i, setI] = useState(LYING);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    FRAMES.forEach((s) => { const im = new Image(); im.src = s; });
    const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
    const play = (from: number, to: number, gap: number) => {
      for (let f = from; f <= to; f++) later(() => setI(f), (f - from) * gap);
    };
    if (reduced) { setI(STANDING); return; }
    later(() => play(LYING, STANDING, 130), 900);
    const go = document.querySelector<HTMLElement>("[data-come-in]");
    const onGo = () => { play(STANDING + 1, LAST, 110); later(() => setI(STANDING), 4 * 110 + 450); };
    go?.addEventListener("click", onGo);
    return () => { timers.current.forEach(clearTimeout); go?.removeEventListener("click", onGo); };
  }, []);

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={FRAMES[i]} alt="" width={482} height={362} decoding="async" />;
}
