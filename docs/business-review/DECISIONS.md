# Business Review: architectural decisions

Binding for the build packages in WORKPLAN.md. Reasons are given so a builder can judge edge cases. Paths in `code` are the intended new files.

**Research note.** Direct page fetches of developers.google.com, iso.org and ico.org.uk were blocked from this environment (host not allowed). Official facts below come from web search result summaries that quote those official pages, and are marked **(search summary)**. Anything stated from general knowledge without a source is marked **(not verified)**. Nothing legal or regulatory here is advice; items marked "needs Rhys" are in SPEC-GAPS.md.

## 1. How the review runs on Vercel (time limits, jobs, state)

Facts: functions are stateless and may be many instances; `vercel.json` already gives two functions `maxDuration: 120`, so the project allows at least 120 s for some plan; the plan and Fluid compute setting could not be confirmed (not verified). PageSpeed Insights takes roughly 10 to 40 s per URL (not verified).

Decision: **client driven stepper, state in Supabase, no streaming, no queue, no background process.**

- `POST /start` does only cheap, bounded work (validate, Turnstile, rate limit, one safe fetch of the home page for confirmation, insert row). Target under 10 s.
- After the visitor confirms, the page calls `POST /:id/advance` in a loop. Each call takes the row lease (`br_review_lease`, 70 s), runs pending steps in order until about 40 s of work is used (hard stop 55 s), saves evidence after each step, releases and returns the new status. The UI shows each real step as it completes and waits `next_after_ms` between calls. One PageSpeed URL per call at most. `maxDuration` for the review router is 60 (set in `vercel.json`); this fits any plan.
- Why not streaming or one long function: a closed tab or a timeout would lose the run, the progress would not be resumable and a 120 s function is the plan ceiling we cannot verify. Why not a queue (Upstash, QStash, Inngest): a new paid vendor and package, not warranted for a free tool.
- If the visitor closes the tab, the review stays `running` with an expired lease and resumes when they return with the token. A daily sweeper (`/api/business-review/admin/sweep`, optional Vercel cron, once a day is allowed on any plan **(not verified)**) finishes stale reviews and runs `br_purge_expired`. Reviews not resumed within 24 h are marked `ready` with `completeness: partial` and honest `not_tested` rows for unfinished steps.
- State lives only in Postgres (`br_reviews.steps`, `br_evidence`, `br_provider_calls`). Nothing is kept in memory between calls except short lived caches that are safe to lose.
- Step list (order fixed): `site_fetch`, `site_analysis`, `psi_business`, `competitor_discovery`, `competitor_fetch`, `psi_competitors`, `local_search`, `ai_visibility`, `automation_map`, `report_build`. A step is `pending | running | done | skipped | unavailable | failed`. A failed step never blocks later steps; its evidence rows are `unavailable` with a reason code.

## 2. Data store: reuse versus new tables

Reused as they are (no ALTER): `leads` (inbox, workbook already lists it, `leadmk` already converts it), `client_workbooks` (draft project; extra keys on its `data` JSON need no schema change), token pattern of `client_portals` (random token, only sha256 stored), owner RLS expression, `lead_submit` limits as the model for ours.

Why not put reviews in `leads`: it has no place for website, location, evidence, report versions, tokens or status, and its policy and RPC are built for a three field form. Why not in `client_workbooks.data`: a prospect is not yet a client, the owner-only RLS means the public function would need the service role anyway, and evidence must be append only, which a JSON blob cannot enforce.

New tables (exact columns are in `supabase/migrations/20261120120000_business_review.sql`, validated against a PostgreSQL engine locally, not applied):

