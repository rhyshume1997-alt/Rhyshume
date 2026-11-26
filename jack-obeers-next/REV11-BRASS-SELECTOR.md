# Rev 11: Brass Selector buttons and quantity controls

One family: mahogany, brushed brass, warm cream, a restrained amber. Source Serif 4 throughout. Hard offset edge for depth (no blur, no glow beyond a small indicator light).

- Shop drinks: brushed brass, dark lettering, inset edge. Find us: walnut with a fine brass outline (destination `#find` unchanged).
- Read the reviews: cream with an engraved brass keyline. Leave a review: flat brass. Both keep their external links (`target=_blank`, `rel=noopener`).
- Add to basket: mahogany key, brass edge, indicator light. Press moves in 2px in 140 ms, ease-out. Hover finish change only for `(hover: hover) and (pointer: fine)`. Reduced motion keeps the light and label change and drops the movement.
- Buy now, Sold out and the fixed Call/Directions bar are untouched.

## Quantity and the basket

`src/components/AddToBasket.tsx` renders `[ - ] n [ + ] [ Add to basket ]` at every Add site. The button keeps `data-add` and carries the quantity in `data-q`; `add(h, q)` in `src/lib/rev5.ts` adds the whole quantity in one call.

- Minimum 1. Limit = Shopify stock for the variant checkout uses (the first on sale) minus what is already in the basket. Pressing + at the limit says "Only N available."
- With no stock figure from Shopify there is no stock claim. The only limit is 99 per action (`NO_STOCK_GUARD`), a UI guard, never shown as stock.
- States: idle, busy (one frame, blocks double presses), added (only after the basket line is re-read and matches), error (quantity kept, message in a `role=status` region).
- The basket is browser `localStorage` (`jo5_cart`). "Confirmed" means the in-memory basket line changed and was rendered; there is no server round trip to confirm.
- Pricing, minimum order, delivery, checkout and the age declaration are unchanged.

## Known limits

- Stock is only known where the Shopify token allows "Read inventory". Without it, the stock cap cannot apply; checkout still decides.
- Stock is read when the page is built or revalidated, so another customer can still buy the last item first.
- Desktop two-column cards: the wider control makes some long beer names wrap to two lines.
- Buy now (checkout is off in previews) was not compared next to the new button in a browser.
