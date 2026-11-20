# DESIGN.md: website design system and process

Status: **proposed, for owner approval** (2026-11-20). Nothing in this file changes an approved design. It records how designs are made, reviewed and improved in this repository, and how that knowledge is reused without relying on any conversation's memory.

Related: `references.md` (sources and verification status), `grokResearch.md` (the Grok report), `../concepts/` (existing concept documentation), `.claude/CLAUDE.md` and `.claude/skills/website-design-system/` (how Claude Code applies this).

## 1. Principles

These extend the owner's existing "Website Creative Director" rules:

- Flat colour. No decorative gradients, glass blur, artificial glows or glamorous drop shadows.
- Tinted light and dark tones in place of pure white and pure black. Accents used on purpose.
- Deliberate asymmetry and varied spacing. Every section has a reason to exist. No repeated grids of identical cards, no decorative icon above every heading.
- One signature interaction per page. Motion has a purpose: position, scale and opacity only, controlled easing, no bounce for its own sake. Essential content never depends on an animation finishing.
- Authentic imagery for live claims. Generated imagery is labelled. No fabricated reviews, staff, customers, awards or results.
- Nothing works only on hover. Comfortable touch targets. Fonts are licensed and self-hosted.

Added from the Grok research (reported, see `grokResearch.md`): one focal point per screen; real copy, never placeholders such as "Feature 1"; buttons say what happens; design every state (empty, loading, error, hover, focus); text contrast at least 4.5:1; touch targets at least 44px; tokens before screens.

**Defaults, not laws.** The numeric defaults from the report (4px spacing, five type sizes, at most three colours, one accent used rarely) suit product UI. The eight concepts are deliberately art-directed, so a concept may deviate when it records why (Sunny Hours Club uses five colours on purpose).

## 2. Process

1. **Ask.** Up to three questions that change the design: audience, the page's one job, how it should feel.
2. **Audit before changing.** Look at real screenshots at 1440px and 390px. List the five biggest problems, worst first, each with a fix.
3. **De-slop check.** List anything that looks like an AI default: gradients, icon cards, pill badges, an accent-coloured word, sparkle icons, fade-ups on everything, vague buttons, glass cards, a shadow on every element. Give one replacement for each, based on what the business actually does and with no new claims. A device that carries the concept's tone may stay if the reason is written down.
4. **Study references.** At least three relevant examples from `references.md`, with URLs, the principle adapted and why it fits.
5. **Three directions** (safe, bold, unexpected) that differ in layout and idea, not only colour. Name each, one sentence, a rough wireframe. Recommend one and wait.
6. **Build** the chosen direction as original work. Simplest technique first: CSS, then Motion, then Rive or another tool, each justified.
7. **Check** at 390px and 1440px by looking at screenshots. Keyboard-only pass, reduced motion, performance, the one-second test.
8. **Feedback:** change only what was named; keep everything else. Show before and after.
9. **Hand-off:** a short spec (colours, type, spacing, components) and the three improvements you would make with more time.

For critique, a reviewer (Fable) works from captured screenshots and the page source and only proposes. Implementation (Claude Code) happens on a branch after approval.

## 3. Motion standards

From Emil Kowalski's skills (MIT; `.claude/skills/`; verified in `references.md`):

- Ease-out for entering UI; never ease-in. Suggested curves: `cubic-bezier(0.23, 1, 0.32, 1)` (out) and `cubic-bezier(0.77, 0, 0.175, 1)` (in-out).
- Durations: press feedback 100-160ms; tooltips and small popovers 125-200ms; dropdowns 150-250ms; modals and drawers 200-500ms. UI animation stays under about 300ms.
- Press feedback `scale(0.97)`. Entrances start from about `scale(0.95)` with `opacity: 0`, never from `scale(0)`.
- Hover effects only inside `@media (hover: hover) and (pointer: fine)`.
- Springs only for direct manipulation (drag, sheets), bounce 0.1-0.3 at most.
- Animate `transform` and `opacity`. Avoid animating layout properties.
- Reduced motion means fewer and gentler animations, not none: keep short fades, remove travel and looping motion.
- Effects (shaders, WebGL, parallax, scroll-jacking) only when they carry meaning.

## 4. Accessibility and performance gates

