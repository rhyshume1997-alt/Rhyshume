# Concept: "The Local" (Jack O'Beers & Deli)

Concept for discussion. Open `index.html` through any static server (no network requests at runtime).

## Palette (contrast measured, WCAG ratio)
| Hex | Role | Pairs |
|---|---|---|
| #F6F0DF | Page paper | ink 12.98, muted 6.34, oxblood 9.01, brass 5.30 |
| #FFFBEF | Cards | ink 14.28, muted 6.97, oxblood 9.91 |
| #EFE2B8 | Pinned notices | ink 11.43, oxblood 7.93, muted 5.58 |
| #1D2B22 | Ink (body text) | |
| #4F5A50 | Muted text | |
| #1E3B2C | Forest green (headings, buttons, dark blocks) | cream on forest 10.74 |
| #2A4D3A | Noticeboard | cream 8.31 |
| #7A1E2B | Oxblood (accent, "to be confirmed", stamps) | white on oxblood 9.91 |
| #7D5E10 | Brass (small labels on paper) | 5.30 on paper |
| #D2AE5A | Light brass (on forest, pins, count badge) | on forest 5.79, ink on it 7.0 |

Tartan is a generic stripe band (CSS gradients, header, footer, card top, newsletter edge). It copies no registered tartan.

## Type
Zilla Slab 600/700 (headings, prices) and Source Sans 3 400/600 (body). Both SIL OFL 1.1, from @fontsource, latin subset woff2, about 84 KB in total.

## Layout idea
A ledger and a noticeboard. Hero is a ruled ledger page with a margin line next to a forest-green board with three pinned notices (hours, events, new in). The three ranges are three ruled ledger columns, equal weight. Shelf cards are ledger-style. "From the station to the door" is an abstract SVG route line to a "13 Station Road" enamel sign (no map data, no distances). The Members section is the one dark forest block.

## Signature interaction: Regulars' card
Real object: the regulars' stamp card kept by a shop till. Ten slots; tap or press Enter or Space on the next slot and an ink stamp scales down onto it with a small thunk (240 ms, transform and opacity, ease-out; the card also dips 3 px). When full, "Card full" appears. Only the next slot is in the tab order. Focus moves to the next slot (or Reset) after each stamp. State is in localStorage under `jo_concept_local_card`; Reset clears it. Reduced motion: stamp simply appears, no animation. Labelled on the page: "A design idea for the Members area, not an offer".

## Why it suits this business (one line each)
- Green, cream, oxblood and brass: a shop with pull-tabs and brass taps, warm and grown-up rather than childish.
- Slab serif: sturdy and signwritten, in keeping with a bull mascot and a no-nonsense tagline.
- Ledger layout: honest and plain, and a natural home for "to be confirmed" items.
- Noticeboard: hours, events and new stock are what regulars check first.
- Stamp card: regulars are what a neighbourhood shop is built on, and it makes the Members idea tangible without promising anything.

## Trade-offs
Best at: warmth, trust, clarity, making missing information look intentional, mobile reading.
Worst at: product photography and appetite appeal (no imagery used on purpose); less "New York deli" than a diner-style concept would be; ledger rules and rotated notices need care with long copy.

## Assumed or missing
- Only the supplied logo is used, as is, on cream. No other media; no "Temporary imagery" is shown.
- Products are 8 of the 15 samples, all labelled Sample; hamper prices shown as "to be agreed". Basket is a count only; checkout would be Shopify's.
- Social links, deli range, collection times, shipping rates, rental terms, off-sales details, Tuesday hours: placeholders.
- Basket button has no panel (demonstration count only). Shop submenu links filter the sample shelf.
- No local history, awards or founding dates are claimed.
