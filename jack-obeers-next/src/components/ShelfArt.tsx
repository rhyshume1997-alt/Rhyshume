import { Glass } from "@/components/Glass";
import { BRAND } from "@/lib/brand";

type Kind = "beer" | "cider" | "wine" | "events" | "subs";

const BEER = { colour: "#E0A030", head: "#FFF3D6", haze: false, foam: true };
const CIDER = { colour: "#EBC85A", head: "#FFF8E0", haze: false, foam: false };
const WINE = { colour: "#8A1F33", head: "#fff", haze: false, shape: "wine" as const, foam: false };

/**
 * The little cartoon on each shelf item. Beer: an empty glass that fills while the amber bottle tips over it and
 * Jack pops up above, stamping. Hover, keyboard focus and an opened shelf all trigger it. Reduced motion shows it
 * finished. The other items are simple drawings; the cider glass fills the same way.
 * Everything here is decoration, so it is hidden from screen readers. The label under it carries the meaning.
 */
export function ShelfArt({ kind }: { kind: Kind }) {
  if (kind === "beer") {
    return (
      <span className="art art-beer" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sh-jack" src={BRAND.mascot} alt="" width={64} height={64} />
        <Glass spec={BEER} className="sh-glass" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sh-bottle" src="/media/bottle-amber.webp" alt="" width={225} height={720} />
      </span>
    );
  }
  if (kind === "cider") {
    return (
      <span className="art art-cider" aria-hidden="true">
        <Glass spec={CIDER} className="sh-glass" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sh-bottle" src="/media/cider-bottle.svg" alt="" width={60} height={170} />
      </span>
    );
  }
  if (kind === "wine") {
    return (
      <span className="art art-wine" aria-hidden="true">
        <Glass spec={WINE} className="sh-glass" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sh-bottle" src="/media/wine-bottle.svg" alt="" width={60} height={170} />
      </span>
    );
  }
  if (kind === "events") {
    return (
      <span className="art art-tickets" aria-hidden="true">
        <svg viewBox="0 0 140 110" focusable="false">
          <g transform="rotate(-9 70 55)">
            <path d="M14 26h112v16a8 8 0 0 0 0 16v16H14V58a8 8 0 0 0 0-16z" fill="#E8B23A" stroke="#2a1a10" strokeWidth="3" strokeLinejoin="round" />
            <path d="M92 28v44" stroke="#2a1a10" strokeWidth="2.4" strokeDasharray="5 5" />
            <path d="M52 40l5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="#fff6dd" stroke="#2a1a10" strokeWidth="2" strokeLinejoin="round" />
          </g>
          <g transform="rotate(7 70 60) translate(10 22)">
            <path d="M14 26h112v16a8 8 0 0 0 0 16v16H14V58a8 8 0 0 0 0-16z" fill="#D6455D" stroke="#2a1a10" strokeWidth="3" strokeLinejoin="round" />
            <path d="M92 28v44" stroke="#2a1a10" strokeWidth="2.4" strokeDasharray="5 5" />
          </g>
        </svg>
      </span>
    );
  }
  return (
    <span className="art art-subs" aria-hidden="true">
      <svg viewBox="0 0 140 110" focusable="false">
        <rect x="14" y="20" width="112" height="72" rx="12" fill="#2c5a41" stroke="#2a1a10" strokeWidth="3" />
        <rect x="14" y="38" width="112" height="14" fill="#1b3a2a" />
        <circle cx="42" cy="72" r="11" fill="#F0B653" stroke="#2a1a10" strokeWidth="2.4" />
        <path d="M64 68h42M64 78h28" stroke="#f8f1df" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </span>
  );
}