- Contrast at least 4.5:1 for text (large display text at least 3:1). Compute it from the CSS values.
- Visible keyboard focus on every control; logical tab order.
- Reduced motion, no-JavaScript and blocked-video states are designed, not accidental.
- Tap targets at least 44px on mobile; no text below 12px that carries information.
- Heavy media must not delay the first view: a poster or still, sized to its display size; videos muted, looping, and not required to understand the page.
- Measure LCP, CLS and payload on a real device or with network and CPU throttling. Software-rendered headless numbers are a signal only.

## 5. Registry of existing concepts (Rev 6, branch `claude/cinematic-poc`, commit `eae94be`)

Palettes and fonts below come from the Creative Director workbook seeds and the Rev 6 review; confirm against each page's CSS before relying on a value. All eight are hidden, noindex, labelled as concepts, with generated concept imagery and placeholder information.

| # | Concept | Direction | Signature interaction | Must be preserved |
| --- | --- | --- | --- | --- |
| 01 | Olive & Ivory (wedding photography) | Photographer's proof sheet; ivory, sage; Great Vibes script with Newsreader | Hero print docks into an interactive contact sheet; light table with Keep and Pass marks that carry into the reply card | Pen-stroke name, framed film window with edge codes, ivory and sage palette |
| 02 | Bright Circuit Electrical | Technical drawing; graphite, amber; Archivo with IBM Plex | Scroll-drawn SVG bus line with breaker symbols; services as real switch controls | Inspection window with leaders and pins, bus line, always-reachable emergency call |
| 03 | Salt & Ember (restaurant) | Hearth film; dark warm, ember orange; Newsreader | Per-letter ignition tied to the footage, pinned scroll into the menu, course tabs | **Everything.** Fire interactions, type treatment, menu behaviour and identity stay intact unless testing shows a genuine defect |
| 04 | Sunny Hours Club | Flat shapes and tilted mixed type; navy, red, teal, yellow on cream | Weekly planner: drag, tap-tap, or keyboard pick-up | Five-colour palette, tilted shape language, planner mechanics and announcements |
| 05 | Clear Ground Coaching | Calm editorial; stone and green; light Newsreader | One hand-drawn journey line with a walking marker; enquiry adds waypoints | The single continuous line, restrained pace, reflective tone |
| 06 | Little Kettle Café | Warm café; cream, coral, sage; Newsreader | Flip-tile specials board that shuffles; ticket-stub menu with a table tray | Arch window, hanging sign, tactile flip tiles |
| 07 | The Corner Shelf | Catalogue; heavy Archivo capitals, terracotta; drawn objects | Shelf with physical category filtering, turnable inspector, demonstration basket | Huge type standing on a drawn plank, drawn objects, no product photography claims |
| 08 | Oak & Razor | Dark and confident; black, bone, brass; mega Archivo wordmark | Kinetic wordmark synced to the clip; expanding services list into the appointment journey | Brass and black, mega wordmark responding to scroll, pointer and clip |

**Keeping them apart.** The review already flags overlaps: very large heavy Archivo capitals (Bright Circuit, Corner Shelf, Oak & Razor), a large serif or caps over footage (Salt & Ember, Oak & Razor, Little Kettle, Clear Ground), and an italic serif accent word (Clear Ground, Little Kettle, Olive & Ivory subline). Improvements must widen the differences, never narrow them.

## 6. Reuse across projects

The standard must not depend on a conversation, and it must not flatten every site into one look. It is split into two layers:

- **Shared (portable):** the process, the evidence rules, the quality gates and the reference library. The skill folder `.claude/skills/website-design-system/` carries all of it: `references/research-process.md`, `references/fable-critique.md`, `references/accessibility-checks.md`, a portable copy of the reference library (`references/reference-library.md`, kept in step with `docs/design/references.md` by `scripts/check-references-sync.sh`), and the two templates. `.claude/CLAUDE.md` holds the always-on rules.
- **Per project (never shared):** the identity (palette, typefaces, shape language, tone, signature interaction), recorded only in that project's own `DESIGN.md`.

How to reuse it:

