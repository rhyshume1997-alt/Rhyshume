# Business Review: JSON API contract v1

Server (WP-A) and clients (WP-B public UI, WP-D admin and workbook) code to this file. Changes need the architect's sign-off and a bump of `contract_version`. Examples are illustrative fixtures (clearly fictional businesses); WP-A turns them into `test/fixtures/business-review/*.json` before anything else.

## 0. Conventions

- Base path `/api/business-review`. Admin base `/api/business-review/admin`. Rewrites route both to the two router functions.
- JSON in and out, UTF-8, `Content-Type: application/json; charset=utf-8` required on requests with a body (else 415 `unsupported_media_type`). Body limit 32 KB (413 `payload_too_large`). Unknown request fields are ignored; unknown fields in responses must be ignored by clients.
- All responses carry `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow, noarchive`, `Referrer-Policy: no-referrer`.
- Success: `{ "ok": true, "contract_version": "1.0", ...payload }`. Failure: `{ "ok": false, "contract_version": "1.0", "error": { "code", "message", "field"?, "fields"?, "retry_after_s"? } }`. `message` is plain English fit to show a visitor, never internal detail.
- Times are ISO 8601 UTC with `Z`. Ids are UUID v4 strings. `ref` looks like `BR-7K2M9QX4` (alphabet `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`).
- Review access token (`Authorization: Bearer <token>`): 43 character base64url. Never in a URL path or query. Missing, wrong, or for another review: 404 `not_found`.
- Turnstile: field `turnstile_token` in the body, one token per request, action names listed per route.
- Rate limits answer 429 with `error.code: "rate_limited"` and `retry_after_s`. A closed daily cap answers 503 `daily_limit`.

## 1. Enumerations (exact strings)

```
evidence_state:  verified_public_observation | verified_authenticated_account_data | customer_supplied | reasonable_inference | not_tested | unavailable
  display labels: "Verified public observation" | "Verified authenticated account data" | "Customer supplied information" | "Reasonable inference" | "Not tested" | "Unavailable"
review.status:   awaiting_confirmation | queued | running | ready | failed | expired | cancelled
completeness:    pending | complete | partial
assessment_level: reduced (no website) | standard | full (standard plus an AI visibility assessment run by the owner)
step.key:        site_fetch | site_analysis | psi_business | competitor_discovery | competitor_fetch | psi_competitors | local_search | ai_visibility | automation_map | report_build
step.state:      pending | running | done | skipped | unavailable | failed
provider.id:     own_fetch | pagespeed | google_places | osm | ai_anthropic | ai_openai | ai_gemini | ai_perplexity | resend | turnstile
provider.state:  available | not_configured | disabled | budget_exhausted | degraded
goal:            more_enquiries | google_visibility | ai_search_visibility | improve_website | automate_admin | quoting_followups | something_else
location_kind:   local | regional | national
competitor.origin: google_places | osm | visitor_nominated | owner_added
competitor.status: candidate | selected | rejected
issue_type:      technical_issue | commercial_hypothesis | opportunity
tier:            high | medium | low
service.key:     websites | seo | ai_visibility | automation | engineering | care_plan | none
automation.category_key: enquiry_management | quote_follow_up | customer_updates | data_entry_copying | reporting | system_sync | document_approvals | other
delivery.status: queued | held_for_approval | sent | failed | cancelled
prospect.status: new | in_discussion | draft_project | closed
```

