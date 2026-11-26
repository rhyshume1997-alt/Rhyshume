# Rev 6: Behind the Counter, refined

A private preview on the beers branch. It is the default look on previews. Original, Classic, Back Bar and Cinematic stay available
(`?look=original`, `classic`, `backbar`, `cinematic`). None of this renders on the live (indexable) site. Nothing was merged or deployed.
Checkout, payments, stock, accounts and delivery rules were not touched.

## 1. What was inspected first
- Client workbook (`Client_workbook_Jack_OBeers.json`): feel is warm, friendly, rounded; mood is "warm, friendly, welcoming, curious, homey, New York
  deli"; colours should match the logo; animation is "beer bottle filling up the glass"; font preference is "Dubai font".
- `docs/concepts/jack-obeers/rev4/DESIGN-REVIEW.md` and `rev5/01-requirements-map.md`: the Salt & Ember (about 70 percent) and Little Kettle (about 30 percent)
  brief, the "dubai still unverified" decision, and the rule that nothing draws a bottle in mid-air.
- Salt & Ember and Little Kettle (`website-concepts/`): both get their identity from physical objects of their own business (a hearth, a hanging sign, a window
  sill, a stamp, a ticket stub), flat colour, hairline rules and one big idea per screen. Neither relies on rounded cards or a coloured italic word.
- The original illustrated Pick a Shelf (`ShelfArt.tsx`, `ShopTiles.tsx`), the Rev 5 opening, the installed Emil Kowalski motion skills, and the Tobia Donadon
  guidance (ideas and composition only; none of his work is copied).

## 2. Generic patterns found in Rev 5, and what Rev 6 does instead
| Pattern | Rev 5 | Rev 6 |
|---|---|---|
| Rounded rectangle round everything | Photo tiles, boxed range panel, boxed product cards, boxed footer columns, boxed events and plans | The wooden shelf is its own structure. The range is a ruled menu list. Events are a ticket list, the club plans are two columns divided by a hairline, the footer is columns divided by hairlines. Boxes stay only for the basket dialog, the form fields and buttons |
| Identical card grids | Three photo tiles, card grid of products, card row of best sellers | The shelf is illustrated and stepped; products are menu rows; best sellers are a strip divided by rules |
| Serif headline with one italic coloured word in every section | "Pick a *shelf.*", "Keg fresh, *to take home.*", "Collect it, *or we send it.*" | No italic in any heading and no coloured word. The only colour accent in the opening is the amber full stop (the beer). A test checks this |
| Oversized headings | Up to 10rem | Section headings top out near 4rem; the opening headline is set in two sizes like an advertisement |
| Small label above every heading | "Shop", "About", "From the tap wall", "The deli counter" ... | Removed from the page (a test checks) |
| Decorative gold borders, gradients, glow, glass | Brass keylines, wash gradients | Gradients only as lighting over a photograph (the opening wash) and as wood grain on the plank and rail. No glow, no glass |
| Section reveal animations | `.rv` fade-ups | Switched off in this look. The only entrance is the shelf's one gesture |
| Uniform spacing and centred text | Same padding everywhere | Sections differ in padding and layout; text is left-aligned except the reviews strip |
| Decorative frames on every photo | Black awning frame on every image | Plain prints. Only the shopfront photos keep the awning frame, because they are pictures of the awning |
| Generic luxury restaurant photography | n/a | Only the shop's own photographs |

## 3. The visual language, taken from the real shop
| Real thing | Where it shows up |
|---|---|
| The tap wall with its numbered taps | The opening picture. The shop stays visible behind the type |
| The oak rail that divides the two rows of taps | The seam between the dark opening and the cream shop is a strip of oak rail, with the same light edge and dark underside |
| Wooden shelving, bottles, glasses | The illustrated Pick a Shelf, on a plank that runs the full width; each label is printed on the plank face |
| The small paper price cards under the taps | The product list is set like a menu: name, brewery and strength on the left, price and button on the right, a dotted rule between rows |
| The awning (green and cream, scalloped) | The scalloped edge between the tap-wall section and the deli; the awning frame on the shopfront photos |
| Jack | On the shelf (toned down, smaller on phones), and the logo files in the opening |
| The deli counter | A forest-green menu-board section with a plain photograph, prices as a list, not cards |
| Manhattan restaurant and delicatessen printing | Hairline rules, menu rows, a ruled footer line under the opening, small type set in a readable serif; no American diner theme |

## 4. Typography, decided from rendering
Three systems were rendered on the same layouts and content: opening, shelf, range, About, phone opening, phone range. A fourth panel shows the client's Dubai
preference for reference. Compare them yourself with `?type=a`, `?type=b`, `?type=c` on any preview link.

| | A: Gloock + Source Serif 4 | B: Bodoni Moda + Spectral | C: Newsreader + Lora |
|---|---|---|---|
| Letter shapes | Heavy, warm, moderate contrast, sturdy serifs | Very high contrast, hairline serifs | Light, calm, text-style display |
| Against the logo (heavy, hand-lettered, warm) | Matches the weight and warmth | Clashes: thick logo, hairline type | Neutral, but lighter than the logo |
| Over the textured photograph | Holds | Hairlines disappear | Holds at large sizes, thin at small |
| Phone readability | Strong | Thin; wide tracking looked loose at the opening size | Good |
| Reading text and prices | Source Serif 4: sturdy, optical sizes, lining figures | Spectral: light, small x-height | Lora: comfortable but bookish |
| With the illustrated shelf | Sign-painted weight sits well on the wood | Delicate against the heavy plank | Quiet |
| Feeling | Established independent shop, menu and sign painter | Luxury fashion, which is the generic look to avoid | Refined, but could be any shop |

