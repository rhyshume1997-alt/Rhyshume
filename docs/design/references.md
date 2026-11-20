# Design reference library

The permanent reference collection for website design work in this repository, for Claude Code and Fable alike. References are **inspiration, never templates**. Do not copy a layout, component, prompt, asset or code from any source, and do not assume anything here is licensed for commercial reuse. Check licence, dependency security and compatibility before importing anything. Never buy a template, subscription, component pack or plan without the owner's approval.

Related files: `DESIGN.md` (the design system and process), `grokResearch.md` (the 20 November 2026 Grok report), `../concepts/` (the existing concept documentation, which this does not replace).

## Verification labels

| Label | Meaning |
| --- | --- |
| **Verified: read** | Page text or files were fetched and read by Claude. |
| **Verified: viewed** | Also looked at in a rendered desktop screenshot. Third-party images and video usually did not load, so media was not judged. |
| **Grok-supplied** | Named in the owner's Grok report. Not opened by Claude (host unreachable). |
| **Not inspected** | Could not be read. |
| **Pending** | Not yet identified. |

Inspection dates are 2026-11-20 unless stated. Attribution is kept as published by each source.

## 1. Design-engineering principles

| Reference | Use | Status and notes |
| --- | --- | --- |
| **Emil Kowalski, skills** https://github.com/emilkowalski/skills | Interaction feedback, animation timing and easing, springs, accessibility of motion | **Verified: read** (README and `skills/emil-design-eng/SKILL.md`). MIT licence shown on the repo page. Already installed in `.claude/skills/` and pinned by hash in `skills-lock.json`, with the licence kept in `.claude/skills/EMILKOWALSKI-LICENSE`. Other skill files were not individually read for this record. No typography guidance was found in the files read, so none is attributed to Emil. |
| **Rive** https://rive.app (pricing https://rive.app/pricing) | Interactive illustration, state-driven graphics, workflow demonstrations | **Verified: viewed** (home) and **read** (home, pricing, and the MIT licence of the `rive-react` runtime at https://raw.githubusercontent.com/rive-app/rive-react/main/LICENSE). Docs not read. **Cost note:** the free plan's exports "play a Rive splash screen"; removing it needs a paid plan. Owner approval is required before any paid use. An internal guide exists as the artifact "Rive for Web Design". |
| **Tobi** | Unresolved | **Pending.** The exact designer or site has not been identified. No examples are attributed. Do not guess. |

## 2. Typography, colour and design-system structure

| Reference | Use | Status and notes |
| --- | --- | --- |
| **Refero Styles** https://styles.refero.design/ | Colour roles, named type scales, spacing, DESIGN.md structure | **Verified: read**, style page **viewed**. Publishes AI-readable DESIGN.md records (2,000+ at the time of reading) with sections for colours with roles, typography, spacing and components, plus Tailwind v4 and CSS-variable exports. Refero states its records are generated interpretations, **not official brand guides**. Useful records seen: Intercom https://styles.refero.design/style/12255b63-e506-4bc1-a4cd-d05487de32f3 (warm cream editorial, hairline borders, mono labels, one accent). Index of examples: https://styles.refero.design/ai-agents/design-md-examples (includes Pravah: "warm parchment with dark section changes"). Terms not read. |

## 3. Components and UI patterns

| Reference | Use | Status and notes |
| --- | --- | --- |
| **21st.dev** https://21st.dev/ | Component and pattern study (buttons, cards, navigation, heroes, footers) | **Verified: viewed** (home) and **read** (terms of service, last updated 20 July 2026). The terms say marketplace content belongs to its authors and 21st Labs, demos, previews and media are owned by 21st Labs, and they prohibit scraping, republishing media or metadata, and redistributing components. **Study only. Do not import components without checking that component's own licence and getting approval.** The home hero (pale gradient swirl with a heavy bold sans) is a generic pattern to avoid copying. |

## 4. Visual composition and creative direction