Error codes (HTTP): `validation_failed` 400 (with `fields: {name: message}`), `bad_json` 400, `unsupported_media_type` 415, `payload_too_large` 413, `turnstile_failed` 403, `turnstile_unavailable` 503, `rate_limited` 429, `daily_limit` 503, `url_not_allowed` 400 (with `error.reason`: `bad_scheme | bad_port | credentials | private_address | not_a_website | too_long`), `unresolvable` 422, `site_unreachable` 422, `blocked_by_robots` 422 (only from `/start`'s probe; later it becomes evidence), `not_found` 404, `expired` 410, `step_in_progress` 409 (with `retry_after_ms` in `error`), `wrong_state` 409, `consent_required` 400, `provider_unavailable` 503, `budget_exhausted` 503, `delivery_not_configured` 503, `delivery_failed` 502, `pdf_unavailable` 501, `unauthenticated` 401, `forbidden` 403, `conflict` 409, `internal` 500. Clients branch on `code`, never on `message`.

## 2. Review state machine

```
            POST /start
                 v
       awaiting_confirmation --(POST /:id/confirm)--> queued --(first POST /:id/advance)--> running
                 |                                         |                                   |
                 | (token expiry)                          |                                   +--(all steps terminal)--> ready (completeness complete|partial)
                 v                                         |                                   +--(start-up or unrecoverable error)--> failed
              expired <------------------------------------+-----(token expiry, any non-terminal)
  any state --(DELETE /:id)--> cancelled          ready --(owner regenerate / AI run / nominate)--> ready (new report version)
```

- `ready` means every step is terminal (`done`, `skipped`, `unavailable` or `failed`). `completeness: complete` if no step is `failed` or `unavailable` for a reason other than "not configured by design"; otherwise `partial`.
- `failed` only when no report could be built at all (for example the database is unreachable). A failed step alone gives `ready` + `partial`.
- `advance` on `awaiting_confirmation` is `wrong_state` 409. On `ready` it is a no-op returning the status. `confirm` on anything but `awaiting_confirmation` is `wrong_state` (but replaying the same confirm with the same body returns 200, idempotent).
- Step order is fixed (section 1). Steps with no website are `skipped` with reason `no_website`: `site_fetch`, `site_analysis`, `psi_business`. `ai_visibility` is `unavailable` with reason `not_run_in_free_review` unless the owner has run it. `local_search` is `unavailable` with reason `no_supported_source` unless a provider supplies it.

## 3. Public routes

### 3.1 GET /capabilities
No auth. Response:
```json
{ "ok": true, "contract_version": "1.0",
  "capabilities": {
    "site_analysis": { "state": "available" },
    "pagespeed": { "state": "available" },
    "competitor_discovery": { "state": "not_configured", "note": "No supported business search source is switched on. You can name one competitor yourself." },
    "ai_visibility": { "state": "disabled", "note": "Awaiting a supported test." },
    "email_delivery": { "state": "available" },
    "pdf": { "state": "disabled", "note": "Use the print view." }
  },
  "limits": { "max_competitors": 3, "token_days": 30 } }
```
`state` uses `provider.state`. The page uses it only to adjust wording, never to fake data.

### 3.2 POST /start
Headers: `Idempotency-Key: <uuid>` (required). Body:
```json
{ "business_name": "Harbour Precision Ltd",
  "website": "harbourprecision.example",
  "location": { "text": "Glasgow", "kind": "regional" },
  "category": "CNC machining",
  "goals": ["more_enquiries", "quoting_followups"],
  "turnstile_token": "<token>" }
```
Rules: `business_name` 1 to 160 chars; `website` optional, up to 300 chars, scheme optional (https assumed), validated by the safe URL rules (no IP literals, ports, credentials, local names); `location.text` 1 to 160; `kind` default `local`; `category` 1 to 120; `goals` 0 to 7 from the enum; no email or phone is accepted here. Turnstile action `business-review`.

Behaviour: validates, rate limits, probes the home page once (title, h1, JSON-LD name, final URL, robots allow check), inserts the review as `awaiting_confirmation`, creates the token. If the site cannot be read, the review is still created with `interpretation.website.reachable: false` and the visitor may continue (the analysis will record `unavailable`), except `url_not_allowed` and `unresolvable` which are refused.

201 (200 with `"idempotent_replay": true` for a repeated key or a repeated identical start by the same visitor within 24 h; token is only returned on 201 and not on replay, so replays return `access_token: null` and the client keeps the one it stored):
```json
{ "ok": true, "contract_version": "1.0", "idempotent_replay": false,
  "review": { "id": "6c9b8e2a-6a77-4c0a-9a41-1d2f7b0d3f10", "ref": "BR-7K2M9QX4", "status": "awaiting_confirmation",
              "completeness": "pending", "assessment_level": "standard", "created_at": "2026-11-20T10:15:02Z", "expires_at": "2026-12-20T10:15:02Z" },
  "interpretation": {
    "business_name": "Harbour Precision Ltd",
    "website": { "input": "harbourprecision.example", "url": "https://harbourprecision.example/", "reachable": true, "title": "Harbour Precision | CNC machining Glasgow", "detected_business_name": "Harbour Precision" },
    "location": { "text": "Glasgow", "kind": "regional" },
    "category": "CNC machining",
    "competition_scope_note": "Regional: businesses serving the Glasgow area. You can change this to national or local below.",
    "assumptions": ["Comparison businesses will be chosen from a supported source where one is available."] },
  "access_token": "q3Zk1m0uQ2r1Gx3d7Hh5mY2uJ4sV9bTf8LwEoPaNcXg",
  "report_url": "/business-review/report#t=q3Zk1m0uQ2r1Gx3d7Hh5mY2uJ4sV9bTf8LwEoPaNcXg" }
```
Errors: `validation_failed`, `url_not_allowed`, `unresolvable`, `turnstile_failed|unavailable`, `rate_limited`, `daily_limit`, `unsupported_media_type`.

### 3.3 POST /:id/confirm
Bearer. Body (all optional except `confirmed`):
```json
{ "confirmed": true,
  "edits": { "business_name": "Harbour Precision", "location": { "text": "Glasgow", "kind": "national" }, "category": "CNC machining", "website": "https://www.harbourprecision.example/" },
  "competitor_nomination": { "name": "Clyde Components", "website": "https://clydecomponents.example" },
  "automation_task": "We send quotes but forget to chase them" }
```
`confirmed` must be `true`. `edits` replace the stored interpretation (validated like start; a changed website is re-validated). `competitor_nomination` at most one, website required, validated and counted as `visitor_nominated`. `automation_task` up to 600 chars. Response 200: the status object (3.4) with `status: "queued"`. Replays with identical body return 200.

### 3.4 GET /:id
Bearer. Status for polling and display, no evidence:
```json
{ "ok": true, "contract_version": "1.0",
  "review": { "id": "6c9b8e2a-6a77-4c0a-9a41-1d2f7b0d3f10", "ref": "BR-7K2M9QX4", "status": "running", "completeness": "pending",
              "assessment_level": "standard", "created_at": "2026-11-20T10:15:02Z", "expires_at": "2026-12-20T10:15:02Z", "confirmed_at": "2026-11-20T10:16:10Z", "completed_at": null,
              "business_name": "Harbour Precision Ltd", "website_url": "https://harbourprecision.example/", "location": { "text": "Glasgow", "kind": "regional" }, "category": "CNC machining", "goals": ["more_enquiries"] },
  "steps": [
    { "key": "site_fetch", "label": "Reading your website", "state": "done", "started_at": "2026-11-20T10:16:11Z", "finished_at": "2026-11-20T10:16:19Z", "reason": null, "message": "Read 6 pages." },
    { "key": "site_analysis", "label": "Checking titles, headings and structure", "state": "done", "started_at": "...", "finished_at": "...", "reason": null, "message": "" },
    { "key": "psi_business", "label": "Running a mobile speed test on your site", "state": "running", "started_at": "2026-11-20T10:16:30Z", "finished_at": null, "reason": null, "message": "" },
    { "key": "competitor_discovery", "label": "Finding comparison businesses", "state": "pending", "started_at": null, "finished_at": null, "reason": null, "message": "" },
    { "key": "ai_visibility", "label": "AI search visibility", "state": "unavailable", "started_at": null, "finished_at": null, "reason": "not_run_in_free_review", "message": "Awaiting a supported test." }
  ],
  "next_after_ms": 1500,
  "report_available": false, "report_version": null,
  "competitors": [ ],
  "delivery": { "email_requested": false, "status": null },
  "discussion": { "requested": false } }
```
`label` strings are fixed by the server per step key (WP-A owns text; WP-B must render what it gets). `reason` is a machine code or null; `message` plain English or empty. `report_available` becomes true after `report_build` produced a version. `next_after_ms` hints polling delay (0 when terminal).

### 3.5 POST /:id/advance
Bearer. Empty body (`{}`). Takes the lease, runs steps for up to about 40 s, saves evidence per step. Response: same as 3.4 plus `"ran": ["site_fetch","site_analysis"]` (steps that finished in this call). `409 step_in_progress` if another call holds the lease (`error.retry_after_ms`). `409 wrong_state` if not `queued` or `running` (a `ready` review returns 200 no-op). Clients loop: call, render steps, wait `next_after_ms`, repeat until `status` is `ready`, `failed`, `expired` or `cancelled`. At most 40 advance calls per review; more returns `rate_limited`.

### 3.6 GET /:id/report[?version=n]
Bearer. 200 with the report object (section 9) for the latest version (or the given one). If no version exists yet the answer is 409 `wrong_state`. The report is shown on screen as soon as it exists; it is an automated review until the owner approves or revises it (`report.status`).

### 3.7 POST /:id/competitors
Bearer. Visitor nominates one competitor after the review or changes their nomination (only while `visitor_nominated` count is 0 or replacing it). Body `{ "name": "Clyde Components", "website": "https://clydecomponents.example" }`. Marks `competitor_fetch`, `psi_competitors`, `report_build` as `pending` again, status becomes `queued`. 200 status object. Rate counted (2 per review).

### 3.8 POST /:id/automation
Bearer. Body `{ "task": "We send quotes but forget to chase them" }` (1 to 600 chars). Response 200 `{ "ok": true, "automation_opportunity": <section 12>, "report_version": 2 }` (adds the opportunity and creates a new report version). Works at any time up to expiry, no provider call.

### 3.9 POST /:id/request-report
Bearer. Turnstile action `business-review-mail`. Body:
```json
{ "email": "owner@harbourprecision.example", "name": "Alex",
  "consent": { "report_delivery": true, "follow_up_contact": false, "marketing": false },
  "turnstile_token": "<token>" }
```
`consent.report_delivery` must be `true` (400 `consent_required`). `follow_up_contact` and `marketing` default false and are separate. Email validated (regex plus length 200, no CR/LF). 202:
```json
{ "ok": true, "contract_version": "1.0", "delivery": { "id": "d3b2...", "status": "queued", "to_masked": "o***@harbourprecision.example" }, "idempotent_replay": false }
```
`status` is `held_for_approval` when the owner holds emails, `sent` when sent inline, `queued` if the send was deferred, `failed` with `delivery_failed` 502 if Resend rejects. Same address and same report version replays return the existing delivery. If `follow_up_contact` is true a prospect and a `leads` row are also created (3.10 rules). Needs `BR_EMAIL` on, else 503 `delivery_not_configured`. 3 per review per day.

### 3.10 POST /:id/request-discussion
Bearer. Turnstile action `business-review-discuss`. Body:
```json
{ "name": "Alex Reid", "email": "owner@harbourprecision.example", "phone": "07700 900123",
  "message": "Interested in the quote follow up idea.",
  "service_interest": ["automation", "seo"],
  "consent": { "follow_up_contact": true, "marketing": false },
  "turnstile_token": "<token>" }
```
`consent.follow_up_contact` must be true. `service_interest` from `service.key` (not `none`). Creates or updates `br_prospects` and inserts one `leads` row (name, business, email, phone, message with the review reference prefix, `picks` `{}`, `consent` true) so the workbook lists it; emails `CONTACT_TO` a notification through Resend (subject `New business review discussion request BR-7K2M9QX4`). 201 `{ "ok": true, "reference": "BR-7K2M9QX4", "discussion": { "requested": true } }`. Idempotent per review: a second call updates the same prospect and does not add a second `leads` row.

### 3.11 GET /:id/report.pdf
Bearer. 501 `pdf_unavailable` until `capabilities.pdf.state` is `available`; then `application/pdf`, `Content-Disposition: attachment; filename="business-review-BR-7K2M9QX4.pdf"`.

### 3.12 DELETE /:id
Bearer. Clears contact data (`br_deliveries.to_email`, prospect contact fields, linked `leads` row only if not yet handled), sets `status: cancelled`, revokes the token. 200 `{ "ok": true }`. Idempotent.

## 4. Admin routes (`/api/business-review/admin/...`)

Auth: `Authorization: Bearer <Supabase access token of the owner>`. Server calls `${SUPABASE_URL}/auth/v1/user` and requires `email === BR_OWNER_EMAIL`. 401 `unauthenticated` (no or invalid token), 403 `forbidden` (valid token, other person). All mutations write `br_admin_log`. Reads of lists and rows also work directly from the workbook through RLS; the admin API exists for what needs the service role.

| Method and path | Body | Result |
|---|---|---|
| GET `/admin/reviews?status=&q=&limit=50&cursor=` | | `{ reviews: [adminReview], next_cursor }` (adminReview = status object plus `prospect` summary, `ai_visibility_state`, `provider_failures: n`, `incomplete: bool`) |
| GET `/admin/reviews/:id` | | `{ review, steps, competitors: [competitor], evidence: [evidence], reports: [{version, status, created_at, reason, created_by, approved_at}], deliveries: [...], prospect, provider_calls: [...] }` |
| GET `/admin/metrics?days=30` | | section 11 |
| GET `/admin/providers` | | `{ providers: [providerStatus] }` section 10 |
| POST `/admin/reviews/:id/competitors` | `{ action: "select"\|"reject"\|"add"\|"edit", competitor_id?, name?, website?, reason? }` | 200 `{ competitors, review_status: "queued" }` and the review re-queues the needed steps; a new report version follows with `reason: competitors_changed` |
| POST `/admin/reviews/:id/regenerate` | `{ reason }` | 200 `{ report_version }` (new version from stored evidence only, no provider calls) |
| POST `/admin/reviews/:id/reports/:version/approve` | `{ note? }` | 200; sets `approved_at`; releases `held_for_approval` deliveries when the owner then calls send |
| POST `/admin/reviews/:id/reports/:version/revise` | `{ overrides: { recommendations: [{key, hide?: true, owner_note?}], finding_notes?: [...] }, reason }` | 201 `{ report_version }` a new owner authored version (content never edited in place) |
| POST `/admin/reviews/:id/deliveries/:deliveryId/send` | | 200 `{ delivery }` sends a held email (409 `wrong_state` if not held) |
| POST `/admin/reviews/:id/ai-visibility/run` | `{ tools: ["ai_anthropic"], runs: 3, question_ids?: [...], dry_run: true }` | `dry_run: true` returns `{ plan: { questions: n, runs: n, tools: n, calls: n, estimate_pence: {low, high}, within_caps: bool, cap_reasons: [] } }` and spends nothing; `dry_run: false` executes (up to the per call time budget per request; returns progress and `remaining_calls`, call repeatedly) |
| POST `/admin/reviews/:id/token` | `{ action: "extend"\|"revoke", days? }` | 200 `{ expires_at }` |
| POST `/admin/reviews/:id/link-workbook` | `{ workbook_id }` | 200; sets `br_prospects.workbook_id`, `status: draft_project` (called by the workbook module after it creates the draft client) |
| POST `/admin/sweep` | | cron entry: finishes stale reviews, runs `br_purge_expired`, returns counts; accepts the Vercel cron `Authorization: Bearer ${CRON_SECRET}` or the owner token |

## 5. Evidence record

Returned by admin routes and embedded (trimmed) in the report `evidence_index`. Identical shape everywhere.
```json
{ "id": "0e1d7e3c-4d2c-4b33-8d6f-5d4b6b1a9a10",
  "review_id": "6c9b8e2a-6a77-4c0a-9a41-1d2f7b0d3f10",
  "subject": { "kind": "business" },
  "category": "technical",
  "metric_key": "psi.mobile.lcp_ms",
  "label": "Largest Contentful Paint (mobile lab test)",
  "evidence_state": "verified_public_observation",
  "reason_code": null,
  "value": { "type": "number", "v": 3820, "unit": "ms" },
  "observed_at": "2026-11-20T10:16:52Z",
  "source": { "kind": "pagespeed_insights", "name": "Google PageSpeed Insights API v5 (Lighthouse 12.x)", "url": "https://harbourprecision.example/", "provider_call_id": "b7c2..." },
  "method": { "summary": "Lighthouse lab test, mobile, simulated throttling, run once", "settings": { "strategy": "mobile", "categories": ["performance","seo","accessibility","best-practices"], "locale": "en-GB", "lighthouse_version": "12.x", "form_factor": "mobile" } },
  "inputs": { "requested_url": "https://harbourprecision.example/", "final_url": "https://www.harbourprecision.example/" },
  "what_it_means": "How long the main content took to appear on a simulated mid range phone. Google suggests 2.5 seconds or less as good.",
  "limitations": ["Single lab run; results vary between runs.", "Lab data, not what real visitors experienced."],
  "run_key": "main", "superseded_by": null, "created_at": "2026-11-20T10:16:52Z" }
```
Rules:
- `subject`: `{ "kind": "business" }` or `{ "kind": "competitor", "competitor_id": "<uuid>" }`.
- `category`: `technical | local | ai_visibility | customer_supplied | automation`.
- `value` is `{ "type": "boolean"|"number"|"string"|"list"|"object", "v": ..., "unit"?: ... }`, and is `null` exactly when `evidence_state` is `not_tested` or `unavailable`; then `reason_code` is required (for example `blocked_by_robots`, `no_supported_source`, `not_configured`, `site_unreachable`, `timeout`, `budget_exhausted`, `not_run_in_free_review`, `no_website`).
- `customer_supplied` for what the visitor typed (business name, stated goals, automation task). `reasonable_inference` for heuristics (service page coverage guess, category match); the `limitations` must say it is an inference. `verified_authenticated_account_data` is reserved for owner connected sources and is not produced in the first release.
- Metric keys (initial set, WP-A may add keys only by extending `api/_lib/br/metrics.js` and this list): `https.enabled`, `https.http_redirects_to_https`, `page.status`, `page.response_ms`, `robots.present`, `robots.blocks_crawl`, `sitemap.present`, `sitemap.url_count`, `page.title.present`, `page.title.length`, `page.meta_description.present`, `page.meta_description.length`, `page.h1.count`, `page.heading_order.valid`, `page.canonical.present`, `page.canonical.self`, `page.viewport.present`, `structured_data.present`, `structured_data.types`, `structured_data.json_ld_parses`, `nav.internal_links.count`, `links.checked.count`, `links.broken.count`, `content.service_pages.estimate` (inference), `contact.route.present`, `contact.route.kinds`, `psi.mobile.performance_score`, `psi.mobile.seo_score`, `psi.mobile.accessibility_score`, `psi.mobile.best_practices_score`, `psi.mobile.lcp_ms`, `psi.mobile.cls`, `psi.mobile.tbt_ms`, `psi.mobile.fcp_ms`, `psi.mobile.speed_index_ms`, `psi.field.available`, `local.gbp.profile`, `local.maps_position`, `local.rating`, `local.review_count`, `ai.visibility.summary`, `customer.goals`, `customer.automation_task`.

## 6. Competitor candidate

```json
{ "id": "5a0c...", "review_id": "6c9b...", "name": "Clyde Components Ltd", "website_url": "https://clydecomponents.example/",
  "website_host": "clydecomponents.example", "origin": "visitor_nominated", "source_ref": null,
  "collected_at": "2026-11-20T10:16:10Z", "status": "selected",
  "relevance": { "basis": ["nominated_by_visitor"], "category_match": null, "distance_km": null, "note": "Named by you. Relevance not checked by a supported source." },
  "rejected_reason": null, "reviewed_by_owner": false, "position": 1,
  "attribution": null, "data_expires_at": null }
```
For `google_places` the object also has `"attribution": "Business listing data: Google"` (exact required wording to be taken from Google's current policy by WP-A) and `data_expires_at` 30 days after `collected_at`; `relevance.basis` can contain `category_match`, `serves_area`, `has_website`, `not_directory`; `relevance.distance_km` number or null. A candidate is shown to the visitor only when `status: selected`. `rejected` ones are visible to the owner only.

## 7. AI visibility run

```json
{ "id": "8f71...", "review_id": "6c9b...", "question_id": "q3", "question_set": "qs-1",
  "question_text": "Which CNC machining companies can manufacture precision components in Glasgow?",
  "provider": "ai_anthropic", "tool": "web_search", "model_requested": "<configured model id>", "model_reported": "<model id from the response>",
  "run_index": 2, "ran_at": "2026-11-20T11:02:44Z", "location_context": "Glasgow, United Kingdom",
  "status": "ok", "error_code": null,
  "answer_text": "<exact answer as returned>",
  "citations": [ { "url": "https://example.com/page", "title": "Page title" } ],
  "search_queries": ["cnc machining glasgow precision"],
  "business_named": false, "business_named_basis": "none",
  "competitors_named": ["Clyde Components"], "sources_provided": true, "cost_pence": 2.4 }
```
The report summary for a question and tool is `{ question_id, question_text, provider, tool, runs_total: 3, runs_ok: 3, business_named_in_runs: 1, sources_in_runs: 3, competitors_named: [{name, in_runs}], run_ids: [...] }`. Never a percentage. `status` values: `planned | running | ok | error | unavailable | skipped_budget`. `error_code` includes `no_search_evidence`.

## 8. Recommendation

```json
{ "id": "rec-psi-lcp", "key": "slow_mobile_loading", "title": "Your home page was slow to show its main content on the mobile test",
  "issue_type": "technical_issue",
  "found": "Largest Contentful Paint was 3.8 s in the mobile test recorded on 20 Nov 2026.",
  "evidence_ids": ["0e1d..."],
  "why_it_may_matter": "Slow pages can frustrate visitors and Google lists page experience as one signal among many. We cannot say how much it affects your enquiries.",
  "what_could_change": "Compress and resize images, reduce render blocking scripts, review hosting.",
  "check_before_implementation": ["Confirm with a second test and real visitor data if you have it.", "Check what your current platform allows."],
  "service": { "key": "websites", "label": "Website development and redesign", "cta": { "label": "Discuss my results", "href": "/contact?from=business-review" } },
  "priority": { "rank": 1, "tier": "high", "basis": { "severity": 2, "confidence": "high", "effort": "medium", "rule": "Measured issue on the home page, confirmed by Lighthouse; effort depends on the platform." } },
  "caveats": ["Lighthouse scores are not Google ranking scores."] }
```
`priority.rank` is 1..n unique within a report. No revenue fields exist. `issue_type: commercial_hypothesis` must have `evidence_ids` with only `reasonable_inference` or `customer_supplied` states and its `found` begins with "This is an inference:". CTA hrefs are from the fixed list: `/contact?from=business-review`, `/seo-and-ai-visibility`, `/websites`, `/automation`, `/engineering`, `/contact`.

## 9. Report JSON

`GET /:id/report` returns `{ ok, contract_version, report }`:
```json
{ "report_id": "4b6f...", "review_ref": "BR-7K2M9QX4", "version": 1, "status": "published",
  "created_by": "system", "reason": "initial", "generated_at": "2026-11-20T10:19:30Z", "generator_version": "br-gen-1.0.0", "completeness": "partial",
  "expires_at": "2026-12-20T10:15:02Z",
  "business": { "name": "Harbour Precision Ltd", "website": "https://harbourprecision.example/", "location": { "text": "Glasgow", "kind": "regional" }, "category": "CNC machining", "goals": ["more_enquiries"], "assessment_level": "standard", "review_date": "2026-11-20" },
  "methodology": {
    "summary": "Public pages were read once with a limited crawl. Speed was measured with Google PageSpeed Insights (Lighthouse) on mobile. Comparison businesses were chosen from the sources listed below.",
    "sources": [ { "id": "src-own", "name": "Public pages fetched directly", "kind": "own_fetch", "collected_at": "2026-11-20T10:16:19Z" },
                 { "id": "src-psi", "name": "Google PageSpeed Insights API v5", "kind": "pagespeed_insights", "collected_at": "2026-11-20T10:16:52Z" } ],
    "test_settings": { "crawl": { "user_agent": "RhysHumeReviewBot/1.0", "max_requests": 25, "robots_honoured": true }, "psi": { "strategy": "mobile", "categories": ["performance","seo","accessibility","best-practices"], "runs_per_url": 1 } },
    "disclaimer": "Lighthouse scores are lab test results, not Google ranking scores." },
  "competitors": { "state": "nominated", "selection_note": "No supported business search source is switched on, so only the competitor you named is compared.",
                   "items": [ <competitor, status selected only> ], "limitations": ["A higher or lower technical score does not show which business is more successful."] },
  "key_findings": [ { "id": "kf1", "text": "Clyde Components loaded its home page faster in the mobile test recorded on 20 Nov 2026 (2.1 s against 3.8 s for your page).", "evidence_ids": ["0e1d...", "9a77..."], "evidence_state": "verified_public_observation" } ],
  "comparison": { "rows": [ {
      "metric_key": "psi.mobile.lcp_ms", "label": "Time to show the main content (mobile test)",
      "what_checked": "Largest Contentful Paint in a simulated mobile Lighthouse test of each home page.",
      "business": { "evidence_id": "0e1d...", "evidence_state": "verified_public_observation", "display": "3.8 s" },
      "competitors": [ { "competitor_id": "5a0c...", "evidence_id": "9a77...", "evidence_state": "verified_public_observation", "display": "2.1 s" } ],
      "finding": "Clyde Components was faster in this test.",
      "source": "Google PageSpeed Insights API v5", "observed_at": "2026-11-20T10:16:52Z",
      "what_it_means": "...", "could_improve": "...", "limitations": ["Single lab run."] } ] },
  "technical": { "groups": [ { "key": "basics", "label": "Basics", "rows": [ { "metric_key": "https.enabled", "label": "Uses HTTPS", "business": { "evidence_id": "...", "evidence_state": "verified_public_observation", "display": "Yes" }, "what_it_means": "...", "limitations": [] } ] } ] },
  "local_search": { "state": "not_tested", "reason_code": "no_supported_source", "note": "Google Maps ranking, profile and reviews were not measured because no supported data source is connected.", "rows": [] },
  "ai_visibility": { "state": "awaiting_supported_test", "note": "Awaiting a supported test.", "questions": [], "summary": [] },
  "recommendations": [ <recommendation> ],
  "automation": { "opportunities": [ <automation opportunity> ] },
  "next_steps": [ { "label": "Discuss my results", "href": "/contact?from=business-review", "service_key": "none" } ],
  "disclaimers": [ "This is an automated review of public information on the date shown. It does not promise rankings, enquiries or returns.",
                   "Nothing here is a quote. Any work is scoped and priced separately.",
                   "Lighthouse scores are not Google ranking scores. AI tool answers vary between runs." ],
  "changes_from_previous": [ { "version": 1, "summary": "Initial report." } ],
  "evidence_index": [ <evidence record without value-less duplicates> ] }
```
Rules:
- `status`: `draft | published | superseded`. The API returns the latest `published` version (or a requested one). `superseded` carry a banner field `superseded_by_version` in the response.
- A comparison row exists only if the business or at least one competitor has an evidence row with state not `not_tested`/`unavailable` for that metric. Rows where nothing was measured do not appear (they may appear under `technical` with the state shown).
- `competitors.state`: `discovered | nominated | none_available | unavailable | owner_selected`.
- `ai_visibility.state`: `awaiting_supported_test | partial | complete | unavailable`; `questions` hold question objects `{ question_id, question_text }`; `summary` holds the per question summaries of section 7.
- Contact details never appear. `finding` strings are generated from templates that only state the measured difference with date ("loaded faster in the mobile test recorded on <date>"); a causal phrase list is banned in tests ("stealing", "losing customers to", "because of", "more successful").
- The same object feeds the screen, the print view, the email summary and (later) the PDF.

## 10. Provider status

```json
{ "id": "pagespeed", "kind": "pagespeed", "label": "Google PageSpeed Insights", "state": "available",
  "reason": null, "last_ok_at": "2026-11-20T10:16:52Z", "last_error_code": null, "last_error_at": null,
  "budget": { "used_pence": 0, "daily_cap_pence": 0, "calls_today": 14, "daily_call_cap": 150 },
  "cost_note": "Free within Google's quota.", "terms_note": "Check Google API terms before launch." }
```
Public `/capabilities` returns only `{ state, note }`. Admin returns the full object. `state` as in section 1.

## 11. Metrics (admin)

```json
{ "ok": true, "days": 30,
  "metrics": { "reviews_started": 12, "reviews_completed": 9, "reviews_partial": 4, "reviews_failed": 0,
               "reports_requested": 5, "discussion_requests": 3, "projects_created": 1, "provider_failures": { "pagespeed": 2, "google_places": 0 } },
  "notes": ["Anonymous reviews are not leads. Counts come from database rows only."] }
```

## 12. Automation opportunity

```json
{ "id": "ao1", "task_text": "We send quotes but forget to chase them", "category_key": "quote_follow_up",
  "workflow_title": "Quotation follow up workflow", "evidence_state": "reasonable_inference",
  "match_basis": "phrases: send quotes, chase", "confidence": "medium",
  "description": "A possible workflow in which each quote is recorded with a date and status, a follow up is prepared when no reply has been recorded by the agreed date, and further follow ups stop when the quote is accepted, declined or closed.",
  "stages": ["Quote issued and recorded with a date and status", "Follow up due date reached with no response", "Follow up prepared (or sent under agreed rules) for a person to approve", "Stops when accepted, declined or closed", "Communication history visible on the quote"],
  "integrations_likely_needed": ["Where quotes are created today", "Email or messaging used with customers"],
  "approval_points": ["A person approves wording and timing rules before anything is sent"],
  "unknowns": ["Your current software", "How you issue quotes", "How much time this takes now"],
  "legal_note": "Any customer messaging must be checked for consent and opt out rules before use. Not yet checked.",
  "not_included": "This is a potential workflow, not an existing implementation at your business. The free review does not include development. Implementation is quoted separately.",
  "demo": { "key": "quote_follow_up", "href": "/automation-demos#quote-follow-up" },
  "service": { "key": "automation", "label": "Business process automation", "cta": { "label": "Discuss an automation", "href": "/automation" } } }
```
No time or money saving figures anywhere. `category_key: other` returns a generic "needs a conversation" opportunity with `confidence: low`.

## 13. Fixtures required (WP-A, first commit)

`test/fixtures/business-review/` : `start-201.json`, `status-running.json`, `status-ready-partial.json`, `report-with-competitor.json` (fictional businesses only, `fixture: true` flag added at top level and shown in tests as "demonstration data", never served by production routes), `report-no-website.json`, `report-ai-awaiting.json`, `error-validation.json`, `error-url-not-allowed.json`, `capabilities-minimal.json`, `admin-review.json`. WP-B/WP-D tests read these; production code must never import them.
