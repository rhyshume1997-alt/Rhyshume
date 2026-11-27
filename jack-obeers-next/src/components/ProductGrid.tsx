"use client";

import { useMemo, useState } from "react";
import { FindABeer } from "@/components/FindABeer";
import { Glass } from "@/components/Glass";
import type { Card } from "@/lib/cards";
import { AddToBasket } from "@/components/AddToBasket";

/** The whole range on one screen. The chips filter in place, no page reload. Each card goes to Shopify checkout in one click. */
/** The styles in the segmented filter on the beer range. Cider and wine are their own ranges, so those two are links. */
const SEGMENT_STYLES = ["Lager", "Pale Ale", "IPA", "Stout", "Sour"];

export function ProductGrid({ cards, chips, checkoutOn, noun, intro, segmented = false }: { cards: Card[]; chips: string[]; checkoutOn: boolean; noun: string; intro?: React.ReactNode; segmented?: boolean }) {
  const [active, setActive] = useState<string>("All");
  const [open, setOpen] = useState<string | null>(null);
  const [tapped, setTapped] = useState<string | null>(null);
  const shown = useMemo(
    () => (active === "All" ? cards : cards.filter((c) => c.styles.some((s) => s.toLowerCase() === active.toLowerCase()))),
    [cards, active],
  );
  const all = ["All", ...chips];
  return (
    <div className="pg">
      {intro}
      {segmented && <FindABeer cards={cards} />}
      {segmented && (
        <div className="seg" role="group" aria-label={`Filter the ${noun} by style`}>
          {["All", ...SEGMENT_STYLES.filter((s) => chips.some((c) => c.toLowerCase() === s.toLowerCase()))].map((c) => (
            <button key={c} type="button" className="seg-btn" aria-pressed={active === c} onClick={() => { setActive(c); setOpen(null); }}>
              {c}
            </button>
          ))}
          <a className="seg-btn seg-link" href="/ciders">Cider</a>
          <a className="seg-btn seg-link" href="/wines">Wine</a>
        </div>
      )}
      {!segmented && chips.length > 0 && (
        <div className="pg-chips" role="group" aria-label={`Filter the ${noun} by style`}>
          {all.map((c) => (
            <button key={c} type="button" className="pg-chip" aria-pressed={active === c} onClick={() => { setActive(c); setOpen(null); }}>
              {c}
            </button>
          ))}
        </div>
      )}
      <p className="pg-count" role="status">{shown.length} {shown.length === 1 ? noun.replace(/s$/, "") : noun}{active !== "All" ? `, ${active}` : ""}</p>
      <ul className="pg-grid">
        {shown.map((c) => {
          const isOpen = open === c.handle;
          return (
            <li
              key={c.handle}
              data-cat={c.category} data-side="r" onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.dataset.side = e.clientX < r.left + r.width / 2 ? "l" : "r"; }} className={"pg-card" + (isOpen ? " open" : "") + (tapped === c.handle ? " is-filled" : "")}
              onPointerUp={(e) => {
                // touch and pen: a tap fills this glass and empties the last one. Mouse uses hover instead.
                if (e.pointerType !== "mouse" && !(e.target as HTMLElement).closest("a,button")) setTapped(tapped === c.handle ? null : c.handle);
              }}
            >
              <div className="pg-top">
                <span className="pg-glassbox">
                  <span className="pg-push" />
                  <Glass spec={c.glass} className="pg-glass" />
                </span>
                <div className="pg-text">
                  <h2 className="pg-name"><a href={`/product/${c.handle}`}>{c.name}</a></h2>
                  {c.brewery && <p className="pg-brew">{c.brewery}</p>}
                  <p className="pg-meta">
                    {c.abv !== null && <span>{c.abv}% ABV</span>}
                    {c.style && <span>{c.style}</span>}
                  </p>
                </div>
              </div>
              <div className="pg-buy">
                <span className="pg-price">£{c.price.toFixed(2)}{c.low !== null && <span className="pg-low">Only {c.low} left</span>}</span>
                {!c.available ? (
                  <button type="button" className="pg-btn solid" disabled>Sold out</button>
                ) : (
                  <span className="pg-btns">
                    <AddToBasket handle={c.handle} name={c.name} stock={c.stock} sizes={c.sizes} />
                    {checkoutOn && c.buy ? (
                      <button type="button" className="pg-btn solid" data-buy={c.handle}>Buy now<span className="vh"> {c.name}</span></button>
                    ) : null}
                  </span>
                )}
              </div>
              {c.profile && (
                <>
                  {!isOpen && (
                    <ul className="pg-flav pg-flav-mini" aria-label="Flavours">
                      {c.profile.flavour.slice(0, 3).map((f) => <li key={f}>{f}</li>)}
                    </ul>
                  )}
                  <button type="button" className="pg-more" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.handle)}>
                    {isOpen ? "Hide flavour profile" : "See flavour profile"}<span className="vh"> for {c.name}</span>
                  </button>
                  {isOpen && (
                    <div className="pg-detail">
                      <p>{c.profile.blurb}</p>
                      <ul className="pg-flav" aria-label="Flavours">
                        {c.profile.flavour.map((f) => <li key={f}>{f}</li>)}
                      </ul>
                      {c.pairing.length > 0 && (
                        <p className="pg-goes">
                          <b>Suggested with</b> {c.pairing.join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
      <p className="note-s">18+ only, please drink responsibly. Photo ID may be asked for when you collect or take delivery.</p>
    </div>
  );
}
