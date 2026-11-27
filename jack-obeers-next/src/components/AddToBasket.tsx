"use client";

import { useEffect, useState } from "react";
import { MAX_PER_LINE } from "@/lib/limits";


declare global {
  interface Window {
    joBasket?: { room: (handle: string, variant?: string) => number; info: (handle: string, variant?: string) => { room: number; byStock: boolean } };
  }
}

/**
 * Quantity selector plus the Add to basket button. The button keeps data-add and carries the chosen quantity in data-q, so the
 * one basket script (src/lib/rev5.ts) adds the whole quantity in a single action and drives the button's state and message.
 * The limit is the smaller of Shopify's stock for the variant (when Shopify shares it) and MAX_PER_LINE minus what the basket already has.
 * Missing stock data is never read as unlimited: MAX_PER_LINE always applies (src/lib/limits.ts).
 */
export type Size = { id: string; label: string; price: number; available: boolean };

/**
 * `sizes` is empty for every product today, so nothing about the control changes. When Shopify gives a draught product 500ml and 1 litre
 * variants, a two-button size choice appears first (the same segmented control the beer filters use, prices in the labels), the default
 * is 500ml, and the chosen variant id travels with the basket line in data-v.
 */
export function AddToBasket({ handle, name, stock, label = "Add to basket", variant, sizes = [] }: { handle: string; name: string; stock: number | null; label?: string; variant?: string; sizes?: Size[] }) {
  const firstSize = (sizes.find((x) => x.label === "500ml" && x.available) || sizes.find((x) => x.available) || sizes[0])?.id;
  const [size, setSize] = useState<string | undefined>(firstSize);
  const chosen = sizes.length ? sizes.find((x) => x.id === size) : undefined;
  const variantId = chosen ? chosen.id : variant;
  const [qty, setQty] = useState(1);
  const startRoom = stock === null ? MAX_PER_LINE : Math.min(MAX_PER_LINE, stock);
  const [lim, setLim] = useState<{ room: number; byStock: boolean }>({ room: startRoom, byStock: stock !== null && stock < MAX_PER_LINE });
  const [note, setNote] = useState("");

  useEffect(() => {
    const sync = () => setLim(window.joBasket ? window.joBasket.info(handle, variantId) : { room: startRoom, byStock: stock !== null && stock < MAX_PER_LINE });
    sync();
    document.addEventListener("jo:basket", sync);
    return () => document.removeEventListener("jo:basket", sync);
  }, [handle, stock, variantId, startRoom]);

  const limit = Math.max(1, lim.room);
  const shown = Math.min(qty, limit);
  const atMin = shown <= 1;
  const atMax = shown >= limit;

  useEffect(() => {
    if (qty > limit) setQty(limit);
  }, [qty, limit]);

  const bump = (d: number) => {
    const next = shown + d;
    if (next < 1) return;
    if (next > limit) {
      setNote(lim.byStock ? `Only ${lim.room} available.` : `Up to ${MAX_PER_LINE} of each item per order.`);
      return;
    }
    setNote("");
    setQty(next);
  };

  return (
    <span className={sizes.length > 1 ? "atb atb-sized" : "atb"}>
      {sizes.length > 1 && (
        <span className="seg atb-sizes" role="group" aria-label={`Size of ${name}`}>
          {sizes.map((x) => (
            <button key={x.id} type="button" className="seg-btn" aria-pressed={x.id === variantId} aria-disabled={!x.available} onClick={() => { if (x.available) { setSize(x.id); setNote(""); } }}>
              {x.label} £{x.price.toFixed(2)}{x.available ? "" : ", sold out"}
            </button>
          ))}
        </span>
      )}
      <span className="atb-q" role="group" aria-label={`Quantity of ${name}`}>
        <button type="button" className="atb-step" aria-label={`One fewer ${name}`} aria-disabled={atMin} onClick={() => bump(-1)}>
          <span aria-hidden="true">−</span>
        </button>
        <output className="atb-n" aria-label="Quantity">{shown}</output>
        <button type="button" className="atb-step" aria-label={`One more ${name}`} aria-disabled={atMax} onClick={() => bump(1)}>
          <span aria-hidden="true">+</span>
        </button>
      </span>
      <button type="button" className="pg-btn soft atb-add" data-add={handle} data-q={shown} data-v={variantId} data-atb="" data-state="idle">
        <i className="atb-led" aria-hidden="true" />
        <span className="atb-t">{label}</span>
        <span className="atb-d" aria-hidden="true">Added to basket</span>
        <span className="vh"> {name}{chosen ? `, ${chosen.label}` : ""}{shown > 1 ? `, quantity ${shown}` : ""}</span>
      </button>
      <span className="atb-msg" role="status" aria-live="polite">{note}</span>
    </span>
  );
}
