"use client";

import { useEffect, useState } from "react";

/** A guard for one action when Shopify is not sharing stock. It is not a stock claim and is never shown as one. */
export const NO_STOCK_GUARD = 99;

declare global {
  interface Window {
    joBasket?: { room: (handle: string, variant?: string) => number | null };
  }
}

/**
 * Quantity selector plus the Add to basket button. The button keeps data-add and carries the chosen quantity in data-q, so the
 * one basket script (src/lib/rev5.ts) adds the whole quantity in a single action and drives the button's state and message.
 * The limit is Shopify's stock for the variant checkout uses minus what is already in the basket; with no verified stock the
 * only limit is NO_STOCK_GUARD per action.
 */
export function AddToBasket({ handle, name, stock, label = "Add to basket", variant }: { handle: string; name: string; stock: number | null; label?: string; variant?: string }) {
  const [qty, setQty] = useState(1);
  const [room, setRoom] = useState<number | null>(stock);
  const [note, setNote] = useState("");

  useEffect(() => {
    const sync = () => setRoom(window.joBasket ? window.joBasket.room(handle, variant) : stock);
    sync();
    document.addEventListener("jo:basket", sync);
    return () => document.removeEventListener("jo:basket", sync);
  }, [handle, stock, variant]);

  const limit = room === null ? NO_STOCK_GUARD : Math.max(1, room);
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
      setNote(room === null ? `Up to ${NO_STOCK_GUARD} at a time.` : `Only ${room} available.`);
      return;
    }
    setNote("");
    setQty(next);
  };

  return (
    <span className="atb">
      <span className="atb-q" role="group" aria-label={`Quantity of ${name}`}>
        <button type="button" className="atb-step" aria-label={`One fewer ${name}`} aria-disabled={atMin} onClick={() => bump(-1)}>
          <span aria-hidden="true">−</span>
        </button>
        <output className="atb-n" aria-label="Quantity">{shown}</output>
        <button type="button" className="atb-step" aria-label={`One more ${name}`} aria-disabled={atMax} onClick={() => bump(1)}>
          <span aria-hidden="true">+</span>
        </button>
      </span>
      <button type="button" className="pg-btn soft atb-add" data-add={handle} data-q={shown} data-v={variant} data-atb="" data-state="idle">
        <i className="atb-led" aria-hidden="true" />
        <span className="atb-t">{label}</span>
        <span className="atb-d" aria-hidden="true">Added to basket</span>
        <span className="vh"> {name}{shown > 1 ? `, quantity ${shown}` : ""}</span>
      </button>
      <span className="atb-msg" role="status" aria-live="polite">{note}</span>
    </span>
  );
}
