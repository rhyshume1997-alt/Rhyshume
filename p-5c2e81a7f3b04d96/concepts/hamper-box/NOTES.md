# The Hamper Box (concept for discussion)

Gifting-led, calm and editorial. Page is index.html + concept.css + concept.js (about 40 KB) plus 5 font files (96 KB). No network requests at runtime. The shop logo is used as supplied from ../../site/assets/media/jack-logo.png.

## Palette (contrast measured, WCAG ratio)
| Hex | Role | Text pairs |
|---|---|---|
| #FAF6EE linen | page | ink 12.7, ink-soft 6.8, gold 5.8, rose 6.3 |
| #F3ECDF paper | ranges, newsletter | ink-soft 6.2, gold 5.3 |
| #E3EADB soft sage | hamper section | ink 11.1, ink-soft 5.9, gold 5.1, rose 5.5 |
| #F6E5DF blush | how it works | ink 11.2, ink-soft 6.0, gold 5.1, rose 5.6 |
| #3A2A22 ink brown | text, buttons, lines | linen on ink 12.7 |
| #66524A | secondary text | see above |
| #7A5C1E gold | small labels, rules, tag outline | see above |
| #8C4553 dusty rose | italic accents, basket badge | white on rose 6.8 |
| #4A6048 deep sage | button hover | linen on sage 6.4 |

## Type
Cormorant Garamond 500/600 and 500 italic (display, SIL OFL 1.1) with Jost 400/500 (body, SIL OFL 1.1). Latin subsets from @fontsource, self-hosted woff2.

## Layout
Editorial: numbered sections (01 to 06) under thin ink rules, asymmetric 7/5 hero, headline offset into a second column, generous whitespace, three equal ranges separated by hairlines. Delicate single-weight SVG line drawings (bottles, cheese, hamper, basket, van, padlock, gift).

## Signature interaction: Build a hamper
Real object: a gift hamper and its gift tag. Six sample items from the product data (3 beers, 1 cider, 2 wines). Click, tap, Enter or Space puts an item in the SVG box (the drawing slides from its list thumbnail into its slot with a 300 ms transform and fade; press again to lift it out). Box contents, Sample total, and a gift tag with live preview (max 60 characters, written with textContent so markup is shown, not run). "Add hamper to basket" raises the header basket count by one. Reduced motion places items instantly.

## Why it suits this business
- Gifting-led: hampers are one of the shop's three equal ranges, and this makes them tangible.
- Serif and linen feel homey and welcoming without being childish; adult audience.
- Line drawings avoid cartoon style and avoid needing product photography.
- Calm motion fits a shop that sells "no fuss".
- The bull logo sits on a plain light header, shown as supplied.

## Trade-offs
Best at: gifts, warmth, premium feel, readable copy. Worst at: the New York deli feel and a beer-forward, lively look; the hamper section is long on mobile (box above, list below, no sticky summary).

## Assumed or missing
- No deli products exist in the sample data, so the six items are drinks only; the page says so. Deli items should join once supplied.
- Sample prices are the products.json "from" prices; box, wrapping and delivery costs are "to be confirmed".
- Nav links point at on-page sections as stand-ins; Members, About and Shipping pages are not built. Social links are href="#" placeholders.
- Hamper item movement uses 300 ms; reveals 700 ms once. Flavour numbers shown are the sample data. Strength and allergens are "to be confirmed".
