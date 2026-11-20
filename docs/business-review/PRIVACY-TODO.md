# Privacy notice: items awaiting Rhys (WP-E)

`privacy.html` was extended for the free business review (sections 5.0 to 7.0, 9.0, 10.0). It is a draft for your approval. It deliberately does not assert the items below. Nothing here is legal advice and nothing was verified against ICO pages (they could not be fetched).

1. **ICO registration.** Section 12.0 still says "I'm not currently registered with the ICO". Left exactly as it was. Check the ICO self assessment and fee position before the review tool collects more data, then edit or confirm.
2. **Retention periods for review data.** The page says they are "still being finalised". Proposed in DECISIONS 2: report links 30 days, anonymous review data 90 days, report email addresses cleared after 30 days, open prospects kept while open. The page states only the 30 day default for the report link (a design default, `BR_TOKEN_DAYS`). Also confirm `br_purge_expired()` is scheduled, otherwise nothing is deleted.
3. **Lawful basis for the review.** Section 11.0 covers only the existing forms. Decide and word the basis for the review, the report email and the follow up request.
4. **Three consents.** Section 7.0 describes report email, follow up and marketing as separate and unticked. Confirm the final consent text and that the implemented form matches (WP-B).
5. **Hashed IP.** Section 5.0 says requests are counted using a hashed IP address (DECISIONS 7). Confirm against the implemented backend.
6. **Providers.** Named: Supabase, Vercel, Google PageSpeed Insights, Resend, Cloudflare Turnstile. If a business search service (Google Places or OpenStreetMap) or an AI provider is switched on, add it to section 6.0 first. Competitor data from Places has storage limits (SPEC-GAPS 2).
7. **International transfers and processor terms.** Not stated on the page. Check the regions used by Supabase and Vercel and each provider's terms.
8. **Existing gaps not touched.** The notice does not mention Anthropic (the concept builder receives a prospect's public site content), Vercel logs for the existing forms, or Supabase for the workbook and leads. Decide whether to add them.
9. **Competitor information.** Reports can name other businesses with dated, measured facts. Consider a short note on the bot page and the report that this data comes from public sources.
10. **Date.** "Last updated: 20 Nov 2026" was set when drafted. Change it on approval.
