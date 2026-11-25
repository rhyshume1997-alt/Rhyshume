"use client";

import { useMemo, useState } from "react";
import { Glass } from "@/components/Glass";
import type { GlassSpec, Profile } from "@/lib/catalogue";

export type Card = {
  handle: string;
  name: string;
  brewery: string;
  abv: number | null;
  style: string;
  styles: string[];
  price: number;
  available: boolean;
  buy: string | null;
  glass: GlassSpec;
  profile: Profile | null;
  sample: boolean;
};

/** The whole range on one screen. The chips filter in place, no page reload. Each card goes to Shopify checkout in one click. */
export function ProductGrid({ cards, chips, checkoutOn, noun }: { cards: Card[]; chips: string[]; checkoutOn: boolean; noun: string }) {
  const [active, setActive] = useState<string>("All");
  const [open, setOpen] = useState<string | null>(null);
  const shown = useMemo(
    () => (active === "All" ? cards : cards.filter((c) => c.styles.some((s) => s.toLowerCase() === active.toLowerCase()))),
    [cards, active],
  );
  const all = ["All", ...chips];
  return (
    <div className="pg">
      {chips.length > 0 && (
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
            <li key={c.handle} className={"pg-card" + (isOpen ? " open" : "")}>
              <div className="pg-top">
                <Glass spec={c.glass} className="pg-glass" />
                <div className="pg-text">
                  <h2 className="pg-name">{c.name}</h2>
                  {c.brewery && <p className="pg-brew">{c.brewery}</p>}
                  <p className="pg-meta">
                    {c.abv !== null && <span>{c.abv}% ABV</span>}
                    {c.style && <span>{c.style}</span>}
                  </p>
                </div>
              </div>
              <div className="pg-buy">
                <span className="pg-price">£{c.price.toFixed(2)}{c.sample && <small> sample</small>}</span>
                {!c.available ? (
                  <button type="button" className="btn sm" disabled>Sold out</button>
                ) : checkoutOn && c.buy ? (
                  <a className="btn sm" href={c.buy}>Buy now<span className="vh"> {c.name}</span></a>
                ) : (
                  <button type="button" className="btn sm" disabled>Checkout opens soon</button>
                )}
              </div>
              {c.profile && (
                <>
                  <button type="button" className="pg-more" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : c.handle)}>
                    {isOpen ? "Less" : "More"}<span className="vh"> about {c.name}</span>
                  </button>
                  {isOpen && (
                    <div className="pg-detail">
                      <p>{c.profile.blurb}</p>
                      <ul className="pg-flav" aria-label="Flavours">
                        {c.profile.flavour.map((f) => <li key={f}>{f}</li>)}
                      </ul>
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
