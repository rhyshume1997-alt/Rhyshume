import { useId } from "react";
import type { GlassSpec } from "@/lib/catalogue";

/** A pint glass filled to the brim with a small foam head. The colour comes from the style (a design choice). */
export function Glass({ spec, className }: { spec: GlassSpec; className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 150" className={className} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={`c${id}`}>
          <path d="M16 16 H84 L76 138 Q75 143 70 143 H30 Q25 143 24 138 Z" />
        </clipPath>
        <radialGradient id={`h${id}`} cx="40%" cy="40%" r="70%">
          <stop offset="0" stopColor="#fff" stopOpacity=".42" />
          <stop offset="1" stopColor="#fff" stopOpacity=".12" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#c${id})`}>
        <rect x="0" y="14" width="100" height="132" fill={spec.colour} />
        {spec.haze && <rect x="0" y="14" width="100" height="132" fill={`url(#h${id})`} />}
        <rect x="24" y="14" width="6" height="128" fill="#fff" opacity=".14" />
      </g>
      {/* the head sits on top of the liquid, slightly above the rim */}
      <path d="M15 17 Q14 7 26 8 Q32 1 44 5 Q54 -1 66 5 Q79 3 80 10 Q86 14 85 17 Z" fill={spec.head} stroke="#2a1a10" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 16 H86 L77 140 Q76 147 70 147 H30 Q24 147 23 140 Z" fill="none" stroke="#2a1a10" strokeWidth="2.6" strokeLinejoin="round" />
    </svg>
  );
}
