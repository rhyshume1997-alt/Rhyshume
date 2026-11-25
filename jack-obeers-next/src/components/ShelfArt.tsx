import { Glass } from "@/components/Glass";

type Kind = "beer" | "cider" | "wine" | "events" | "subs";

const BEER = { colour: "#E0A030", head: "#FFF3D6", haze: false, foam: true };
const CIDER = { colour: "#EBC85A", head: "#FFF8E0", haze: false, foam: false };
const WINE = { colour: "#8A1F33", head: "#fff", haze: false, shape: "wine" as const, foam: false };

/**
 * The little cartoon on each shelf item. Beer: an empty glass that fills while the amber bottle tips over it and
 * Jack pops up above, stamping. Hover, keyboard focus and an opened shelf all trigger it. Jack stands on the far side and
 * pushes the glass, which leans toward the cursor. Reduced motion shows it finished. The other items are simple drawings; the cider glass fills the same way.
 * Everything here is decoration, so it is hidden from screen readers. The label under it carries the meaning.
 */
export function ShelfArt({ kind }: { kind: Kind }) {
  if (kind === "beer") {
    return (
      <span className="art art-beer" aria-hidden="true">
        <span className="sh-push" />
        <Glass spec={BEER} className="sh-glass" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sh-bottle" src="/media/bottle-amber.webp" alt="" width={225} height={720} />
      </span>
    );
  }
  if (kind === "cider") {
    return (
      <span className="art art-cider" aria-hidden="true">
        <span className="sh-push" />
        <Glass spec={CIDER} className="sh-glass" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sh-bottle" src="/media/cider-bottle.webp" alt="" width={144} height={520} />
      </span>
    );
  }
  if (kind === "wine") {
    return (
      <span className="art art-wine" aria-hidden="true">
        <span className="sh-push" />
        <Glass spec={WINE} className="sh-glass" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sh-bottle" src="/media/wine-bottle.webp" alt="" width={133} height={520} />
      </span>
    );
  }
  if (kind === "events") {
    return (
      <span className="art art-tickets" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="sh-photo" src="/media/tickets.webp" alt="" width={520} height={350} />
      </span>
    );
  }
  return (
    <span className="art art-subs" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="sh-photo" src="/media/card.webp" alt="" width={520} height={343} />
    </span>
  );
}