**Selected: A.** Gloock for editorial headlines (one weight, used roman only, never italic). Source Serif 4 for ordinary content and every interface control,
including the phone action bar, prices, tabs and buttons. Bodoni Moda was not chosen because of its luxury association; the render showed it worked against this
shop. Newsreader and Lora remain in the project for the earlier looks.

**Licences and sources.** Gloock, Source Serif 4, Spectral, Bodoni Moda, Lora, Newsreader: SIL Open Font License 1.1, free for commercial use, self-hosted from
the `@fontsource` packages (Google Fonts distribution) in `public/fonts`, notice in `public/fonts/OFL-NOTICES.txt`. Canela and Tiempos were studied as commercial
inspiration only and are not used. No paid font is installed. The logo typography is unchanged (the supplied logo files are used as they are).

**Michael's Dubai preference (still open).** The workbook records "dubai font" as a client preference. The supplied files are a Monotype sans with no licence text,
so its web use is unverified and it is not shipped. It was rendered once for comparison (panel D in the comparison images): friendly, but it loses the
menu-printing character that the "New York deli" mood asks for. It needs a decision from Michael after he has seen the comparison. If Michael still wants it, a
web licence has to be bought first.

## 5. The page, section by section
| Section | Job | Layout |
|---|---|---|
| Opening | Say where you are, get to shopping | Real tap wall, headline set in two sizes, Shop drinks in the first screen, logo files, a ruled line of what is sold |
| Pick a shelf | Choose beer, cider or wine | The original illustrated shelf on a full-width plank. Hover, focus or a tap opens the range at once |
| Range | Choose and add | Open menu rows with prices and buttons on the right; style filter as underlined tabs |
| Best sellers | A quick way in | A strip divided by hairlines (only shown when Shopify returns some) |
| Reviews | Trust | A single ruled line |
| About | Michael and Tanya | Editorial: large lede line in the headline face, photographs as plain prints, hours with dotted leaders |
| Tap wall | How takeaway works | One large photograph beside the explanation; two plain photographs underneath |
| Deli | What to eat | Forest-green block, a plain photograph beside a menu-board list |
| Services | Collect, shipping, members | Typographic accordion |
| Find us | Where and when | Mahogany, three columns divided by hairlines |

Other pages (beers, ciders, wines, About, Events, Draught Club, FAQ, West Highland Way, product) take the type and the de-boxed catalogue; Events is a ticket
list and the Draught Club plans are two columns.

## 6. Motion (Emil Kowalski's rules applied)
- The opening to the shelf is one movement: the wall drifts down and darkens while the cream shop slides over it, and the seam is an oak rail. Transform and opacity
  only, scroll-driven, no scroll lock, nothing to wait for. Reduced motion and unsupported browsers: still.
- When the shelf comes into view, the beer bottle tips over the glass once, the glass fills and Jack reacts. One object, one gesture, about 3.4 seconds, ease-out,
  then it settles. Not staggered across the shelf. Hover and focus do the same thing and are interruptible. A click during it works at once.
- The range appears 8 to 44 ms after a click (measured in the browser); the animation never delays selection.
- Press feedback on buttons, hover only on a real pointer, nothing animates from scale(0), reduced motion shows the finished state.
- The beer bottle cursor is the existing cursor image, shown only over the drawn shelf items. It is not over text or controls elsewhere (a test checks).

## 7. Critical review of the rendered result
1. **Does it feel like Jack O'Beers?** The opening and the shelf do: it is the real wall with its numbered taps, the real logo files, Jack and the illustrated shelf.
2. **Considered or generically luxurious?** Gloock plus a menu-style layout avoids the luxury-template look. The headline is the weakest typographic moment: it is bold
   and warm, but "Welcome, come on in." is copy that could sit on any shop; the typesetting, not the words, carries it.
3. **Too many boxes?** Far fewer. What remains: buttons, form fields, the filter-free dialogs, the logo sign on phones, and the black frames on the two shopfront photos.
4. **Does every section have a different purpose and layout?** Mostly. The lower middle (reviews strip, About text, tap-wall section) is quieter and closest to ordinary
   editorial layout; it is the least distinctive part of the page.
5. **Is the shelf still charming?** Yes. It is the original art, restored, with a real plank under it, and it now does one small thing when you arrive.
6. **Does dark connect to cream?** Yes: the oak rail seam and the travelling logo make it read as one wall giving way to the shop. It works best on desktop.
7. **Friction to products?** Shop drinks in the first screen; the shelf is one scroll away; the range opens as the click lands; the basket is two clicks away (tested for
   beer, cider and wine on desktop and phone).
8. **Mobile navigation?** The Call, Directions, Shop beers bar stays, in the new type; the menu opens as before.
9. **Without the branding?** With the logo, Jack, the shop name and the sign photo hidden (see the comparison image), the page still reads as this shop because of the
   numbered tap wall and the illustrated shelf. The cream sections below the shelf would look like any careful independent-business site. The identity is strongest at the
   top and on the shelf and thinnest in the middle. That is a known weakness, not a solved one.

## 8. Limitations
- Not tested on real phones, Safari or Firefox. The scroll-driven transition needs Chrome, Edge or Safari 26; elsewhere it shows still.
- Tested on the test shop. Long real product names, real stock, real images and best sellers are unchecked here.
- The pour footage is no longer in the shelf (the illustrated shelf replaced it); the real clips remain in the tap-wall section.
- Gloock has one weight and no italic; there is no italic anywhere in headings by design.
- The notes drawer still saves only in the browser it is used in.
- Michael's Dubai preference is unresolved.
