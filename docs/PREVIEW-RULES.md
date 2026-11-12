# Preview rules (hard rules for the preview tool)

Set 12 Nov 2026 by Rhys. These apply to every preview the tool builds, now and going forward.

## 1. Facts only, switched on by the facts
- Every part of a preview, and every interactive hook, switches on only when the facts it needs were found on the prospect's own site or measured by the tool.
- If the facts are missing, that part is left out. It is never filled with a stand-in.
- No invented stats, years, reviews, prices, awards, customers, services or claims.

## 2. Never show holes
- No empty halves, no "[PLACEHOLDER]" text, no unfinished-looking blocks.
- The one allowed stand-in is a clean block labelled "Your job photo here" (or "your workshop photo here"), only where a photo would go and none was found.
- A section with too little to show is hidden completely, not shown thin.

## 3. Hooks (plain HTML, CSS and vanilla JS only, no libraries, no build step)
Each hook has a gate. Below the gate, it is off.
- Measured scorecard with pins: needs at least 2 measured rows. Unmeasured rows dropped. Test date shown. Neutral wording. Rows the concept does not win are shown honestly.
- Enquiry builder: needs at least 3 services. Material chips only if materials were found. Max 2 steps. No prices, no "instant quote" wording.
- "What you'd receive" card: on Send the form becomes a tidy enquiry card marked "Demo, nothing was sent". The email line only if an email was found.
- Drawing drop zone: only if their site mentions drawings, CAD or DXF. Shows file name and size, uploads nothing.
- Their own photos strip: needs 3 or more of their own photos at least 800px wide.
- Contact buttons (Call, Copy email, Directions): each only if its fact was found.
- Hero services link to their cards and preselect that service in the enquiry builder.

## 4. Always
- Concept banner "Concept by Rhys Hume, not a live site", noindex, not in sitemap, llms.txt or nav.
- Forms post nowhere.
- Works at 320px and 375px with no sideways scroll.
- Plain UK English, no em dashes, no banned words, no rule of three.
- Logo: use the version that shows on a pale background.

## 5. Motion pack (standing rule, on by default for every preview and every niche)
Added 12 Nov 2026 by Rhys. A static page reads like a brochure, so every preview gets the motion pack unless it is switched off
(`--no-motion` on the command line, or "motion: off" in the Build preview Action).
It lives in one shared file, `tools/preview-motion.js`, and is written into each page. Plain CSS and a little vanilla JS.
No libraries, no build step, no extra files or requests, and it adds no words.

Same gates as everything else. A piece is on only when its facts exist, and is left out otherwise:
- Scroll reveal: sections and service cards fade up once, 400ms long, staggered 60ms. Anything already in view on load just shows.
- Before and after slider: only if both screenshots exist. Drag, touch and arrow keys. Otherwise the two screenshots stay side by side.
- Facts row count-up: only quantities found on their site (for example 120, 40, 10). Years never count (2005 stays 2005). Phone numbers never count.
- Header: stays at the top, shrinks slightly and gains a shadow after the first scroll. The Get a quote button stays visible.
- Service cards: a small lift and a line that grows under the title on hover and on keyboard focus. Titles link to the quote form so keyboard focus works.
- Hero: a slow soft colour drift behind the headline. No video.
- Get a quote buttons: a soft pulse every 8 seconds that stops at the first touch, click or key press.

Hard limits:
- Everything is off when the visitor asks for reduced motion. The slider still works, because it is a control and not an animation.
- With JavaScript off, the page shows all content normally. Nothing is hidden unless the page JS has switched motion on, and it switches itself off again after 4 seconds if the JS did not start.
- Animations use only transform and opacity, so there is no layout shift.
- The speed score must stay near 100 on mobile. Measure it with Lighthouse and report the real number. If motion lowers it, say so.
- All the other rules above still apply: only things found or measured, no customer names or third party logos, banner stays, forms post nowhere.
- The motion pack overrides the older "no gradients" house style for the hero drift only.
