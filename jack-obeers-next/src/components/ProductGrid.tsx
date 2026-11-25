"use client";

import { useMemo, useState } from "react";
import { Glass } from "@/components/Glass";
import { BRAND } from "@/lib/brand";
import type { Card } from "@/lib/cards";

/** The whole range on one screen. The chips filter in place, no page reload. Each card goes to Shopify checkout in one click. */
export function ProductGrid({ cards, chips, checkoutOn, noun, intro }: { cards: Card[]; chips: string[]; checkoutOn: boolean; noun: string; intro?: React.ReactNode }) {
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
      {chips.length > 0 && (
        <div className="pg-chips" role="group" aria-label={`Filter the ${noun} by style`}>
          {all.map((c) => (
            <button key={c} type="button" className="pg-chip" aria-pressed={active === c} onClick={() => { setActive(c); setOpen(null); }}>
              {c}
            </button>
          ))}
        </div>
      )}
      {!checkoutOn && <p className="note-s">Online checkout opens soon. You can add things to your basket now.</p>}
      <p className="pg-count" role="status">{shown.length} {shown.length === 1 ? noun.replace(/s$/, "") : noun}{active !== "All" ? `, ${active}` : ""}</p>
      <ul className="pg-grid">
        {shown.map((c) => {
          const isOpen = open === c.handle;
          return (
            <li
              key={c.handle}
              data-cat={c.category} className={"pg-card" + (isOpen ? " open" : "") + (tapped === c.handle ? " is-filled" : "")}
              onPointerUp={(e) => {
                // touch and pen: a tap fills this glass and empties the last one. Mouse uses hover instead.
                if (e.pointerType !== "mouse" && !(e.target as HTMLElement).closest("a,button")) setTapped(tapped === c.handle ? null : c.handle);
              }}
            >
              <div className="pg-top">
                <span className="pg-glassbox">
                  <Glass spec={c.glass} className="pg-glass" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="pg-jack" src={BRAND.mascot} alt="" width={64} height={62} />
                </span>
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
                  <button type="button" className="pg-btn solid" disabled>Sold out</button>
                ) : (
                  <span className="pg-btns">
                    <button type="button" className="pg-btn soft" data-add={c.handle}>Add to basket<span className="vh"> {c.name}</span></button>
                    {checkoutOn && c.buy ? (
                      <a className="pg-btn solid" href={c.buy}>Buy now<span className="vh"> {c.name}</span></a>
                    ) : (
                      <button type="button" className="pg-btn solid" disabled>Buy now</button>
                    )}
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
                          <b>Goes with</b> {c.pairing.join(", ")}
                          {!c.pairingConfirmed && <span className="pg-sugg">suggestion</span>}
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
