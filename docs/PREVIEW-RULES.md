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
