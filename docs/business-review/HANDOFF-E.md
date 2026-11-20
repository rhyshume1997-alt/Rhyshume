# HANDOFF from WP-E (site copy), 20 Nov 2026

## Routes linked that other packages own
- `/business-review` (WP-B): header button on every page, home hero and sections, contact, SEO page, footer, sitemap, llms.txt.
- `/automation-demos` and anchors `#quote-follow-up`, `#enquiry-to-job`, `#document-approval` (WP-C): nav, footer, home (systems and demos sections), automation page, engineering page (`#document-approval`), sitemap, llms.txt.
- Not linked from nav or sitemap: `/business-review/report`, `/business-review/bot`.

## Exact nav (all pages, 8 links, then the button)
Websites `/websites`, SEO and AI visibility `/seo-and-ai-visibility`, Automation `/automation`, Engineering `/engineering`, Website concepts `/website-concepts/`, Demonstrations `/automation-demos`, About `/about`, Contact `/contact`; button `<a class="btn" href="/business-review">Free business review</a>`. Footer "Contents" list and line "Websites, SEO and AI visibility, automation and business systems, from Glasgow." are identical on all pages (see `test/br-site.test.js`).
For WP-B and WP-C pages: copy the nav, button and footer markup from the merged `automation.html` (class `nav`, `id="site-nav"`). The demos page footer deliberately omits tel: and mailto:, which is fine; if you want the standard footer there, ask WP-C.

## Other notes
- The WORKPLAN asks E to change the visible Gmail fallback in `api/contact.js` and `form-check.js`. The brief overrides: NOT changed, `test/contact.test.js` still expects it. Flagged for Rhys.
- `docs/business-review/PRIVACY-TODO.md` lists privacy items awaiting Rhys.
- `test/br-site.test.js` checks links strictly once `business-review/index.html` and `automation-demos/index.html` exist.
