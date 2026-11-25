"use client";

import { useEffect, useRef } from "react";

/**
 * A video with sound, shown with controls and never autoplaying. The poster picture loads only when the video is about
 * to be seen, so it never competes with the first screen. With no file yet it shows the poster picture instead.
 * Add a short plain-text description in `label` so people who cannot watch still know what it is.
 * width and height are the video's size, so the page does not shift while it loads.
 */
export function Clip({ src, poster, label, className, width, height }: { src: string | null; poster: string; label: string; className?: string; width: number; height: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { v.poster = poster; io.disconnect(); } }, { rootMargin: "300px" });
    io.observe(v);
    return () => io.disconnect();
  }, [poster]);
  if (!src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={className} src={poster} alt={label} width={width} height={height} loading="lazy" decoding="async" />;
  }
  return (
    <video ref={ref} className={className} controls preload="none" playsInline aria-label={label} width={width} height={height}>
      <source src={src} type="video/mp4" />
    </video>
  );
}
