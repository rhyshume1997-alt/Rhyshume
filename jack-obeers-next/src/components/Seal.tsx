import { BRAND } from "@/lib/brand";

/**
 * A round seal: the logo in the middle and a line of words running around it. Words: how the takeaway bottles are filled
 * and how long they keep (both from Michael). No year, no award. Plain SVG text on a circle, so it stays sharp at any size.
 */
export function Seal({ className = "" }: { className?: string }) {
  return (
    <svg className={`seal ${className}`.trim()} viewBox="0 0 160 160" role="img" aria-label="Bottled fresh from keg. Sealed bottles keep up to two weeks.">
      <defs>
        <path id="seal-ring" d="M80 80 m-56 0 a56 56 0 1 1 112 0 a56 56 0 1 1 -112 0" />
      </defs>
      <circle cx="80" cy="80" r="76" fill="#f6ecd2" stroke="#1b1a19" strokeWidth="3" />
      <circle cx="80" cy="80" r="70" fill="none" stroke="#2c4a3b" strokeWidth="1.2" />
      <circle cx="80" cy="80" r="40" fill="#fffaf0" stroke="#1b1a19" strokeWidth="2" />
      <text fontSize="11.5" fontWeight="700" fill="#21140e" letterSpacing=".4">
        <textPath href="#seal-ring" startOffset="0">Bottled fresh from keg · Sealed bottles keep up to two weeks ·</textPath>
      </text>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <image href={BRAND.mascot} x="48" y="48" width="64" height="64" />
    </svg>
  );
}