1. **This repository:** everything above is committed, so any new session here loads it.
2. **Another repository or client project (including Build AI Here):** copy the skill folder into the project's `.claude/skills/`, add a one-line pointer in that project's `CLAUDE.md`, and create or keep that project's own `DESIGN.md`. Build AI Here already has its own `DESIGN.md` (the hybrid direction), which would remain the authority on its identity. Nothing from this repository's concepts carries over.
3. **The owner's machine, every project:** put the skill in `~/.claude/skills/` and keep a short pointer in `~/.claude/CLAUDE.md`.
4. **Cloud sessions:** an environment setup script could fetch the skill when a container starts. That changes the environment and needs the owner's approval.

The skill stops and asks if a project's `DESIGN.md` or references are missing. It does not invent them or borrow another project's. Validation in fresh sessions is recorded in `audit-2026-11-20/skill-validation.md`; the proposal for sharing it with Build AI Here and future projects (not actioned) is `skill-sharing-proposal.md`.

## 7. Audit record (2026-11-20)

**Baseline:** `rhyshume1997-alt/rhyshume`, branch `claude/cinematic-poc`, commit `eae94be`. The repository's static concept tests pass (45 of 45).

**Method:** 92 screenshots of the eight concepts (1440x900 and 390x844, successive viewport-height positions); four Fable reviewers critiqued two concepts each from the screenshots and source (proposals only); every claim that drives a fix was then **re-measured in a real browser** against a local copy, with the proposed CSS injected at run time for the "after". No repository file was edited. Evidence is in `audit-2026-11-20/` (comparison images and the raw measurement JSON).

**Not judged from evidence:** video and kinetic motion (screenshots are still frames), widths other than 390 and 1440, light-table, reply-card, basket, booking and enquiry states beyond the first screens, real touch behaviour, screen readers, Safari and Firefox.

### Verification ledger

| Claim | Result |
| --- | --- |
| Oak & Razor booking grid never applies | **Confirmed** (computed `display: block`, grid after the fix) |
| Focus ring invisible on banners and call bars | **Confirmed**, measured on all eight (table in F2) |
| Bright Circuit board splits "certificates" mid-word at 1440 | **Confirmed** (board 671px wide) |
| Sunny Hours mobile pinned chrome covers content | **Confirmed** (192px of 844 pinned) |
| Sunny Hours "Wednesday" and "Thursday" overflow at 1440 | **Confirmed** (`scrollWidth > clientWidth`) |
| Corner Shelf hides most of "Shelf" at 1440x900 | **Confirmed** (35% visible) |
| Salt & Ember: eyebrow touches statement; date icon dark on dark; pale edge on menu photos | **Confirmed** |
| Olive & Ivory flying print crosses sheet text | **Confirmed**, transient: up to 58% of a text block on mobile, 50% on desktop |
| Olive & Ivory hero lines delayed 2600 to 3200ms | **Confirmed** from source |
| Little Kettle chair image is a 300px source shown at about 296px | **Confirmed** |
| Little Kettle flip is 720ms | **Confirmed** (ease-out curve, not ease-in) |
| Clear Ground chapters can show empty after an anchor jump | **Not reproduced**: 0 of 5 elements invisible on `#ch2` and `#ch4` after 600ms |
| Oak & Razor rows shift under the pointer on hover | **Not reproduced**: 0px on all six rows |
| Little Kettle "sample copy" text is 3.6:1 | **Not supported**: that element measures 13.17:1 on cream. The real issue is size (11.2px) |
| Three Emergency buttons visible on Bright Circuit mobile | **Partly**: two in the first view |
| Earlier LCP values of 4 to 7 seconds | **Artefacts** of scripted scrolling in software-rendered Chromium. Not evidence of a problem |
| Salt & Ember ampersand ends cream, CSS says ember | **Confirmed** as an inconsistency, **not a defect**: the animated end state is cream (computed). Owner's call |

## 8. Prioritised fixes (for approval; nothing implemented)

