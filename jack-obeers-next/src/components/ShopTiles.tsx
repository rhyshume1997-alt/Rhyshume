"use client";

import { useEffect, useRef, useState } from "react";
import { PourWindow } from "@/components/PourWindow";
import { KegBlurb } from "@/components/KegBlurb";
import { ShelfArt } from "@/components/ShelfArt";
import { ProductGrid } from "@/components/ProductGrid";
import type { Card } from "@/lib/cards";

/** Remember which half of the item the pointer is on, so the glass can lean toward it and Jack can push from the other side. */
const trackSide = (e: React.PointerEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.dataset.side = e.clientX < r.left + r.width / 2 ? "l" : "r";
};

type Range = { cards: Card[]; chips: string[] };
type Key = "beer" | "cider" | "wine";

const DRINKS: { key: Key; title: string; unit: string; blurb: string; href: string }[] = [
  { key: "beer", title: "Beer", unit: "beers", blurb: "The whole range on one screen", href: "/beers" },
  { key: "cider", title: "Hard Cider", unit: "ciders", blurb: "Dry through to fruity", href: "/ciders" },
  { key: "wine", title: "Wine", unit: "wines", blurb: "Red, white and fizz", href: "/wines" },
];

/**
 * Beer, Cider and Wine open their range in a panel under the tile row, on the same page. Event Tickets and
 * Subscription Services are links. The pages /beers, /ciders and /wines still work as direct links.
 */
export function ShopTiles({ ranges, events, subs, checkoutOn, fancy = false }: { ranges: Record<Key, Range>; events: number; subs: number; checkoutOn: boolean; fancy?: boolean }) {
  const [open, setOpen] = useState<Key | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [hoverBeer, setHoverBeer] = useState(false);
  const choose = (k: Key) => setOpen(open === k ? null : k);
  // The range appears and scrolls into view straight away: no waiting for the pour. The pour is a separate element.
  useEffect(() => {
    if (!open) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    panel.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, [open]);
  const count = (n: number, one: string, many: string) => (n > 0 ? `${n} ${n === 1 ? one : many}` : "");
  const cur = DRINKS.find((d) => d.key === open) || null;
  return (
    <section className="tiles-sec cream" id="shelf" aria-labelledby="tl-h">
      <div className="wrap">
        {fancy && <i className="bh-line" aria-hidden="true" />}
        <p className="mono">Shop</p>
        <h2 className="h2" id="tl-h">Pick a <em>shelf.</em></h2>
        <p className="shelf-hint">Click your selection.</p>
        <div className="bar"><ul className="shelf-row">
          {DRINKS.map((d) => {
            const n = ranges[d.key].cards.length;
            return (
              <li key={d.key}>
                <button type="button" className="sh-item" data-kind={d.key} aria-expanded={open === d.key} aria-controls="range-panel" onPointerMove={trackSide} onPointerEnter={(e) => { trackSide(e); if (d.key === "beer") setHoverBeer(true); }} onPointerLeave={() => { if (d.key === "beer") setHoverBeer(false); }} onFocus={() => { if (d.key === "beer") setHoverBeer(true); }} onBlur={() => { if (d.key === "beer") setHoverBeer(false); }} onClick={() => choose(d.key)}>
                  {fancy && d.key === "beer" && <PourWindow playing={hoverBeer || open === "beer"} />}
                  <ShelfArt kind={d.key} />
                  <span className="sh-label"><b>{d.title}</b><span className="tile-n">{count(n, d.unit.replace(/s$/, ""), d.unit)}</span></span>
                </button>
              </li>
            );
          })}
          <li>
            <a className="sh-item" data-kind="events" href="/events"><ShelfArt kind="events" /><span className="sh-label"><b>Event Tickets</b><span className="tile-n">{count(events, "event", "events")}</span></span></a>
          </li>
          <li>
            <a className="sh-item" data-kind="subs" href="/draught-club"><ShelfArt kind="subs" /><span className="sh-label"><b>Subscription Services</b><span className="tile-n">{count(subs, "plan", "plans")}</span></span></a>
          </li>
        </ul></div>
        <div ref={panel} id="range-panel" className="range-panel" role="region" aria-label={cur ? `${cur.title} range` : "Range"} hidden={!cur}>
          {cur && (
            <>
              <div className="range-head">
                <h3 className="h3">{cur.title}</h3>
                <a className="range-all" href={cur.href}>Open as its own page</a>
                <button type="button" className="range-close" onClick={() => setOpen(null)}>Close</button>
              </div>
              <ProductGrid
                key={cur.key}
                cards={ranges[cur.key].cards}
                chips={ranges[cur.key].chips}
                checkoutOn={checkoutOn}
                noun={cur.unit}
                intro={cur.key === "beer" ? <KegBlurb /> : undefined}
                segmented={cur.key === "beer"}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
