---
name: tobia-donadon-design
description: Design ideas and structure taken from Tobia Donadon's personal site (tobiadonadon.com): warm paper sections alternating with dark grained "ink" sections, one grotesk typeface plus handwritten notes, small-caps labels, pill shapes, numbered statements, scroll-driven chapters. Use when designing or restyling a page, hero, card set or section and the brief says "feel like Tobia's site". Ideas only: never his text, photos, shapes, colours or exact layouts.
---

# Tobia Donadon design: ideas to adapt, never to copy

Source read on 2026-11-25: the home page HTML and its three CSS files from https://www.tobiadonadon.com (the bare domain redirects there).
NOT inspected: the JavaScript behaviour, the project and thoughts inner pages, the exact colour values, or how it looks and moves in a browser.
Anything below marked "(inferred)" comes from class names and keyframe names, not from watching it run. Say so if you rely on it.

## Hard rules
- Take the structure and the thinking. Never his words, photos, illustrations, shapes, colours or exact layouts.
- Our palette, copy and photos come from the project's own brand. Check the project's CLAUDE.md first (for Build AI Here: graphite and amber are Tolra only).
- Do not commit screenshots or media from his site. Do not claim to have inspected more than the list above.

## What the site does (observed)
1. **Two surfaces, alternated.** Warm "paper" sections (class `paper-bg`) and near-black "ink" sections with a grain overlay (`bg-ink ink-grain`). A black section for writing. A dark full-height intro (`#0a0a0a`) opens the page. Rhythm: dark, paper, paper, ink, paper, black.
2. **One main typeface, plus handwriting.** Host Grotesk for nearly everything, Caveat for handwritten asides. A serif and a mono appear in small amounts. Mostly medium weight, not bold. Tight negative tracking on big headings (about -0.02em to -0.045em).
3. **Small-caps labels.** About 21 uppercase labels, with wide tracking (0.10em to 0.13em). They carry chapter names and tags such as "Start here", "In development", "In progress".
4. **Round shapes.** Pills (`999px`) for nav and buttons, very round cards (24px), a few small 2 to 8px radii for utility bits. Nothing in between feels random.
5. **Numbered statements.** "01 · Who am I", "02 · Where am I going", "03 · Why I create": one idea per screen with a number and a label.
6. **Scroll as pacing.** A statement section that fills the screen, then a long section (about 4 to 6 screens tall) that steps through short phrases, then stacked "project chapters" (`project-chapters`). Sticky and scroll-driven (inferred from class names).
7. **Honest, first-person copy.** Plain claims, a clear "Start here", "In development" labels instead of pretending things are finished. A small line on what is real ("They land here when they're real").
8. **Cursor and motion details (inferred).** Cursor attributes (`data-cursor-quiet`, `data-cursor-hide`), keyframes named page-rise, trail-pop, aurora-drift, lx-in/lx-fade, so there is a custom cursor, a rise-in on load and drifting background shapes.

## How to adapt it (our version)
- **Alternate warm and dark sections** using our own two tones. Add a light grain overlay on dark only (CSS noise, low opacity, no image download if avoidable).
- **Keep type to one family plus one handwritten accent.** Use the accent for short asides only (one line, never a paragraph). Labels in small caps with wide tracking.
- **Pill nav and buttons, very round cards.** Pick two radii and stay with them.
- **Number the steps** when a page makes an argument or a process.
- **Label status honestly** ("Coming soon", "In development") rather than hiding gaps.
- **One idea per screen** on landing pages. Long pinned scroll sections only when the pacing carries meaning, never on pages people shop from.
- **Motion:** three timings (about 0.7s reveal, 0.3s transform, 0.15s colour), ease-out, no animation from `scale(0)`, hover only behind `(hover: hover) and (pointer: fine)`, and fewer, gentler animations under `prefers-reduced-motion`.

## Check before shipping
- Mobile at 390px: nothing clipped, long names wrap, taps at least 44px.
- Keyboard focus visible. Text contrast at least 4.5:1 (small print especially: no pale grey on paper).
- Reduced motion tested. LCP and layout shift not worse than before.
- No copied text, photo, colour value or layout. If it looks like his page, change it.
