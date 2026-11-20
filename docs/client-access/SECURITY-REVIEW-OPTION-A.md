# Security review: Option A (email the client link)

Reviewed as a hostile reader. Every attack below was run as a unit test (`test/client-link-email.test.js`, stubbed Supabase and Resend, no
real email sent) unless marked "by reading". Option B has its own review in SECURITY-REVIEW.md.

| Attack | Result |
|---|---|
| Call the route with no token, a junk token, or a client token (`app_metadata.role='client'`) | 401 / 401 / 403, nothing sent |
| Valid user who is not the owner | 403, nothing sent |
| Owner lookalikes: `owner+x@`, `o.wner@`, `owner@example.test.evil`, Cyrillic `о`, case and padding | only the exact address (after trim and lower-case) passes; the rest 401/403 |
| Unconfirmed or anonymous Supabase user | 401 |
| Owner address with role client | 403 |
| Owner env var missing, or `CONTACT_TO` with several addresses | fail closed 503, nothing sent |
| Resend key missing | honest 503 `mail_not_configured`; status route reports it; no send |
| Use the route as a general mailer: other link host, http, lookalike host `rhyshume.co.uk.evil.test`, extra path, query, short or non-hex token, trailing newline | all rejected `bad_link` |
| Header or recipient injection: two addresses, newline plus `Bcc:`, over-long address, non-string | all rejected `bad_email` or `bad_request` |
| HTML injection through the business name | escaped in the HTML part; plain text part is text |
| Flooding | 30 s cooldown per address, 5 per address per hour, 20 per hour overall, 429 with `retry_after_s` |
| Provider error detail leaking | response is only `mail_failed`; provider body is discarded |
| Secrets in logs or responses | test captures console and every response: no Resend key, token, link, recipient or bearer value appears |
| CORS | no `Access-Control-*` headers; POST and `application/json` only; body capped at 4 KB; `no-store` |
| Link stored anywhere | browser test: token absent from localStorage, sessionStorage and the workbook data; gone after reload |
| Send without confirming | browser test: the first press only opens a confirm; cancel sends nothing |
| Hosted sign-in weakened | browser test: no offline button, `?offline` ignored; the meeting e2e (69 checks) still passes; workbook diff is 60 insertions and 0 deletions |

**Residual risks**
- The email carries a working private link. Anyone who reads the client's mailbox, or whom the client forwards it to, can open their page
  (the same as Rhys sending it himself). Resend processes the message. The link can be switched off by making a new one.
- A stolen owner session could email links to anyone, but only valid client-page links, only at the rate limits.
- Rate limits are per server instance (see DESIGN.md), so they are a brake, not a quota.
- `CONTACT_TO` is used as the owner identity only when it is a single address. Setting `CLIENT_OWNER_EMAIL` explicitly removes that dependency.
- Not verified: real Resend delivery, deliverability to junk, real Supabase `/auth/v1/user` responses (stubbed), real devices.

**Verdict: SAFE WITH CONDITIONS.** Conditions: (1) `RESEND_API_KEY` set, and `CLIENT_OWNER_EMAIL` set to the owner sign-in email (or `CONTACT_TO` a
single address); (2) send one test email to Rhys's own address first, from the live site, and check it arrives and the link opens; (3) no
migration or service role key is needed for this option.
