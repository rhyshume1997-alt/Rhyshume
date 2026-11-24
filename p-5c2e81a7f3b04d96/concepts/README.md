# Jack O'Beers: five website concepts, round 2 (private, noindex)

**Round 2 is the current set.** Five takes on the approved preview site, all in the agreed colours (mahogany, forest, cream, amber, brass; the browns, cream and amber come from the logo) and the preview's feel (dark stage, cream shelves, round cards, pill nav, illustrated how-it-works). Open `index.html` (the board).

| Folder | Concept | Signature interaction |
|---|---|---|
| `long-pour/` | The cinematic preview taken to the whole page | The pint behind every section empties as you scroll; "Fill it up again" refills it |
| `wake-jack/` | A quiet counter with Jack asleep on it | Wake Jack and he headbutts each section away (in-page, keyboard and hash friendly) |
| `the-shelves/` | Warm cream shelves, ticket-stub cards | Four taste dials re-order the beer shelf (sample flavour data) |
| `keg-to-bottle/` | The tagline as a scroll story down a pipe | The beer line fills with amber as you scroll; stop counter, skip link |
| `hamper-table/` | Gift-led, hamper on the counter | Pack a hamper, write the gift tag, wrap it, add to basket |

Round 1 (different colours, rejected) is kept in `earlier.html` and its folders (`deli-counter`, `tap-room`, `shop-front`, `hamper-box`, `local-pub`).

Each concept folder: `index.html`, `concept.css`, `concept.js`, `fonts/` (SIL OFL), `NOTES.md` (what was taken from the preview, what is different, contrast ratios, trade-offs, assumptions). Only the home page exists in each concept; other links jump to sections or show a "not part of the concept" note.

## How it works (both rounds)
Each concept is independent: its own folder with `index.html`, `concept.css`, `concept.js`, fonts (SIL OFL) and `NOTES.md` (palette with contrast ratios, type pairing, layout idea, the signature interaction, trade-offs, and what is assumed or missing).

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