| Table | Purpose |
|---|---|
| `br_reviews` | one review request: inputs, interpretation, status, steps, lease, token hash and expiry, idempotency key, retention |
| `br_provider_calls` | execution log and cache for every provider call: status, http status, cost estimate, reported model, trimmed response, cache expiry |
| `br_competitors` | candidates with origin (`google_places`, `osm`, `visitor_nominated`, `owner_added`), source reference, collected_at, status, rejection reason, data expiry |
| `br_evidence` | append only measurements, one row per metric per subject per run, with the six allowed states, source, method, exact inputs |
| `br_ai_runs` | one row per question x tool x run, exact question, requested and reported model, exact answer, citations, named flags |
| `br_report_versions` | immutable report JSON per version, hash, evidence ids, approval fields |
| `br_automation_opportunities` | the visitor's task text and the mapped potential workflow |
| `br_prospects` | the lead relationship: link to `leads` and `client_workbooks`, contact, separate consent flags, status, internal notes, needs, recommendations marked for discussion |
| `br_deliveries` | report emails: status, Resend id, held for approval, address cleared after 30 days |
| `br_rate_limits`, `br_budget` | atomic rate counters and daily spend caps (Section 7 and 9) |
| `br_admin_log` | who changed what in the admin API |

Functions: `br_rate_hit`, `br_budget_spend`, `br_review_lease`, `br_purge_expired` (execute for `service_role` only). Triggers lock evidence, report content and completed AI runs against edits and deletes (cascade purge allowed), in the style of `quotes_lock`. "Reports regenerable from stored evidence without changing history" holds because evidence is append only and a regenerate inserts a new `br_report_versions` row that cites evidence ids; the old version stays.

Server access: PostgREST over `fetch` with a service role key held in new variables `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Sensitive, production, and preview if previews should work). No SDK. The publishable key in the repo is never used server side. The service role key must never appear in any file, log or response. (Names to be added by Rhys; not set here.)

Retention proposal (needs Rhys): token and report access 30 days (`BR_TOKEN_DAYS`); anonymous review content deleted 90 days after creation; report email addresses cleared 30 days after creation; prospect rows kept while open, deleted with the review once closed; provider data from Google Places is not kept past 30 days (Section 4).

## 3. Report tokens, expiry and access control

- Token: 32 random bytes (`crypto.randomBytes`), base64url. Only `sha256(token)` is stored (`token_hash bytea unique`), the same approach as `portal_create`. The plain token is returned once in the `/start` response and placed in the report link **fragment**: `/business-review/report#t=<token>`. A fragment is never sent to the server, to logs or in a `Referrer` header; the page reads it and sends it as `Authorization: Bearer <token>` to the API.
- The public reference (`BR-XXXXXXXX`, 8 chars of an unambiguous alphabet) identifies a review in emails and to Rhys. It grants nothing.
- Every review endpoint (except `/start` and `/capabilities`) requires the token. An unknown or wrong token and an unknown id both return the same 404 `not_found` (no enumeration). An expired token returns 410 `expired`. Rhys can revoke or extend (`token_revoked`, `token_expires_at`).
- Pages and APIs involved send `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow, noarchive`, `Referrer-Policy: no-referrer`. The report page also sets `<meta name="robots" content="noindex">` and is added to `vercel.json` headers.
- Rhys reads everything through the owner-only RLS policies, never through the token.
- Contact details are not in the report JSON. The report holds the business facts the visitor typed. The visitor can delete the review (`DELETE /:id`), which clears contact data and sets `cancelled`.

## 4. How the analyzer fetches safely

New `api/_lib/br/safe-fetch.js`, built on `node:https`/`node:http`, `node:dns`, `node:net`, `node:zlib` only.

