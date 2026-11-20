# Jack O'Beers Rev 4: cinematic deli, design review

Direction from Michael: about 70 percent Salt & Ember, 30 percent Little Kettle Café. A refinement of the existing concept, not a rebuild. Same private branch, same page structure and interactions, new look, new opening, new scroll and a redesigned catalogue.

Evidence in this folder: recordings (`1-opening-animation.mp4`, `2-desktop-scroll-catalogue-and-beer-interaction.mp4`, `3-mobile-scroll-and-tap.mp4`, `compare-rev3-vs-rev4.mp4`), 18 screenshots, five side-by-side comparison images (`compare-1` to `compare-5`), `test-results.txt`, `test-suite.js`.

## What is Salt & Ember (about 70 percent)
- A dark mahogany stage with a faint wall panel pattern, cream type, amber accents.
- An oversized light serif headline that lights letter by letter from the side nearest the pour (the Salt & Ember ignition idea), then settles to cream and amber.
- A pinned stage that the scroll carries into the next section: the type lifts away, the plate comes closer, the room dims.
- Numbered sections with small mono labels, hairline rules, hard-edged tabs with a sliding amber underline, a dark forest band and a dark closing section for rhythm.
- Film grain over the footage, which also softens the upscale of the low-resolution clip.

## What is Little Kettle (about 30 percent)
- Rounded cards and pills, friendly copy ("Pull up a stool, find a bottle").
- Ticket-stub deli cards with a dotted perforation that tilt slightly on hover.
- A small brass round stamp ("Beer, Cider, Wine, Deli, Good Company") that turns slowly.
- Warm paper surfaces in the shop, deli and services.

## The opening
- A dark photographic composition. The pour footage sits at the right and fades into the dark wall at its left and top edges, so the headline sits on the dark.
- The bottle in the footage always comes in from beyond the frame edge, cropped. Nothing draws a bottle in mid-air.
- The cream plaque is gone. The client's logo, as supplied, is on a small framed enamel sign: a wood frame with a bevel, a brass keyline, an enamel face with a soft gloss and grain, and a brass foot. It lies flat on the counter, stands up with a perspective tilt, and the face comes up from dim to lit as it rises, as if the room is lighting it.
- Everything is usable from the first frame: the nav, "Explore the shop" and "Discover the deli" are in the page and clickable. Any click, key, scroll or touch skips to the finished state.

## The scroll transition (desktop)
The dark stage is pinned and carried. As the page scrolls the headline lifts and fades, the pour comes closer, the stamp lifts away and the room dims to near black. The shop rises over it as a warm surface whose top edge is a wooden counter lip with a brass nosing, the front edge of the bar top the opening was shot on. On phones and with reduced motion there is no pinning: the shop simply rises over the opening with the same lip.

## The catalogue
Light, readable and practical. Numbered category tabs, a lit-shelf panel behind each bottle, serif product names, a compact flavour profile on every card (four bars, always visible), a price placeholder, and a detail panel with the full profile, pairings, allergens and the click and collect or shipping choice. Hovering, focusing or tapping a beer or cider opens a window onto the pour footage and a forest-green information panel. Content is placeholder only and labelled: names say "Demo", descriptions "[to be supplied]", allergens "[to be verified]", prices "[to be confirmed]". Flavour scores are labelled "sample data, not verified". The Shopify journey is a visual prototype only: nothing is added, charged, stored or sent.

## The beer cursor
Unchanged in behaviour from Rev 3: photographic bottle, weighted movement, drinks section only, mouse only. New in Rev 4: it fades out over shopping controls (the category tabs, the detail panel and its Add button, the toggle, the age notice and any link or form control) and returns when the pointer leaves them, so it never covers a shopping control.

## Adult alcohol audience check
- No children, no cartoon characters, no playful imagery that would appeal to under-18s. The Little Kettle character is carried by warm paper, tickets and copy, not by illustrated figures.
- No health claims, no strength claims, no encouragement to drink more, no price promotions. The pour imagery shows a single drink being poured.
- An 18+ notice sits above the catalogue. How age is verified online, delivery restrictions, licensing and payment rules are still to be agreed with the client and are not claimed to be met.
- The audience notes in the workbook mention young families. That is a shop-wide audience, not a reason for alcohol marketing to appeal to children, and nothing here does.
- This is a design check, not legal advice.

## Provisional and missing
- The palette is provisional: forest green #12291d, mahogany #1d0f0a, cream #f2e8d2, amber #d9992b. The client's logo colours are still to be confirmed.
- The logo is the supplied 355 px image. A vector file would sharpen the enamel sign.
- The footage (736 x 400, AI-generated reference) is shown about 1.4 times its size in the hero. Grain and the camera push help, but a purpose-made film is still needed; see `../rev3/ASSET-SPEC.md`.
- The bottle photograph is one stand-in for every beer and cider.
- Newsreader has no italic file in this project, so italics are the browser's oblique. A true italic would improve the headline.
- Dubai still shows only where installed (the client asked for it, its web licence is unverified).
- Wine has no footage, so wine cards show information only.

## Test results (test-results.txt, 54 checks, 0 failing)
Headless Chromium, desktop 1440 x 900 and an iPhone 13 profile. All the Rev 3 checks still pass (opening, cursor, hover window, keyboard, switch off, reduced motion, no JavaScript, fallback, mobile tap, scroll while open, no external requests, nothing sent, no storage). New checks: the dark stage, the letter-split headline still reading as one heading, the pinned scroll carry (type fades, plate closes in, room dims, lip rises, returns cleanly), the catalogue section being light, and the cursor fading out over shopping controls and returning. axe-core (WCAG 2.2 AA plus best practice): 0 violations on the concept, the concept with a card open and footage playing, the review page and the lab page. A contrast failure on the deli number label was found and fixed.
Performance, indicative only (software-rendered headless, files served locally): about 60 fps, worst frame 16.8 ms during a pour with the cursor moving, no long tasks, layout shift 0.0014. A layout shift of 0.11 from the pinned layout switching on after first paint was found and fixed by setting it before first paint. Page weight about 0.95 MB at first view including 371 KB of footage, 72 KB GSAP and 45 KB ScrollTrigger.
Not done: real phones and GPUs, Safari and Firefox, a screen reader, Lighthouse, a manual contrast audit of text over footage.
