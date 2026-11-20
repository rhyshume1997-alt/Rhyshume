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

## Update after Rhys's review (WP-E)
- Builder B: Rhys wants any required "delivery" checkbox on the report email form removed. Asking for the emailed copy is the request and needs no consent box; only "contact me about these results" and marketing stay optional, unticked and separate. In the `claude/br-b-ui` code that was read, `br-report.js` already sends `report_delivery: true` without a box, so check `index.html` and `report.html` in the merged result. The privacy page (sections 5.0 to 7.0) now describes only that.
- Contact email: the visible Gmail fallback in `api/contact.js` and `form-check.js` is NOT changed. The domain has MX records (Namecheap email forwarding) and SPF for it, and rhys@rhyshume.co.uk is published on every page, but whether the `rhys` alias forwards could not be verified without sending mail. Rhys: send a test email to rhys@rhyshume.co.uk, and if it arrives, the display text change is two lines (plus `test/contact.test.js`, which currently expects the Gmail).
- After merge, verify: `/business-review` and `/automation-demos` (with `#quote-follow-up`, `#enquiry-to-job`, `#document-approval`) return 200; the header button, footer, home, contact and automation links reach them; `node --test` in full; `test/br-site.test.js` link test is then strict.
