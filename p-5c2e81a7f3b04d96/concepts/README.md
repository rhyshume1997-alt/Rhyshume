# Jack O'Beers: five website concepts (private, noindex)

Open `index.html` (the board). Each concept is independent: its own folder with `index.html`, `concept.css`, `concept.js`, fonts (SIL OFL) and `NOTES.md` (palette with contrast ratios, type pairing, layout idea, the signature interaction, trade-offs, and what is assumed or missing).

| Folder | Concept | Signature interaction |
|---|---|---|
| `deli-counter/` | New York deli: red, green, cream, tickets and price tags | Take a number ticket dispenser |
| `tap-room/` | Craft taproom: slate, brass, chalkboard tap list | Pull the tap handle to pour a pint |
| `shop-front/` | Bright illustrated shop front | Real Open/Closed door sign (UK hours); door opens into the shop |
| `hamper-box/` | Calm, gift-led, editorial | Build a hamper and write the gift tag |
| `local-pub/` | Neighbourhood ledger and noticeboard, tartan-style stripes | Regulars' stamp card (design idea for Members) |

`review.html?c=<folder>` shows a concept with a feedback panel down the side (Love it / Not sure / Don't like for each part, notes, a score). Answers save in the browser. **Download my feedback** makes a `.txt` file to send back (it contains a data block at the bottom, please leave it in). `index.html` also has "Download all my feedback" with a favourite and mix-and-match notes. Set `SEND_TO` in `review.js` to prefill the Email button.

All shop facts come from the shop's own emails (name, tagline, address, phone, email, hours). Prices, ABV, allergens, hampers, rental terms and social links are placeholders. Products are the 15 sample products and are labelled Sample. Images are the supplied logo only (no AI imagery on these pages), unless a concept says "Temporary imagery". Not live, not final, not a quote or scope.

Checks run (Playwright, Chromium, 1366 and 390 wide, and reduced motion): no console errors, no horizontal overflow, axe-core 0 violations, signature interactions exercised by the builders and spot-checked. Not tested on real devices, Safari or Firefox.
