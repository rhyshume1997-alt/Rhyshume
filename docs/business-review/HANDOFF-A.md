# Handoff from package A (backend analysis engine), 20 Nov 2026

Branch `claude/br-a-engine`. Files owned: `api/business-review.js`, `api/business-review-admin.js`, `api/_lib/br/**`, `test/br-*.js` and `test/fixtures/business-review/`, plus the Phase 0 edits to `vercel.json`, `.vercelignore`, `.env.example`.

## Contract amendments made (all marked in CONTRACT.md)
1. `report_url` and the emailed link are `/business-review/report#t=<token>&id=<review id>` (requested by B).
2. `consent.report_delivery` is optional and defaults to true; only an explicit false is refused (requested for Rhys). `follow_up_contact` and `marketing` stay separate, default false, and nothing promotional is ever sent.
3. Additive admin route `POST /admin/reviews/:id/advance` (the owner's competitor changes re-queue steps and need something to run them).

## Behaviours to know (small readings of the contract)
- `/start` with a site that blocks automated tools (robots.txt) or returns an error does not answer 422 `blocked_by_robots`. It creates the review with `interpretation.website.reachable: false`, a `problem` code and an assumption line, as the "Behaviour" paragraph of 3.2 says; the later analysis records `not_tested` with `blocked_by_robots`. `unresolvable` and `url_not_allowed` are refused as specified.
- `completeness` is `partial` when any core measurement (site read, analysis, speed tests) failed or was unavailable, whatever the reason. Gaps that are by design (no business search source, local search, AI not run, no website, no task) do not make a review partial.
- Report extra fields (clients may ignore them): `approved_at`, `superseded_by_version`, `owner_notes`, `reason_code` and `note` on unmeasured cells, `owner_note` on a recommendation. Admin detail also returns `ai_runs`.
- Competitor discovery step: `unavailable` with reason `not_configured` while Places is off (the nominated competitor is still compared), as in the status fixture.
- `delivery.status` for a first email is `sent` (inline send). `held_for_approval` only when `BR_REQUIRE_APPROVAL=1`.

## Requests to the architect (schema)
- Held report emails need the review access token at release time, but only its hash is stored. Package A seals the token (AES-256-GCM, key derived from `BR_SALT`) into `br_reviews.inputs.sealed_links[<delivery id>]` only while an email is held, and deletes it after sending. A dedicated column on `br_deliveries` (for example `link_sealed text`) would be cleaner; no migration was changed.
- `leads` is written with columns `name, business, email, phone, message, picks, consent` through the service role (as the workbook's `leadmk` expects). Please confirm no other NOT NULL column was added to `leads` in the live project.
- `br_purge_expired` only runs from the daily sweep. `vercel.json` now has a daily cron (03:17 UTC) calling `/api/business-review-admin?route=sweep`; it only works once `CRON_SECRET` is set in the Vercel environment (Vercel sends it as the Bearer token).

## Requests to F (release owner)
- Variables the code reads (all in `.env.example`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BR_OWNER_EMAIL`, `BR_SALT` (required, 24+ random characters; shorter or unset makes the review service refuse to run), `BR_TOKEN_DAYS`, `BR_DAILY_REVIEWS`, `BR_REQUIRE_APPROVAL`, `BR_PSI`, `PSI_API_KEY`, `BR_PSI_DAILY_CALLS`, `BR_DISCOVERY`, `GOOGLE_PLACES_API_KEY`, `BR_PLACES_DAILY_CAP_PENCE`, `BR_AI_VISIBILITY`, `BR_AI_PUBLIC`, `BR_AI_DAILY_CAP_PENCE`, `BR_AI_MAX_CALLS_PER_REVIEW`, `BR_AI_MAX_PENCE_PER_REVIEW`, `BR_EMAIL`, `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM`, `TURNSTILE_SECRET_KEY`, `CRON_SECRET`, `BR_SITE_ORIGIN` (optional, defaults to https://www.rhyshume.co.uk). `OPENAI_API_KEY`, `GEMINI_API_KEY`, `PERPLEXITY_API_KEY` are listed but no adapter reads them yet.
- Defaults: PageSpeed runs only when `PSI_API_KEY` exists (kill switch `BR_PSI=0`; daily cap 150 calls); Places, AI visibility and emailing are off; AI daily cap is 0 pence. `BR_EMAIL=1` plus `RESEND_API_KEY` are both needed before any report email is sent. The discussion notification to `CONTACT_TO` needs only `RESEND_API_KEY` and `CONTACT_TO` (it goes to the owner, not a prospect).
- Turnstile actions checked: `business-review`, `business-review-mail`, `business-review-discuss`; hostnames `rhyshume.co.uk` and `www.rhyshume.co.uk` (preview hosts are refused until the list is extended in `api/_lib/br/config.js`, which A owns).
- Not built, deliberately: any real AI search adapter (only the interface, caps, recorder and the not-configured adapter), a PDF (`report.pdf` answers 501), Places attribution wording beyond the contract string "Business listing data: Google" (Google's current wording and storage terms were not verified).
- Not verified from official sources: PageSpeed Insights quota and terms, Places terms, Resend idempotency header support (the unique delivery row is the real guard).