| Reference | Use | Status and notes |
| --- | --- | --- |
| **MotionSites** https://www.motionsites.ai/ | How motion-led sites are briefed | **Verified: read** (small, mostly script-rendered). A library of "ready-to-use prompts" for AI-generated landing pages, with paid tiers. Terms not read. Individual prompts (see `grokResearch.md`, item 3) were **not inspected**. |
| **Scrolltide** https://www.scrolltide.co/ | Scroll-driven composition, template taxonomy | **Verified: viewed** and **read**. A catalogue of scroll-driven website templates and prompts (React, Next.js, Tailwind, Framer Motion, GSAP, Three.js, Lenis, shaders). Advertises a $299 lifetime plan. Terms not read. **Do not buy.** |
| **SceneAI** https://sceneai.art/ | Hero and background composition | **Verified: read** (home and licence page, updated 28 April 2026). A paid library of prompts and assets. Its licence requires an active subscription or lifetime plan for commercial use. **Do not buy.** |
| **Landdding** https://landdding.com/ | Category-specific landing-page composition | **Verified: read.** A curated gallery across about 40 categories (including SaaS, Technology, Magazine, Education, Corporate, Fashion & Beauty, Food & Drinks). Individual entries were not opened. |
| **Land-book** https://land-book.com/ | Landing-page gallery | **Not inspected.** Automated requests were refused (HTTP 403). |

## 5. Motion and interactive effects

| Reference | Use | Status and notes |
| --- | --- | --- |
| **60fps** https://60fps.design/ | Microinteractions, transitions, hover and feedback behaviour in real apps | **Verified: viewed** and **read.** About 2,140 "shots" plus Motion, Snippets and Glossary sections. Example entries seen by title: "Apple Health Longevity Intro Animation", "Revolut Card Ready Animation", "Runmo Lab Pulse Heart ECG Interaction". The shots are video and did not load, so no timings were observed. Terms not read. |
| **Scroll Shaders** https://scrollshaders.com/ | Shader backgrounds | **Verified: viewed** and **read** (home and licence page, updated 17 October 2026). Seamless-loop WebGL shaders; advertises a $239 lifetime plan. Its licence allows commercial use on a paid plan and forbids resale and AI training. **Do not buy.** Its hero (dark ground, orange glow, italic serif accent word) is a counter-example of the look this project avoids. Use effects only when they carry meaning. |

## 6. Footers

| Reference | Use | Status and notes |
| --- | --- | --- |
| **Footer Design** https://www.footer.design/ | Footer layout, navigation structure, type | **Verified: viewed** and **read.** A gallery filterable by style: Typographic, Small Type, Illustrative, Grid, Flat, Animated, Cards, Bright, Dark, Large Type, Bold. The Lantern entry https://www.footer.design/sites/lantern shows small uppercase column headings over a very large full-width wordmark. Terms not read. |

## 7. Methodology and prompts (Grok-supplied)

All **Grok-supplied**, none opened by Claude. Full record, attributions and caveats are in `grokResearch.md`.

| Item | Creator as reported | Link | Use |
| --- | --- | --- | --- |
| Senior designer prompt for Fable 5.2 | @choopyplug1 | https://x.com/choopyplug1/status/2121685007215292656 | Process: questions, audit, three directions, build, check, hand-off. Prompt text is in the Grok report and is reproduced in `grokResearch.md`. |
| De-slop prompt | @reshax0 | https://x.com/reshax0/status/2121959214176505861 | Screenshot-based audit for generic AI styling |
| MotionSites prompts (virtual store, protein bars, fox couture) | @viktoroddy | https://motionsites.ai/?prompt=virtual-store, https://motionsites.ai/?prompt=protein-bars, https://motionsites.ai/?prompt=fox-couture | Creative direction only. Contents not supplied. |
| Iridescent Voice Orb | @RegesCoreAi | https://animatedwebs.com/templates/iridescent-voice-orb | Counter-example (orb pattern). Licence unknown. |
| Landing page as a game | @kodavid | https://x.com/kodavid/status/2122054450994892883 | Interaction idea only. Depends on a third-party MCP that is not adopted. |
| UI designed in Paper | @edo_lunardi | https://x.com/edo_lunardi/status/2121576083707310142 | Visual reference. Not inspected. |

**Research gap:** the Grok report states Reddit could not be read, so **no Reddit research has been done**.

## 8. Internal guides already in the owner's workspace

These are the owner's own Claude artifacts and are recorded so they are not duplicated:

- "Emil's Skills, Explained": plain-English guide to the installed skills, including which need a slash command.
- "Rive for Web Design": live Rive examples and the integration steps.
- "Website Creative Director" (and its workbook): discovery, creative directions, design rules and review checklist. Its default rules (flat colour, no decorative gradients or glass blur, tinted rather than pure black and white, purposeful motion, one signature interaction per page, genuine imagery for live claims) are adopted in `DESIGN.md`.

## How to use a reference

1. Identify at least three relevant references for the page or component and record their URLs in `DESIGN.md`.
2. State which principle is being adapted and why it suits the concept.
3. Produce an original design. Record what was deliberately not copied.
4. Check licences before importing anything. Prefer building from principles.
5. Do not describe a reference as inspected unless it was. If a page could not be read, say so here.
