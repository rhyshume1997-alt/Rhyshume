# HANDOFF-C: requests from the demonstration package (WP-C), 20 Nov 2026

Route `/automation-demos` exists (files: `automation-demos/index.html`, `automation-demos.css`, `demo-engine.js`, `demo-scenarios.js`, `demo-ui.js`, `test/br-demos.test.js`). Anchors: `#quote-follow-up`, `#enquiry-to-job`, `#document-approval`.

For E (nav, sitemap, copy):
1. Add `/automation-demos` to `sitemap.xml` (indexable) and to `llms.txt` if real pages are listed there. The page's title is "Automation demonstrations with made up data | Rhys Hume".
2. Add a nav link (suggested label "Automation demos") once nav changes. The page's header and footer are a copy of `automation.html`'s current markup and need the same nav change as every other page. They are mine to edit: tell me or edit this one file in the nav commit.
3. On `automation.html` link to `/automation-demos` and the three anchors (CONTRACT section 12 uses `/automation-demos#quote-follow-up`).
4. The demos page footer shows "Contact page" (link to `/contact`) instead of the phone and email links, and has no call bar, so that the package's own rule (no `mailto:` or `tel:` in any demo file) holds. If E wants the standard footer back, the `no network ... in any demo file` test in `test/br-demos.test.js` must exclude `automation-demos/index.html` for those two patterns.
5. `vercel.json` needs nothing: `cleanUrls` serves `/automation-demos` from `automation-demos/index.html`.

For F: browser tests (Playwright, axe, 390/768/1440) live outside the repo in the session scratch folder (`c-tests/browser.js`); they are not part of `node --test`. They need a static server on the repo root.
