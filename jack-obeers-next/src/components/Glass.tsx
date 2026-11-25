import { useId } from "react";
import type { GlassSpec } from "@/lib/catalogue";

/**
 * A pint glass. The liquid and the head are separate pieces so CSS can fill the glass: empty by default,
 * filled to the brim with a small foam head on hover, tap or focus, and always filled under reduced motion.
 * The colour comes from the style (a design choice).
 */
export function Glass({ spec, className }: { spec: GlassSpec; className?: string }) {
  const id = useId().replace(/:/g, "");
  if (spec.shape === "wine") {
    return (
      <svg viewBox="0 0 100 150" className={className} aria-hidden="true" focusable="false">
        <defs>
          <clipPath id={`c${id}`}>
            <path d="M24 10H76C78 42 72 68 50 74C28 68 22 42 24 10Z" />
          </clipPath>
        </defs>
        <path d="M24 10H76C78 42 72 68 50 74C28 68 22 42 24 10Z" fill="#fff" fillOpacity=".28" />
        <g clipPath={`url(#c${id})`}>
          <g className="liq">
            <rect x="0" y="34" width="100" height="44" fill={spec.colour} fillOpacity=".92" />
            <rect x="30" y="34" width="5" height="40" fill="#fff" opacity=".22" />
          </g>
        </g>
        <path d="M50 74V128" stroke="#2a1a10" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M30 140Q50 126 70 140" fill="#fff" fillOpacity=".28" stroke="#2a1a10" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M24 10H76C78 42 72 68 50 74C28 68 22 42 24 10Z" fill="none" stroke="#2a1a10" strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M31 16c0 16 3 30 10 40" fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
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
        <g className="liq">
          <rect x="0" y="14" width="100" height="132" fill={spec.colour} />
          {spec.haze && <rect x="0" y="14" width="100" height="132" fill={`url(#h${id})`} />}
          <rect x="24" y="14" width="6" height="128" fill="#fff" opacity=".14" />
        </g>
      </g>
      {spec.foam !== false && <path className="foam" d="M15 17 Q14 7 26 8 Q32 1 44 5 Q54 -1 66 5 Q79 3 80 10 Q86 14 85 17 Z" fill={spec.head} stroke="#2a1a10" strokeWidth="1.6" strokeLinejoin="round" />}
      <path d="M14 16 H86 L77 140 Q76 147 70 147 H30 Q24 147 23 140 Z" fill="none" stroke="#2a1a10" strokeWidth="2.6" strokeLinejoin="round" />
    </svg>
  );
}
