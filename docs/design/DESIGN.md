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

The standard must not depend on a conversation. It lives in:

1. **This repository:** `docs/design/` (content), `.claude/CLAUDE.md` (always-loaded rules), `.claude/skills/website-design-system/` (the process as a skill). All are committed, so any new session here has them.
2. **Another repository:** copy the three docs and the skill folder, or install the skill from a shared source. This repo already records installed skills in `skills-lock.json`; a shared skill repository would be recorded the same way. The skill tells Claude to stop and ask if the docs are missing instead of improvising.
3. **The owner's machine, every project:** a user-level `~/.claude/CLAUDE.md` containing a short pointer ("for website design work, follow the website-design-system skill and its docs") and the skill placed in `~/.claude/skills/`.
4. **Cloud sessions:** an environment setup script could fetch the skill each time a container starts. That changes the environment, so it needs the owner's approval.

## 7. Audit record (2026-11-20)

**Baseline:** `rhyshume1997-alt/rhyshume`, branch `claude/cinematic-poc`, commit `eae94be`. The repository's static concept tests pass (45 of 45).

**Evidence:** 92 screenshots of the eight concepts (desktop 1440x900 and mobile 390x844, successive viewport-height positions), measured overflow, layout shift, console errors and payload, and a video-playback probe. Four Fable reviewers critiqued two concepts each from the screenshots and source, proposing only. Their key claims were spot-checked against the source before inclusion (Oak & Razor specificity bug, Bright Circuit word break and ungated hovers, Olive & Ivory hero delays, Clear Ground fade-ups, Salt & Ember menu-image edge pixels).

**Measured:** no horizontal overflow at 390 or 1440 on any concept; one h1 on each; videos play (muted, looping) on all eight; no console errors apart from one 404 on Olive & Ivory that did not reproduce.

**Correction to earlier numbers.** The LCP figures from the first capture (4 to 7 seconds on Olive & Ivory, Bright Circuit, Clear Ground and Little Kettle) were read after scripted scrolling and in software-rendered headless Chromium, so they are probably artefacts (the last LCP entry can be an element that painted later). They are not evidence of a performance problem. Re-measure before scrolling, log the LCP element, and use a real device or throttled profile before acting on them.

**Not judged from evidence:** video and kinetic motion (screenshots are still frames), widths other than 390 and 1440, light-table, reply-card, basket, booking and enquiry states beyond the first screens, real touch behaviour, screen readers, Safari and Firefox.

## 8. Prioritised improvement plan (for approval; nothing implemented)

Rules for every item: preserve the approved identity and signature interaction; change CSS or a constant before markup; test with the existing checks and take before and after screenshots; do not make the concepts converge. Items marked **defect** are bugs or accessibility failures, not taste.

### Priority 1: defects, low identity risk

