# Privacy notice: items awaiting Rhys (WP-E)

`privacy.html` sections 5.0 to 7.0, 9.0 and 10.0 describe only what the form collects, the providers named in the code, that a requested report goes to the address given for that purpose, and that follow up contact and marketing are separate, optional and unticked. Nothing else is asserted. Nothing here is legal advice, and no ICO or other guidance was read (ICO pages could not be fetched).

Deliberately NOT on the page until confirmed and implemented and tested:

1. **ICO registration.** Section 12.0 keeps the existing sentence word for word ("I'm not currently registered with the ICO"). Check the ICO self assessment and fee position, then confirm or change it.
2. **Retention periods and automated deletion.** Proposed in DECISIONS 2 (report links 30 days, anonymous review data 90 days, report email addresses cleared after 30 days). The page states none of them, and does not claim the visitor can delete a review. Needs: approved periods, the daily sweep (`br_purge_expired`) scheduled, a tested delete route in the UI. Then add a retention sentence to section 10.0.
3. **Report link expiry.** The engine defaults to 30 days (`BR_TOKEN_DAYS`), but this is not stated on the page until verified end to end.
4. **IP address handling.** The code is designed to count requests with hashed IP keys. Not stated on the page until checked against the final backend. Cloudflare Turnstile sees the IP address (stated for the existing forms in section 3.0).
5. **Lawful basis for the review tool, the report email and the follow up.** Section 11.0 covers only the existing forms. Decide and word it.
6. **Compliance wording.** No UK GDPR or PECR statement appears on the page. Do not add one until reviewed against current ICO guidance.
7. **Consents.** The report email needs no extra consent box (asking for the copy is the request). Only "contact me about these results" and "marketing" are optional, unticked and separate. Confirm the final wording matches the UI (WP-B). Confirm that no marketing is ever sent automatically; the page does not say so.
8. **Providers.** Named: Supabase, Vercel, Google PageSpeed Insights, Resend, Cloudflare Turnstile. If Google Places, OpenStreetMap lookups or an AI provider are switched on, add them to section 6.0 first, with their data storage limits.
9. **International transfers, processor terms, Supabase and Vercel regions.** Not stated.
10. **Existing gaps not touched.** The notice does not mention Anthropic (the concept builder receives a prospect's public site content), Vercel logs for the existing forms, or Supabase for the workbook and leads.
11. **Competitor information.** Reports can name other businesses with dated, measured facts. Consider a note that this comes from public sources.
12. **Date.** "Last updated: 20 Nov 2026" was set when drafted. Change on approval.