**Implementation status:** F1 to F6 are implemented on a separate branch (draft pull request https://github.com/rhyshume1997-alt/Rhyshume/pull/32, not merged); their verification is in `audit-2026-11-20/implementation-verification.md`. **F7 (the Salt & Ember asset crop) and every Priority 2 and Priority 3 item are not implemented.** The measurements below are the "before" state.

Rules for every fix: preserve the approved identity and signature interaction; smallest change first; work on a new branch from `claude/cinematic-poc`; after each fix re-run `node --test` and the shared browser checker and take before and after screenshots at 390 and 1440; nothing merged or deployed without approval. Images referred to are in `audit-2026-11-20/`.

### Priority 1: confirmed functional, responsive and accessibility defects

**F1. Oak & Razor: booking layout collapses on desktop**
- **File:** `oak-razor.css` (line 174, `.bk`); the overriding rule is `cinematic.css` line 69.
- **Cause:** `.js .js-only { display: block }` (specificity 0,2,0) beats `.bk { display: grid }` (0,1,0) on `<div class="js-only bk" id="bk">`, so the intended rail-and-panel grid never applies once JavaScript runs. The sticky rail slides over the summary slip.
- **Change:** add `.js .bk.js-only { display: grid; }` in `oak-razor.css` (not the shared file).
- **Evidence:** computed `display` is `block` before, `grid` after. Image `oak-razor-booking-compare.png`.
- **Regression risk:** low. Re-test the six-step journey at 390, 768, 1024 and 1440; the existing `.bk { grid-template-columns: 1fr }` rule at line 231 keeps phones single-column.

**F2. All concepts: keyboard focus ring invisible on the banner and call bar**
- **Files:** `cinematic.css` (shared, lines 19 and 27 to 28), plus `bright-circuit.css`, `sunny-hours.css`, `corner-shelf.css`.
- **Cause:** the ring uses `--ring` (usually the ink colour) and the banner and call bar are painted in that same colour.
- **Change:** shared rule `.banner a:focus-visible, .callbar a:focus-visible { outline-color: currentColor; }`, plus per-concept overrides where that is not enough: Bright Circuit call bar ring in its yellow, Sunny Hours call bar ring in its sun yellow, Corner Shelf `.callbar button:focus-visible` in its paper colour.
- **Evidence (ring contrast against the band, before to after):**

| Concept | Banner (1440) | Call bar (390) |
| --- | --- | --- |
| Olive & Ivory | 2.63 to 12.65 | 2.63 to 13.51 |
| Bright Circuit | 1.00 to 14.35 | 1.00 to 8.72 (per-concept ring) |
| Salt & Ember | 2.75 to 14.53 | 2.75 to 14.53 |
| Sunny Hours | 1.00 to 13.35 | 1.00 to 9.28 (per-concept ring) |
| Clear Ground | 1.98 to 12.17 | 1.98 to 12.17 |
| Little Kettle | 1.00 to 13.17 | 1.00 to 13.17 |
| Corner Shelf | 1.00 to 14.73 | 1.00 to 14.73 (per-concept ring) |
| Oak & Razor | 1.00 to 7.16 | 1.95 to 13.95 |

  Images `salt-ember-and-focus-ring-compare.png` (Oak & Razor banner, Sunny Hours call bar).
- **Regression risk:** low; visible only on keyboard focus. The one-line shared rule alone is **not** enough for the Bright Circuit, Sunny Hours and Corner Shelf call bars (measured), hence the overrides. **Salt & Ember is protected:** if the shared file is touched, confirm it is visually unchanged apart from the ring; the alternative is to scope the Salt & Ember fix inside `ember.css`.

**F3. Bright Circuit: services board breaks a word at 1440**
- **File:** `bright-circuit.css` (lines 145 `.ways`, 162 breakpoint, 252 `.nm`).
- **Cause:** at 1440px the board is only 671px wide but still uses three columns, and `.nm { overflow-wrap: anywhere }` breaks "CERTIFICATES" mid-word. The open cover also becomes a tall thin column.
- **Change:** keep two columns until the board is genuinely wide (raise the three-column breakpoint or use a container query); `overflow-wrap: normal` on `.nm`.
- **Evidence:** mid-word breaks measured: `["certificates"]` before, none after. Image `bright-circuit-board-compare.png`.
- **Regression risk:** medium-low. The board gets taller and the scroll-drawn bus line is built from measured section positions, so re-run the page checker and look at the bus alignment.

**F4. Sunny Hours: mobile pinned chrome covers content**
- **File:** `sunny-hours.css` (line 29 `.top`, lines 160 and 247 `.hold`).
- **Cause:** header (75px), planner status bar (58px) and call bar (59px) are all pinned, covering 192px of an 844px screen, including the intro and the first tile names while choosing a tile.
- **Change:** under 48rem make `.top` non-sticky and set `.hold { top: 0.6rem }`.
- **Evidence:** pinned pixels measured 192 before, 117 after. Image `sunny-hours-mobile-chrome-compare.png`.
- **Regression risk:** low. The sticker header stops following on phones. Re-test tap-then-tap placement and that the status bar stays visible.

**F5. Sunny Hours: day headings overflow at 1440**
- **File:** `sunny-hours.css` (around lines 190 to 191 and 389).
- **Cause:** heading size `clamp(1.1rem, 1.6vw, 1.5rem)` next to a fixed 2rem icon.
- **Change:** container-query font size on the day heading; raise slot labels (about 10.9px) to at least 0.72rem.
- **Evidence:** "Wednesday" and "Thursday" overflow (`scrollWidth > clientWidth`) at 1440; the other three do not.
- **Regression risk:** low.

**F6. Corner Shelf: most of "Shelf" cut off at 1440x900**
- **File:** `corner-shelf.css` (line 55, `.hero .plate`).
- **Cause:** a 2:1 footage plate pushes the second wordmark line below the fold on short desktop screens.
- **Change:** under `(min-width: 64rem) and (max-height: 60rem)` use `aspect-ratio: 5 / 2`.
- **Evidence:** "Shelf" visible 35% before, 73% after. Image `corner-shelf-first-view-compare.png`.
- **Regression risk:** low. Check the footage crop (`object-position: 50% 24%`) and that 1920x1080 is unchanged.

**F7. Salt & Ember (protected): three demonstrable defects, nothing else**
- **(a) Pale edge on menu photographs.** Files: `img/se-01-fire-grill.jpg` (right edge), `se-02-plated-food.jpg`, `se-03-wine-pour.jpg`, `se-04-dessert.jpg` (left edge). Cause: each source JPEG carries a one-pixel light column (edge columns average about RGB 215,209,206 / 173,170,169 / 242,228,218 / 216,209,205 against dark photographs; verified from pixels and in the render). Change: crop 2px from the offending edge of each of the four images. **A CSS-only `inset: -2px` was tested and did not remove it.** Evidence: image `salt-ember-and-focus-ring-compare.png` (zoomed edge, before and after with cropped copies served at render time only). Risk: about a 0.5% crop, no layout change. These are approved assets, so replacing them needs your approval.
- **(b) "Reserve" eyebrow touches the statement.** File: `ember.css` line 112 (`.state`, `line-height: 1`, no top margin). Measured gap 0px. Change: `margin-block-start: 0.6rem`. Evidence: same image. Risk: none.
- **(c) Date icon dark on dark.** File: `cinematic.css` line 63 (form controls) and the booking slip in `ember.css`. Measured `color-scheme: normal`. Change: `color-scheme: dark` on `.slip input, .slip select`. Evidence: same image. Risk: check the native select popup looks right.
- **Not touched:** fire effects, ignition, pinned hand-off, type treatment, menu transitions, identity. The ring fix is F2.

### Priority 2: design quality (evidence-backed, lower urgency)

**D1. Olive & Ivory: print crosses sheet text; late hero copy**
- Files: `olive.js` (scroll-linked flight in `apply()`/`measure()`), `olive.css`, `olive-ivory.html` lines 38 to 41. Cause: the flight path runs through the proof-sheet header at rest positions on a single column; hero lines carry inline delays of 2600, 2800, 3000 and 3200ms.
- Change: below 56rem keep the print in the hero and develop frame 01 with the others; from 56rem up keep the flight but finish before the sheet header reaches mid-viewport; bring tagline, sub and button in by about 600ms while the pen-stroke name keeps writing.
- Evidence: overlap sweep, worst 58% of a text block at 390 (scrollY 270) and 50% at 1440 (scrollY 510); `evidence/olive-ivory-m-1.jpg` shows it. No after render (needs a JavaScript change).
- Risk: **medium**, because it touches the signature docking. Run the existing interaction suites (t5, t8, dock) and keep desktop docking.

**D2. Little Kettle: soft chair image; board feel; small text**
- Files: `img/little-kettle-frame-chair.{jpg,webp}`, `little-kettle.html`, `little-kettle.css` (line 136 `.face`, line 163 `.tile:active .face`).
- Cause: a 300x300 source is shown at about 296 CSS px, so it is 1:1 at best and soft on high-density screens; the flip is 720ms for an action repeated up to eight times and press only shortens the duration.
- Change: replace with a 600px or larger in-focus source, or a flat SVG chair in the page's drawing language; flip about 450 to 500ms with press scale 0.97; mono and placeholder text floor 0.75rem.
- Evidence: dimensions measured; flip duration measured (`0.72s cubic-bezier(0.23, 1, 0.32, 1)`). No after render is possible until a replacement asset exists.
- Risk: low.

**D3. Clear Ground: phone loses the drawings; formulaic accent word; progress devices**
- Files: `clear-ground.css` (phone block; line 133 radio dot), `clear-ground.js` (waypoint scale 0.4), `clear-ground.html`.
- Cause (source and screenshots): phone CSS hides labels, contours and the boulder, drawings are scaled to 0.4, and three bars (header 59px, chapter strip 45px, call bar 59px, 163px in all) are pinned; every chapter heading ends in a green italic word.
- Change: one waypoint per chapter at about 0.75 scale in the free space beside the numeral; remove the header progress bar; plain roman chapter headings (keep the h1 "begin" and the italic quotes); start the radio dot from about `scale(0.5)` with opacity.
- Evidence: pinned height measured; `evidence/clear-ground-m-1.jpg` to `m-5.jpg`. The reviewer's "chapters empty after an anchor jump" claim was **not reproduced**, so fade-ups are a design choice, not a defect.
- Risk: low to medium; check at 320px that the line never crosses text.

**D4. Bright Circuit mobile: duplicate emergency control; ungated hover; small disclosures**
- File: `bright-circuit.css` (hover rules at lines 22, 24, 154, 160, 208; no `@media (hover: hover)` anywhere in the file).
- Change: drop the header Emergency button under 48rem (the call bar keeps it) and add section anchors; wrap hover rules in `(hover: hover) and (pointer: fine)`; add `:active` press feedback; raise the smallest disclosure text; reword "Live view" to "Inspection view" over generated footage.
- Evidence: two Emergency buttons visible in the 390px first view (measured); hover rules ungated (grep). Risk: low.

**D5. Corner Shelf: filter choreography; ungated index hover**
- File: `corner-shelf.js` (lines 187 to 201), `corner-shelf.css` (lines 102 to 108).
- Cause (source arithmetic, not measured in a browser): about 1.4 to 1.5 seconds end to end, with an ease-in exit; `.idx-row:hover` is ungated.
- Change: exit about 160ms ease-out, total stagger capped near 120ms, slide about 320ms, enter about 280ms; gate hover and keep the focus styles.
- Evidence: source only. Risk: low; the FLIP tidying stays.

**D6. Oak & Razor: differentiation and purity**
- Files: `oak-razor.css` (hover padding, transitions 500 to 700ms; outline headings in the band and footer).
- Change: hover preview by transform and opacity only; shorter repeated transitions; replace the outline headings with the concept's own thin-to-heavy weight contrast so it stays distinct from Corner Shelf.
- Evidence: **row layout shift was not reproduced** (0px), so this is a performance and distinctness improvement, not a bug. Risk: low.

### Priority 3: optional or owner's call

- Salt & Ember ampersand: the animated end state is cream while the static CSS says ember.
- Olive & Ivory: frames 10 to 12 as labelled unexposed cells; dialog focus ring in ivory.
- Sunny Hours: replace the three hero fact cards with a four-part day strip.
- A minimal pause control for looping footage and the Little Kettle stamp spin (WCAG 2.2.2). Owner decision, since it adds visible UI.
- Little Kettle shop drawing (roof kettle reads as a bowler hat, stray scallop hook).
- Re-measure LCP properly; replace low-resolution footage and photographs (already listed in the Rev 6 asset register).

### Preserved without change

All eight signature interactions and identities as listed in section 5. Salt & Ember's fire, ignition, pinned hand-off, type treatment, menu transitions and identity are untouched.

## 9. Open items

- Approval is required before any implementation. Implementation would be a new branch from `claude/cinematic-poc`, small commits per fix, with the existing checks re-run. The concepts stay hidden and noindex; nothing is merged or deployed without approval.
- The Grok report's links are unverified (see `grokResearch.md`); no Reddit research exists.
- "Tobi" remains unidentified.