1. Accept `http` and `https` only; reject credentials in the URL; ports 80 and 443 only; reject empty or oversize URLs (300 chars); use `new URL` so decimal, hex and octal IPv4 forms are normalised before checking; punycode hostnames allowed.
2. Resolve with `dns.lookup(host, {all:true})`; **every** address must be public; classify with `net.BlockList` plus a normaliser that unwraps IPv4 mapped IPv6 in both dotted and hex forms, NAT64, 6to4 and Teredo; block loopback, private, link local (including `169.254.169.254` metadata and `fd00:ec2::254`), CGNAT, multicast, reserved, documentation ranges, `0.0.0.0/8`.
3. **Pin the address**: connect to the validated IP using a custom `lookup` option (and set `servername` and `Host`), so a second DNS answer cannot change where the socket goes (defeats DNS rebinding).
4. Redirects followed manually, at most 4, each hop re-validated (scheme, port, host, resolution, pinning); a redirect from https to http is recorded as a finding and not followed for credentials-bearing requests.
5. Limits: 8 s per request; 40 s total crawl budget; HTML at most 1.5 MB, robots and sitemap at most 500 KiB each; `Accept-Encoding: gzip` with a decompressed output cap (zlib `maxOutputLength`); content type must be `text/html`, `application/xhtml+xml`, `text/plain`, `application/xml` or `text/xml`; abort the socket on overflow.
6. Crawl limits: robots.txt, sitemap.xml, home page, up to 7 further same host pages chosen from the home page navigation (services, about, contact), up to 15 internal link checks with HEAD then GET, at most 25 requests in total, one request at a time with at least 1 s between requests to the same host. User agent `RhysHumeReviewBot/1.0 (+https://www.rhyshume.co.uk/business-review/bot)` and the `/business-review/bot` page explains it and how to block it.
7. robots.txt: fetch first, honour `Disallow` for our agent and `*` for every page we crawl (longest match wins, `Allow` overrides, 4xx means no restrictions, 5xx or timeout means treat as disallow all and record `robots_unavailable`) **(search summary: RFC 9309 says 4xx means unavailable so everything may be fetched; 500 KiB parsing minimum; the 5xx rule was not retrieved, so the conservative choice is ours)**. If robots blocks the home page, the review records `not_tested` with `reason_code: blocked_by_robots` and does not fetch. Crawl-delay is honoured up to 5 s.
8. The same checker validates competitor URLs and any URL given to PageSpeed (Google fetches it, but we do not let the tool be used to probe private names). Competitor sites are crawled with the same limits, but only the home page and robots/sitemap (3 to 4 requests each).
9. Errors map to the closed set `url_not_allowed`, `unresolvable`, `site_unreachable`, `blocked_by_robots`, `too_large`, `bad_content_type`, `timeout`; the response never echoes resolved addresses or internal error text.

## 5. Provider boundary (PSI, discovery, AI visibility)

Every external source sits behind one interface in `api/_lib/br/providers/`:

```
provider = {
  id, kind: 'pagespeed' | 'discovery' | 'ai_search' | 'local_listing' | 'email',
  status() -> { state: 'available' | 'not_configured' | 'disabled' | 'budget_exhausted' | 'degraded', reason, last_ok_at, last_error_code, budget:{used_pence, cap_pence} },
  run(request, ctx) -> { ok:true, data, cost_pence, model_version?, raw_ref } | { ok:false, code, retryable }
}
```

Rules: a provider with no key, a missing flag or a spent budget returns `unavailable` before any network call; `unavailable` becomes an evidence row with `evidence_state: unavailable` and a plain reason; nothing downstream may substitute a value. All calls go through `callProvider()` which (1) checks the flag, (2) checks cache by `request_hash`, (3) spends from the budget atomically (`br_budget_spend`), (4) records the call in `br_provider_calls` with an idempotency key, (5) never retries a call that may have been billed unless the key is the same. Flags and keys are off by default: `BR_PSI`, `BR_DISCOVERY`, `BR_AI_VISIBILITY`, `BR_EMAIL` (`1` to enable) plus the key variables in section 9.

### 5a. PageSpeed Insights (decision: build and enable first, it is the only free provider)

