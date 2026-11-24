# The Deli Counter (concept for Jack O'Beers & Deli)

Files: index.html, concept.css, concept.js, fonts/ (no frameworks, no network requests at runtime; ~70 KB fonts, page code well under 100 KB excluding the shared logo).

## Palette (contrast measured, WCAG)
| Hex | Role | Key pairs |
|---|---|---|
| #F4EBD6 butcher-paper cream | page | ink 14.3:1, muted 6.9:1, red 5.5:1 |
| #FBF6E8 tile white | cards, header | ink 15.7:1, muted 7.6:1, red 6.1:1 |
| #231B16 ink | text, outlines, hard shadows | |
| #B02A1F deli red | accents, awning, newsletter band | white on red 6.6:1, #FFE29A on red 5.2:1 |
| #1D4A38 bottle green | beer counter, shelf, hours board | cream on green 9.3:1, mustard on green 5.6:1 |
| #F0B83A mustard | stickers, highlights | ink on mustard 9.4:1 |
| #5A4D42 muted text | small print | see above |
| #FF6B57 on #15110E | "Now serving" numerals | 6.7:1 |

## Type
Alfa Slab One (headings, uppercase, 0.08em tracking) and DM Sans 400/500/700 (body). Both SIL OFL 1.1, from @fontsource, latin subset woff2.

## Layout idea
A deli window: striped awning, tile-wall hero, three equal menu-board counters (beer, deli, hampers), price-tag product cards on a green tile wall, order-of-service ticket stubs, a receipt-style address card and a hours board. Hard offset flat shadows, no glows or blur.

## Signature interaction: the ticket dispenser
Real object: the "take a number" ticket dispenser at a deli counter. Press, tap, Enter or Space on the button: a ticket slides out of the slot, tears, drops in the tray (last three kept), "Now serving" counts up to your number, the ticket names a counter (Beer, Deli or Gift hampers, rotating) and the page scrolls to that section, flags it "Now serving here" and moves focus to its heading. A screen-reader status line announces it. Reduced motion: no animation, instant ticket, instant jump. Numbers are a visual only, never real queue data.

## Why it suits Jack O'Beers (one line each)
- Deli palette and slab type: delivers the New York deli feel the client asked for with warm, homely colours.
- Equal counters: gives beer, deli and hampers identical weight.
- Ticket dispenser: friendly, curious, and it genuinely helps visitors pick a range.
- Price tags: a natural frame for sample product facts, flavour dots and "from" prices.
- Chatty short copy: sounds like the person behind the counter.

## Trade-offs
Best at: personality, warmth, memorability, clear equal-weight ranges, strong contrast.
Worst at: heavy, loud type is less premium or "craft cellar"; many outlined shapes can feel busy; one column of cards on phones makes a long page; the dispenser is a novelty that needs a real product page behind it.

## Missing or assumed
- Hero has no photography; the bull logo is used as supplied (header only) and no temporary imagery is shown. Product bottles are my own SVGs.
- Nav links jump to on-page sections (no real pages yet). "Members" jumps to the newsletter; members area is marked to be confirmed.
- Tuesday hours, off-sales licence, deli range, hamper contents, keg/keezer rental, prices, ABV, allergens and social links are labelled placeholders. Sample products are labelled "Sample". Newsletter and basket are demonstrations; nothing is sent.
- The "Concept for discussion" label is fixed bottom-left and can sit over a little content on phones.
