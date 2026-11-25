"use client";

import { useEffect, useRef } from "react";

/**
 * The one beer pouring interaction, inside the Beer tile: real footage from the shop of a bottle tipping in from the top of the frame into a pint.
 * It plays while the Beer shelf is hovered, focused or open, and sits still on a poster frame otherwise and under reduced
 * motion. It never delays the product panel: it is a separate element that only reacts. Decoration, so hidden from screen readers.
 */
export function PourWindow({ playing }: { playing: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const loaded = useRef(false);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!playing || reduced) { v.pause(); return; }
    if (!loaded.current) { v.src = "/media/videos/pour-wide.mp4"; loaded.current = true; }
    v.play().catch(() => {});
  }, [playing]);
  return (
    <span className={"pour-window" + (playing ? " is-playing" : "")} aria-hidden="true">
      <video ref={ref} muted loop playsInline preload="none" poster="/media/posters/pour-wide.jpg" tabIndex={-1} />
    </span>
  );
}
