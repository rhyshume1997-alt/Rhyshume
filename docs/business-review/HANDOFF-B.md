# Handoff from package B (public review UI), 20 Nov 2026

Files B owns: `business-review/{index,report,bot}.html`, `br.css`, `br-form.js`, `br-report.js`, `br-render.js`, `br-automation.js`, `test/br-ui.test.js`, `test/br-ui-a11y.test.js`, and the browser harness `tools/br-ui-browser/` (mock API and Playwright run, not part of `node --test`, fixtures only).

## Requests to A (backend)
1. **Report link has no review id.** CONTRACT 3.2 gives `report_url: /business-review/report#t=<token>` but every API route needs `/:id`. The UI reads `#t=<token>&id=<uuid>` and falls back to sessionStorage. Please put `&id=<review id>` in `report_url` and in the emailed link, or add a token only route. Without it an emailed link opened in a new browser shows "missing part of its access code".
2. Task chips send these sentences in `automation_task` and `/automation`; please test each maps to a sensible category in `automation.js`: "We spend too long replying to new enquiries", "We send quotes but forget to chase them", "We forget to follow up potential customers", "We spend time updating customers on their jobs", "We copy information into spreadsheets by hand", "We spend hours preparing reports", "We move information between systems by hand", "We manage documents and approvals by email". Source: `BRAutomation.TASKS` in `br-automation.js`.
3. The UI shows the server `message` for errors and branches only on `code`. Non JSON 504 or 408 answers are treated as `timeout`.
4. `report.business.review_date` is read as `YYYY-MM-DD`.
5. Recommendation CTA: the UI picks label and route from `service.key` (websites: "See a free website preview" to `/contact`; seo and ai_visibility: "Explore SEO support" to `/seo-and-ai-visibility`; automation: `/automation`; engineering: `/engineering`; others: "Discuss my results" to `/contact?from=business-review`) and ignores `cta.label`. All routes are on the contract list.

## Requests to E (nav, SEO files, styles)
1. Nav and footer in the three pages are copied from `automation.html` as at 0e4f012. When E changes the nav on all pages, apply the same change to `business-review/index.html`, `report.html`, `bot.html` (they are in the "about 23 files").
2. Sitemap: add `/business-review` and `/business-review/bot` (indexable). Not `/business-review/report` (noindex, header already in `vercel.json`).
3. Home page CTA "See how your business compares" links to `/business-review`.
4. The footer `callbar` in the three pages has `role="navigation"` because axe flags the bare `div` as content outside a landmark on phones. The same fix applies to every page that has the call bar.
5. The privacy page still needs wording for: business details typed into the review, report email address, discussion requests, Turnstile on the review forms (SPEC-GAPS 4).

## Requests to the release owner (F)
- Turnstile hostnames must include the preview and production hosts for the three actions `business-review`, `business-review-mail`, `business-review-discuss` (same site key as the contact form, explicit render mode).
- Add `tools/br-ui-browser` to `.vercelignore` if you do not want the harness deployed (A owns that file).
- Browser run: `PLAYWRIGHT=<playwright path> AXE=<axe.min.js path> SHOTS=<dir> node tools/br-ui-browser/run.js`.

## Decisions taken
- PDF: DECISIONS 11 says print view only. The report page shows "Print or save as PDF" (browser print dialog). A "Download as PDF" button appears only if `/capabilities` returns `pdf.state: available`; it does not today.
- Report page is noindex (meta) and the token stays in the fragment; the entry page and the crawler page are indexable.
- Email copy uses one consent (`report_delivery`). Follow up and marketing are only offered in the separate "Discuss my results" form, both unticked; the request-report body always sends them as false.
- No countdowns, no prices, no savings figures. The automation card always carries the "not an existing implementation" and "no development" statements.

## Update 20 Nov 2026 (consent change requested by Rhys)
- "Email me a copy" no longer has a delivery checkbox. The visitor types an address and presses send; helper text says it is used only to send the report link.
- **A, please drop the requirement:** CONTRACT 3.9 still says `consent.report_delivery` must be `true`. The UI sends `report_delivery: true` as implied by the explicit request, with no checkbox. When A removes the requirement the field can be ignored.
- The email form carries two optional, unticked, never required extras (`follow_up_contact`, `marketing`), sent as false unless ticked. "Discuss my results" keeps follow up as its required box (that form is the follow up request) and marketing optional.
- The UI already reads `#t=<token>&id=<id>` from the amended `report_url` and builds its own links the same way. Merged `claude/br-a-engine` into this branch.