| # | Concept | Change | Evidence | Method |
| --- | --- | --- | --- | --- |
| 1 | Oak & Razor | Restore the booking layout (rail and panel side by side) | `.js .js-only { display: block }` (specificity 0,2,0) overrides `.bk { display: grid }`, so the grid never applies at desktop widths; rail sits alone and slides over the summary slip. Rendered before and after | One rule: `.js .bk.js-only { display: grid; }` |
| 2 | Shared (`cinematic.css`) | Visible focus ring on dark bands | The banner and call bars are ink or accent and the ring uses the same colour, so it vanishes (Corner Shelf, Oak & Razor, Little Kettle, Clear Ground, Sunny Hours, and Salt & Ember's cream surfaces at 2.75:1) | One shared rule, for example `.banner a:focus-visible, .callbar a:focus-visible { outline-color: currentColor }`, then re-check each page. For Salt & Ember this is defect-only and visually imperceptible |
| 3 | Bright Circuit | Services board without a broken word | At 1440 the three-way board is about 670px wide and "TESTING AND CERTIFICATES" splits mid-word via `overflow-wrap: anywhere`; the open cover becomes a tall thin column. Rendered before and after | Two columns unless genuinely wide; `overflow-wrap: normal` on `.nm` |
| 4 | Sunny Hours Club | Stop the mobile sticky stack covering content | Header, status bar and call bar are all pinned and cover the intro and the first tile names while choosing. Rendered before and after | Under 48rem make `.top` non-sticky and `.hold { top: 0.6rem }` |
| 5 | Sunny Hours Club | Day headings that do not collide; readable slot labels | "Wednesday" runs under its shape at 1440; slot labels about 10.9px | Container-query font size on `.day h3`; floor labels at 0.72rem |
| 6 | Bright Circuit, Corner Shelf, Sunny Hours | Gate hover behind `(hover: hover) and (pointer: fine)`; add `:active` press feedback (0.97) | Ungated hover rules stick on touch; no press states on several controls | Wrap hover rules; add `:active` rules |
| 7 | Salt & Ember (defects only) | Menu-photo hairline; invisible date icon; eyebrow touching the statement | Edge pixel columns of the menu JPEGs average about RGB 215,209,206 against dark photos (verified); date input has no `color-scheme` (verified); `.state` has no top margin (verified) | Crop 2px or `inset: -2px` on `.panel-plate img`; `color-scheme: dark` on the form controls; `margin-block-start` on `.state`. Nothing else changes |

### Priority 2: design quality, evidence-backed

| # | Concept | Change | Why it helps |
| --- | --- | --- | --- |
| 8 | Olive & Ivory | Stop the flying print crossing the proof-sheet text on mobile (keep the flight from 56rem up); bring the hero copy and button in by about 600ms (currently inline delays of 2600 to 3200ms) while the name keeps writing | Instructions become readable on phones; the primary button is usable about 3 seconds sooner. The pen-stroke name is untouched |
| 9 | Corner Shelf | Make "Shelf" legible in short desktop first views (shallower plate under `min-width: 64rem` and `max-height: 60rem`); shorten the filter choreography from about 1.4s to about 0.5s with an ease-out exit | The wordmark is the identity and reads at once; rapid browsing stops feeling queued. Rendered before and after |
| 10 | Little Kettle | Replace the out-of-focus chair roundel (source about 300px); flip at about 450 to 500ms with press feedback and an ease-out tab exit; legibility floor for mono and placeholder text | Removes the one moment that looks broken; the eighth flip feels as good as the first |
| 11 | Clear Ground | Give phones the line's drawings back (waypoints at about 0.75 scale in the free space); make the line the only scroll-driven motion (remove fade-ups from chapter text, drop the header progress bar); retire the green italic word from the five chapter headings (keep the h1 "begin") | Phones get the concept; fixes the empty-chapter failure on anchor jumps; widens the gap from Little Kettle |
| 12 | Oak & Razor | Hover previews by transform and opacity only, with shorter repeated transitions; replace the outline headings with the concept's own thin-to-heavy weight contrast | Rows stop shifting under the pointer; keeps Oak & Razor distinct from Corner Shelf's outline-and-solid device |
| 13 | Bright Circuit | Mobile: one persistent Emergency control (drop the header duplicate, add section anchors); raise the smallest disclosure text; reword "Live view" to "Inspection view" | One clear emergency action; legible honesty text; safer wording over generated footage |

### Priority 3: optional or owner's call

- Salt & Ember: ampersand end state (animated end state is cream; static CSS says ember). Owner's call whether orange was intended.
- Olive & Ivory: show frames 10 to 12 as labelled unexposed cells; set the dialog focus ring to ivory.
- Sunny Hours: replace the three hero fact cards with a four-part day strip (pick-up and snack, first activity, second activity, home time) using existing copy.
- Looping footage and the Little Kettle stamp spin have no pause control (WCAG 2.2.2). Owner decision on a minimal pause control, since it adds visible UI.
- Fix Little Kettle's shop drawing (roof kettle reads as a bowler hat; stray scallop hook).
- Re-measure LCP properly and replace low-resolution footage and photographs (the review already lists these as asset replacements).

### Preserved without change

All eight signature interactions and identities as listed in section 5. Salt & Ember's fire, ignition, pinned hand-off, type treatment, menu behaviour and identity are untouched by this plan.

## 9. Open items and how this plan will be implemented

- Approval required before any implementation. Implementation will be a new branch from `claude/cinematic-poc`, in small commits per concept, re-running `node --test` and the shared browser checker and capturing before and after screenshots at 390 and 1440. Nothing is merged or deployed without approval, and the concepts remain hidden and noindex.
- The Grok report's links are unverified (see `grokResearch.md`); no Reddit research exists.
- "Tobi" remains unidentified.