- Endpoint `https://www.googleapis.com/pagespeedonline/v5/runPagespeed`; parameters `url`, `strategy=mobile` (also `desktop`), `category` repeated (`performance`, `seo`, `accessibility`, `best-practices`), `locale=en-GB`, `key` **(not verified from Google's page; from general knowledge and consistent with search results)**.
- Quota **(search summary, third party pages quoting the API's quota; Google's quota page itself was not retrieved)**: with an API key 25,000 queries a day and 400 per 100 seconds, charged to the Google Cloud project; older sources quote per user limits of 60 to 100 per 100 seconds. Without a key calls share an anonymous pool and fail with 429 quickly. **Decision: require a key (`PSI_API_KEY`, restricted to the PageSpeed Insights API in Google Cloud), self limit to 4 calls per review, 3 reviews per hour from one visitor and a global cap of 150 PSI calls a day (`BR_PSI_DAILY_CALLS`). Rhys should read the quota in the Cloud Console before launch.** Terms (Google APIs Terms of Service and the PSI documentation) were not retrieved: needs Rhys.
- Same settings for the business and every competitor: strategy mobile, same categories and locale, run sequentially in one review within a short window, one run each. Store: `lighthouseResult.fetchTime`, `lighthouseVersion`, `requestedUrl`, `finalUrl`, `configSettings` (form factor, throttling), `categories.*.score`, audits `largest-contentful-paint`, `cumulative-layout-shift`, `total-blocking-time`, `first-contentful-paint`, `speed-index`, `server-response-time`, `runWarnings`, and `loadingExperience` (field data) only when returned. Do not store the full 1 MB JSON; store the trimmed object in `br_provider_calls.response`.
- Presentation rules: "lab test run once on <date> using Lighthouse <version>, mobile, simulated throttling"; scores are Lighthouse scores, not Google ranking scores; a single run varies by several points, so differences under 5 points are reported as "similar".
- Cache by normalised URL for 24 h so repeat reviews of the same site do not call again.

### 5b. Competitor discovery (decision: build the boundary, ship disabled, visitor nomination always on)

Options:

| Option | Cost and terms | Fit |
|---|---|---|
| **Google Places API (New) Text Search** with a field mask | Search summary of Google's pricing page: free monthly thresholds per SKU of 10,000 Essentials, 5,000 Pro, 1,000 Enterprise (replacing the old $200 credit on 1 March 2025); Text Search Enterprise listed at about $35 per 1,000 requests after the free 1,000; the highest tier field in the mask prices the whole request; a mask is mandatory. **Website address (`websiteUri`) and rating fields sit in the Enterprise tier (not verified).** About 2 searches per review, so roughly 3 to 7 pence a review beyond the free 1,000 a month. | Best data: name, website, type, address, rating, review count, place id. Needs a Google Cloud billing account. |
| Google Places Nearby Search | Same billing family, no text query | Worse for "electricians serving Glasgow" (service area), geography only |
| OpenStreetMap Nominatim + Overpass | Free; Nominatim public instance absolute maximum 1 request a second, identifying User Agent, no heavy use (search summary of the OSMF policy); Overpass fair use limits **not verified**; ODbL data needs attribution and share-alike obligations **(not verified)** | Coverage of small trades is patchy and `website` tags are often missing. Useful as free geocoding of the town and a weak fallback; not reliable enough to name competitors alone |
| Search engine scraping | Forbidden by terms | Not used |
| Visitor nominates one competitor | Free | Always available; labelled "nominated by you" |

Terms on storing Places results **(search summary of Google Maps Platform service specific terms, 2024 to 2026 versions; the newest wording was not confirmed)**: `place_id` may be stored; latitude and longitude only for up to 30 consecutive days; other content may not be stored beyond transient caching; attribution as the documentation specifies. Decision: store `place_id`, `collected_at` and set `br_competitors.data_expires_at = collected_at + 30 days`; competitor name and website are kept in the review only while the report is live (reports expire at 30 days), then the purge deletes them; each Places-derived comparison shows "Business listing data from Google" attribution (exact wording from the current Places policies, to be checked by WP-A before enabling). This is the main reason discovery stays disabled until Rhys decides (SPEC-GAPS 2).

Selection logic (provider independent, `competitors.js`): query text from category + location kind (local: `"<category> in <town>"`; regional/national: `"<category> <region or UK>"`), keep results whose primary type matches the category map, has a website, is not the visitor's own domain, is not a directory or marketplace, and lies within the radius or region that the category's default implies (never an assumed 5 miles: electrician local 15 miles, precision engineering regional or national by `location_kind` chosen by the visitor and confirmable). Rank by category match then distance, keep at most 3, record the reasons in `relevance`. If fewer than 3 are credible, show fewer. If none, say "no suitable comparison businesses could be identified from a supported source" and continue. The owner can reject, replace and add (admin API); a change regenerates the report as a new version.

### 5c. AI search visibility (decision: boundary plus ONE adapter chosen by Rhys; off by default; admin triggered for the free review)

Supported interfaces **(search summaries; official docs not fetched, exact response schemas not verified)**:

| Provider | Search/grounding tool | Indicative cost | Citations |
|---|---|---|---|
| Anthropic API web search tool | Server tool with `allowed_domains`, `user_location`, `max_uses` (not verified) | $10 per 1,000 searches plus tokens (Anthropic pricing page, search summary) | Yes, in result and citation blocks (not verified in detail) |
| OpenAI Responses API `web_search` | tool with `user_location` (not verified) | $10 per 1,000 calls for the current tool plus tokens; older figures $25 to $50 per 1,000; one request can trigger several searches (search summary, mostly third party) | `url_citation` annotations (not verified) |
| Gemini API Grounding with Google Search | `google_search` tool | Gemini 3 family 5,000 grounded requests a month free then $14 per 1,000 (search summary of ai.google.dev pricing); older models $35 per 1,000 | `groundingMetadata` with sources; display requirements for search suggestions exist, details not verified |
| Perplexity Sonar API | `sonar` models | per request fee by search context size (low, medium, high) plus tokens; figures conflict between sources, check the live page | search results and citations (field names not verified) |

Order of magnitude: one call is about 1 to 5 pence all in. A full assessment of 10 questions x 3 runs x 1 tool is 30 calls, about 30p to £1.50; with 2 tools about £0.60 to £3. These are estimates; Rhys must confirm current prices.

Terms: OpenAI's Terms of Use prohibit automated or programmatic extraction of data or output from the consumer Services except through the API (search summary of the Terms of Use, several versions); Google treats automated queries to Search as spam policy violations and Gemini grounding is not a licence to harvest AI Mode answers (search summary, third party). **Decision: consumer chat interfaces (ChatGPT web, Google AI Mode, Perplexity web, Copilot) are never automated. Only the documented APIs above.** API terms about evaluation and storing outputs were not retrieved: needs Rhys (SPEC-GAPS 3).

Design:

- Question set is deterministic and versioned (`qs-1`): templates by category and location kind generate 8 to 12 customer style questions (for example "Which CNC machining companies can manufacture precision components in Glasgow?"). No model writes the questions, so the set is reproducible and free. The exact text is stored per run.
- Caps enforced in code and in `br_budget`: questions at most 12, runs per question exactly 3 for a full assessment, tools at most 2, so the hard ceiling is 72 calls per review; `BR_AI_MAX_CALLS_PER_REVIEW` default 36; per review cost cap `BR_AI_MAX_PENCE_PER_REVIEW` default 150; global daily cap `BR_AI_DAILY_CAP_PENCE` default **0 (off)**. `br_budget_spend` is called before every call with the worst case cost; refusal marks the run `skipped_budget` and the section reports a partial result. No retry loops: one attempt per planned run; an error is recorded, not repeated.
- The free public review does **not** call AI providers by default. The AI section says "awaiting a supported test". Rhys runs the assessment from the admin view for leads worth it (`POST /admin/reviews/:id/ai-visibility/run`, with `dry_run` showing the cost estimate first). A later decision can enable `BR_AI_PUBLIC=1` with a small cap.
- Record per run: exact question, provider, tool, requested model and the model the response reports (Anthropic `model`, OpenAI response `model`, Gemini `modelVersion`, Perplexity `model`; **field names not verified**), timestamp, location context passed, exact answer text, citations as returned, search queries if returned, `business_named` with basis (`text_match`, `citation_match`, `both`, `none`) from deterministic matching of the business name variants and domain, `competitors_named` from the known candidate list, `sources_provided`.
- Presentation: a grid per question and tool of "named in 1 of 3 runs, sources shown in 3 of 3", with the answers available to read. **No percentage and no single score.** Language: "In 1 of 3 runs on <date> the tool named your business." An answer from a plain language model without search is never accepted as a result: the adapter must report that its search tool was used (citations or search queries present), otherwise the run is stored as `error: no_search_evidence` and excluded.

### 5d. Local search (Section B of the brief)

Nothing public gives a verified Maps ranking, so the first release marks Google Business Profile, ratings, review counts and Maps position `not_tested` (reason `no_supported_source`). If Places is enabled, rating and review count of the business and competitors may be shown as `verified_public_observation` with source and date. Search Console or Business Profile data would be `verified_authenticated_account_data` and only via an owner connection that does not exist yet.

## 6. Idempotency and repeat safety

- `POST /start` carries `Idempotency-Key` (a UUID the page creates when the form first renders). Same key returns the same review (200, `idempotent_replay: true`); unique index on `br_reviews.idempotency_key`.
- A second start with the same `input_hash` (normalised host, name, location, category) from the same `visitor_hash` within 24 h returns the existing review instead of creating one.
- Steps are idempotent: evidence has a partial unique index on (review, subject, metric, run key) while not superseded, so replaying a step upserts; each provider call has a unique `idempotency_key` (`<review>:<step>:<target>:<n>`), so a retried step reuses the logged result rather than spending again; the cache serves identical provider requests within the TTL.
- `advance` is safe to call concurrently: only the lease holder runs; others get 409 `step_in_progress` with `retry_after_ms`.
- Report builds are idempotent on `content_hash`: an unchanged evidence set does not create a new version.
- Emails: unique (review, report version, address hash); Resend is called with an `Idempotency-Key` header and the stored `resend_id` is checked first **(Resend idempotency header support not verified; the unique row is the guard)**.

## 7. Rate limiting (what can really be enforced)

Per instance memory maps do not work across Vercel instances (existing code admits this). Real controls, in order:

1. **Supabase counters** (`br_rate_hit`, atomic upsert, works across instances). Keys use `sha256(salt|ip)` so raw IPs are never stored. Defaults: start 4 per hour and 10 per day per visitor; 3 per day per target website host; email report 3 per review per day; discussion request 3 per hour per visitor; global 150 reviews a day (`BR_DAILY_REVIEWS`). Visitor IP is the first `x-forwarded-for` value (Vercel sets it) **(not verified for this project)**.
2. Turnstile on `start`, `request-report`, `request-discussion` (reuse `antispam.verifyTurnstile`; actions `business-review`, `business-review-mail`, `business-review-discuss`, same site key and secret, hostnames allow list).
3. The token itself throttles `advance` (one lease at a time; at most 40 advance calls per review in total).
4. Daily provider budgets (section 9) are a hard stop for paid abuse.
5. Vercel firewall rate limiting rule on `/api/business-review/start` as defence in depth: **plan and rule availability not verified and settings are not touched here**; listed in WP-F as a recommended manual step.
Honest limits: a determined attacker rotating IPs can still burn the per-day host and global caps (that is what they are for); the system fails closed to "daily limit reached" rather than to unbounded cost. Counter writes add one Supabase round trip per request.

## 8. Admin view and the existing login

- Same identity and session as the workbook: the Supabase magic link session already in the hosted workbook (`CL.session`, `clToken()`).
- Reads: direct PostgREST from the workbook with the owner's access token, under the new owner-read RLS policies (the same way the workbook already reads `leads`). No service key in a browser.
- Mutations (correct competitors, regenerate, approve a report, send a held email, run an AI assessment, extend or revoke a token): `POST /api/business-review/admin/*` with `Authorization: Bearer <supabase access token>`. The server verifies the token by calling `${SUPABASE_URL}/auth/v1/user` and requires `email` equal to `BR_OWNER_EMAIL` (the same address the RLS uses); it then acts with the service role and writes `br_admin_log`. Prospect notes and status use direct PostgREST updates (policy "owner update" on `br_prospects`).
- UI: a new "Business reviews" screen and a "Review" panel in the workbook via an additive build module `tools/workbook-reviews/` (same splice pattern as `tools/workbook-meeting`, run after it, excluded from deploy in `.vercelignore`). No separate CRM.
- Draft project conversion reuses `leadmk`: the review's prospect has a `leads` row, so "Make into a client" already works; the module adds `S.review = { ref, report_version, evidence_snapshot_count, requested_services }` to the draft and writes `br_prospects.workbook_id` and `status = 'draft_project'`. It never creates a quote.
- Metrics (admin API `GET /admin/metrics`): reviews started (rows), completed (`ready`), partial, reports requested (`br_deliveries`), discussion requests (prospects with `follow_up_consent`), projects created (`workbook_id` not null), provider failures last 7 days. No page view, visitor or conversion numbers are invented; anonymous reviews are not leads.

## 9. Cost controls

- Everything paid is off by default and capped per day in pence (`br_budget`), per review, and per provider call count. `GET /capabilities` and `/admin/providers` show spend and state.
- Variables (names only; none are set): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BR_OWNER_EMAIL`, `PSI_API_KEY`, `BR_PSI`, `BR_PSI_DAILY_CALLS`, `GOOGLE_PLACES_API_KEY`, `BR_DISCOVERY`, `BR_PLACES_DAILY_CAP_PENCE`, `ANTHROPIC_API_KEY` (exists; used by the preview builder, **a separate key restricted to this feature is recommended**), `OPENAI_API_KEY`, `GEMINI_API_KEY`, `PERPLEXITY_API_KEY` (only the one chosen), `BR_AI_VISIBILITY`, `BR_AI_DAILY_CAP_PENCE`, `BR_AI_MAX_CALLS_PER_REVIEW`, `BR_AI_MAX_PENCE_PER_REVIEW`, `BR_EMAIL`, `BR_TOKEN_DAYS`, `BR_DAILY_REVIEWS`, `BR_REQUIRE_APPROVAL`, `BR_SALT`.
- Pence costs per call are set in `api/_lib/br/costs.js` from configurable constants with a conservative margin, each labelled with its date and source; the budget uses the worst case.
- No provider call happens in a loop without a counter; every loop has a constant upper bound asserted in tests.
- Cache identical provider requests (PSI 24 h; Places text search 24 h in memory/provider-call cache within terms; AI no cache across reviews because each run is an observation).

## 10. Email delivery and consent

- Reuse Resend REST exactly as `api/contact.js` does (`fetch https://api.resend.com/emails`, `RESEND_API_KEY`, from `CONTACT_FROM` or the default verified domain). A new helper `api/_lib/br/mail.js` (not an edit of `contact.js`).
- Two different consents, never merged: (a) **report delivery**: ticking nothing extra, the visitor types an address and presses "Email me the report": lawful basis for the one email is their request; the address is used only for that and cleared after 30 days; (b) **follow up**: an unticked box "I would like Rhys to contact me about these results" creates the `leads` row and prospect; (c) **marketing**: a third unticked box, default off, stored with consent text version and time, no automatic sending exists. Email delivery uses `purpose = 'report'` enforced by a check constraint.
- The report email contains the link (token in the fragment), a short summary and the sender identity, no tracking pixels, no promotional content. Rhys's notification of a discussion request goes to `CONTACT_TO` like contact enquiries and is itself not marketing.
- No automatic sending to prospects or third parties without approval: `BR_EMAIL` off by default; with `BR_REQUIRE_APPROVAL=1` emailed copies sit in `held_for_approval` until the owner approves a report version. Competitors are never emailed.
- ICO points **(search summaries of ICO pages; not read in full)**: PECR requires consent for electronic marketing to individual subscribers (sole traders and some partnerships) unless the soft opt-in applies (own prospects who negotiated with you, similar products, opt out at collection and in every message); corporate subscribers are outside the consent rule but messages still need sender identity and an opt out; the soft opt-in is for the sender's own contact details collected during a sale or negotiation; UK GDPR still applies and legitimate interests usually underpins soft opt-in; the Data (Use and Access) Act 2025 raised PECR fines to the UK GDPR maximum (£17.5 million or 4% of turnover) and lists direct marketing as a possible legitimate interest. Storage limitation: do not keep data just in case. Contract or legitimate interests as the lawful basis for handling a report request, and retention periods, were not retrieved; the privacy notice update and any soft opt-in reliance need Rhys's decision (SPEC-GAPS 4). The free review does not rely on soft opt-in at all because nothing promotional is sent automatically.

## 11. PDF: what the stack supports

Facts: no package manager, no headless browser on Vercel functions in this repo (a headless Chromium needs `@sparticuz/chromium` or similar, large and a first dependency), and the earlier "hand written PDF writer" used on a different site is **not in this repository** (searched). 

Decision, honest:
- **Committed deliverable: a print optimised report view** (`/business-review/report` with `@media print`, A4, page breaks, headings, tables, evidence footnotes, a "Save as PDF" instruction and a Print button). This works on every device without a server dependency.
- **Optional second step, only after the first release works: a server generated PDF** written by hand with built-in Helvetica (PDF base 14 fonts, WinAnsi encoding, text and rules only, no images, no custom fonts), about 300 lines, no dependencies, tested by parsing the output structure. It would be exposed as `GET /:id/report.pdf` and `capabilities.pdf.state = 'available'`. Until it exists the endpoint returns 501 `pdf_unavailable` and the page shows no PDF button. The brief's rule applies: no pretend PDF.
- Resend can attach a PDF later; the first email carries the link only.

## 12. Recommendation engine and automation mapping

Deterministic, rule based, in `api/_lib/br/recommendations.js` and `automation.js` (no model calls, so free, repeatable, testable). Each rule: input evidence keys, condition, outputs (found, why it may matter, what could change, what to check first, service, tier). Tiers come from a visible table: severity (1 to 3) x confidence (evidence state) with a stated rule, not a score, and never revenue. `issue_type` separates `technical_issue` (clear observation), `commercial_hypothesis` (reasonable inference, labelled as such) and `opportunity`. Automation mapping: keyword and phrase table to eight categories with example workflows from the brief; state "potential workflow, not an existing implementation at your business"; lists integrations needed and approval points; confidence `low` unless several phrases match.

## 13. Public pages and where the logic lives

- Pages stay static HTML with progressive enhancement JS (no framework); `/business-review` needs JS for the live analysis and says so with a contact fallback.
- Router functions: `api/business-review.js` (public) and `api/business-review-admin.js` (admin), reached through rewrites `/api/business-review/:path*` and `/api/business-review/admin/:path*` (admin rewrite first). Two functions plus the existing five stays well under a 12 function ceiling that some plans impose **(not verified)**. Shared code under `api/_lib/br/` (underscore folders are not deployed as routes, as with `_lib`).
- Contract fixtures in `test/fixtures/business-review/` are the shared truth for UI and API tests.

## 14. ISO references (what may be said)

Official ISO pages could not be opened directly; the iso.org results below are search results for iso.org pages (search summaries). Confirmed there:
- **ISO 9001:2026** Quality management systems, Requirements, edition 6, status Published, announced by ISO on 16 September 2026 (iso.org news item `news/2026/09/ISO9001-2026`); replaces ISO 9001:2015. Transition dates quoted by the TC 176 committee page: accreditation bodies ready by 31 March 2027, new certifications to the 2026 edition only from 31 March 2028, existing 2015 certificates to 30 September 2029 (from one committee page; confirm with a certification body before quoting).
- **ISO 9000:2026** Quality management, Fundamentals and vocabulary, edition 5, listed as published in **May 2026** on the iso.org page (not November).
- **ISO 13485:2016** Medical devices, Quality management systems, Requirements for regulatory purposes, edition 3 (2016), the current edition; the English iso.org page was last reviewed and confirmed in 2025 (a French page snapshot showed 2020, treated as stale).
Rhys's belief ("ISO 9000:2026 and ISO 9001:2026 published in Nov 2026") is **only partly confirmed**: both 2026 editions exist and are published, but the iso.org summaries give May 2026 for ISO 9000 and September 2026 for ISO 9001, not November. **Wording rule for the site: name the standards without dates ("ISO 9000, ISO 9001 and ISO 13485"), or state edition years only where re-verified on iso.org on the day of publishing.** Say "familiar with the quality management principles in", never "compliant with", "certified to" or "aligned to". Do not quote or paraphrase standard text. The business and its software are not certified; building a system does not establish regulatory compliance.
