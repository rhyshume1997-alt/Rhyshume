# Business Review: work packages, file ownership, order

Rule that overrides everything: **one owner per file.** A package may create or edit only files listed under it. If a package needs a change in a file it does not own, it writes the request in `docs/business-review/HANDOFF.md` (append a dated line, owner of that file reads it) and carries on with a stub or fixture. Existing files not listed anywhere are not to be touched. Each new or changed file starts with a short comment stating inputs, outputs and what must not be changed (repo hard rule 7). Tests: `node --test` must pass in full at every merge (baseline 254). All packages work on branches off `claude/business-review` and merge back in the order below. No package deploys, applies the migration, sets variables or pushes to main.

Contract: `CONTRACT.md` is binding for A, B, C (JSON shape only), D. Decisions: `DECISIONS.md`. Schema: `supabase/migrations/20261120120000_business_review.sql` (architect, final; A requests changes through HANDOFF).

## Order and dependencies

```
Phase 0  (A, one commit, first): vercel.json delta, .vercelignore, .env.example, fixtures from CONTRACT
Phase 1  parallel:  A  backend engine        B  public UI (fixtures only)      C  demo engine        D  workbook module
                    E  site copy, nav, pages, SEO files (can start at once; its links go to routes B and C create)
Phase 2  merge order: A, B, C, D, then E (E's link tests need B and C pages to exist), then F
Phase 3  F  provider guide, test plan, release checks; final integration run
```
- B depends on CONTRACT + Phase 0 fixtures only. C depends on nothing (own data). D depends on CONTRACT section 4 and the migration; its live test needs A's admin routes, until then it runs against fixtures. E depends only on the fixed route list below. F depends on A (variable names, flags) and everything for the final check.
- A is on the critical path. B, C, D, E must not wait for it.

## Fixed routes (so E can link before pages exist)

Public pages: `/business-review` (B), `/business-review/report` (B, noindex), `/business-review/bot` (B), `/automation-demos` (C), `/seo-and-ai-visibility` (E, new), plus existing `/`, `/websites`, `/local-business`, `/automation`, `/engineering`, `/about`, `/contact`, `/privacy`, `/website-concepts/`, `/work/jnr-engineering`, `/tolra`, `/csv`. Indexable and in sitemap: `/business-review`, `/seo-and-ai-visibility`, `/automation-demos`. Not in sitemap and noindex: `/business-review/report`. `/business-review/bot` indexable, not in nav.
API: `/api/business-review/*` and `/api/business-review/admin/*` as in the contract.

## WP-A: backend analysis engine (owner: backend builder)

Creates (all new):
- Routers: `api/business-review.js`, `api/business-review-admin.js`
- `api/_lib/br/`: `http.js` (envelope, body reader, headers, error helper), `config.js` (env and flags, caps, defaults), `db.js` (PostgREST client over fetch, service role), `ratelimit.js`, `token.js`, `validate.js`, `labels.js` (step labels, evidence labels), `safe-fetch.js`, `robots.js`, `html.js` (small HTML scanner, no dependency), `analyzer.js`, `crawl.js`, `metrics.js`, `evidence.js`, `costs.js`, `steps.js` (stepper and lease), `discovery.js`, `questions.js`, `ai-visibility.js`, `recommendations.js`, `automation.js`, `report.js`, `mail.js`, `prospects.js`, `admin.js`
- `api/_lib/br/providers/`: `index.js` (registry, `callProvider`, flags, budget, cache), `psi.js`, `places.js`, `osm.js`, `ai-null.js` (returns `not_configured`), one AI adapter chosen by Rhys later (`ai-anthropic.js` or `ai-openai.js` or `ai-gemini.js` or `ai-perplexity.js`; the others are not built)
- Tests: `test/br-safe-fetch.test.js` (SSRF matrix below), `test/br-robots.test.js`, `test/br-analyzer.test.js`, `test/br-providers.test.js`, `test/br-api.test.js` (handler with an in memory fake of `db.js` and injected `fetch`), `test/br-recommendations.test.js`, `test/br-report.test.js`, `test/br-contract.test.js` (responses validated against the fixtures' shapes), `test/br-idempotency.test.js`
- Fixtures: `test/fixtures/business-review/*.json` (list in CONTRACT 13)
- Phase 0 shared edits (only A, once): `vercel.json`, `.vercelignore`, `.env.example` (exact deltas below)

Must: use only Node built-ins; never log contact details, tokens or secrets; never import fixtures in production code; every provider call through `callProvider`; all loops have constant bounds with tests; honest `unavailable` for every unconfigured provider; follow the evidence state rules.
SSRF test matrix (minimum): `http://127.0.0.1`, `localhost`, `0.0.0.0`, `[::1]`, `[::ffff:7f00:1]`, `[::ffff:127.0.0.1]`, decimal `2130706433`, hex `0x7f000001`, octal `0177.0.0.1`, `169.254.169.254`, `metadata.google.internal`, `10.x`, `172.16.x`, `192.168.x`, `100.64.x`, `user:pass@host`, port 22/8080, `file:`/`ftp:`/`gopher:`, DNS name resolving to a private address, **a name that resolves public on the first lookup and private on the second (pinning test)**, redirect to a private address, redirect loop, oversize body, slow body, wrong content type, gzip bomb.
Depends on: CONTRACT, migration. Provides: the working API, fixtures, variable list for F.

## WP-B: public review UI (owner: front end builder)

Creates (new): `business-review/index.html` (the form, confirm step, live stepper, results, automation assessment, report request and discussion request), `business-review/report.html` (token reader, report view, print view), `business-review/bot.html` (crawler information), `br.css` (all styles for B, uses the existing tokens, `@media print` for the report), `br-form.js` (form, Turnstile, advance loop, polling, error and unavailable states), `br-report.js` (loads the report, tabs, print button), `br-render.js` (pure functions that turn a report or status JSON into HTML strings; UMD so Node tests can call it), `br-automation.js` (task choices and the opportunity card).
Tests: `test/br-ui.test.js` (static: titles under 70 chars, description at most 160, canonical, noindex on report, headings order, labels for every input, no inline secrets; render tests on `br-render.js` with the Phase 0 fixtures; text assertions: evidence state labels exact, no percentage for AI visibility, "awaiting a supported test", unavailable and failed states render, banned causal phrases absent), `test/br-ui-a11y.test.js` (every `input/select/textarea` has a label, buttons have names, `aria-live` region exists).
Must: load only `/styles.css`, `/br.css`, its own scripts and Turnstile; no framework; works with the keyboard; reduced motion respected; no invented analysis shown while a request runs (spinners carry the step label the API returned); fixtures only in tests, never in the page; if JS is off, show the contact fallback `rhys@rhyshume.co.uk` and a link to the free website preview; the token lives in the URL fragment and `sessionStorage`; copy follows the brief (British English, no em dashes, ellipses or decorative hyphens, no banned words, no prices).
Does not edit: `styles.css`, `nav.js`, any existing page. Requests nav and CTA hooks from E via HANDOFF.
Depends on: CONTRACT, Phase 0 fixtures. Provides: pages and CSS class names E may link to.

## WP-C: automation demonstration engine and demo pages (owner: demo builder)

Creates (new): `automation-demos/index.html` (route `/automation-demos`, three demos with anchors `#quote-follow-up`, `#enquiry-to-job`, `#document-approval`), `automation-demos.css`, `demo-engine.js` (one reusable state machine: entities with status and due dates, a simulated clock the visitor advances, event log, rules engine; UMD for Node tests), `demo-scenarios.js` (three scenarios with fictional engineering and local business data), `demo-ui.js` (rendering and controls).
Tests: `test/br-demos.test.js` (engine: quote follow up becomes due, prepared, accepting cancels reminders; enquiry to job status flow; approval revision history and audit trail; no `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`, `mailto:` or form action in the demo files; every demo screen contains the label "Demonstration with made up data"; fictional names only).
Must: clearly labelled demonstration; never sends email or SMS; needs no integrations; works offline; accessible controls; reduced motion.
Depends on: nothing. Provides: `/automation-demos` and anchors used by CONTRACT section 12.

## WP-D: workbook integration and admin (owner: workbook builder)

Creates (new): `tools/workbook-reviews/build.py` (same pattern and style as `tools/workbook-meeting/build.py`: `python3 build.py <source html> <out html>`, string anchors with `rep(old, new)` that exits on drift, refuses to run twice, runs after the meeting build), `tools/workbook-reviews/reviews.js`, `tools/workbook-reviews/reviews.css`, `tools/workbook-reviews/README.md` (anchors used, how to rebuild, rollback), `tools/workbook-reviews/e2e.js` (fixture driven check, optional).
Edits (one owner): `w-82503121e7fdf54e/index.html` (the built output, only by running the build script; the diff must be additive).
Tests: `test/br-workbook.test.js` (running the build on the committed workbook succeeds once and refuses a second time; output contains marker `BUSINESS REVIEWS: owner view of free reviews`; existing markers (`CLIENT MEETING: a guided discovery interview`, `cloudGate`, `leadmk`, `clRest`) still present; no `service_role`, no `SUPABASE_SERVICE`, no contact details or fixture data in the output; module only calls `/api/business-review/admin/` and `/rest/v1/br_*` and `/rest/v1/leads`).
Features: new nav item "Business reviews" in group `1 Client`; list of reviews with status, completeness, incomplete flag, prospect state, provider failures; review panel (inputs, steps, competitors with reject/select/add, evidence table with states and sources, report versions, regenerate, approve or revise, deliveries and send held email, AI run with dry run cost first, token extend or revoke); prospect panel (notes, needs, status, recommendations marked for discussion, consent flags shown) saved by direct PostgREST update; "Create draft project" using the existing `leadmk` path plus `S.review` additive key, then `link-workbook`; metrics strip from `/admin/metrics`.
Must: reuse `CL.session`, `clToken()` and `clRest()`; use the owner policies only; never store passwords or secrets; internal notes and margins never go into customer documents (the module adds no output to quote, portal or document generators and a test asserts `S.review.internal` is not referenced by them); never create a quote; never auto-convert; preserve existing data and flows.
Depends on: CONTRACT section 4, migration. Provides: admin UI.

## WP-E: site sales copy, structure, SEO files (owner: content builder)

Edits existing (owner of all): `index.html`, `home.css`, `home.js`, `featured.css`, `featured.js` and `tools/featured-markup.py` only if section structure requires it, `websites.html`, `local-business.html`, `automation.html`, `engineering.html`, `about.html`, `contact.html`, `contact.css`, `privacy.html`, `tolra.html`, `csv.html`, `404.html`, `upgrade.html` (copy only), `council-digital-grants/index.html`, `insights/index.html` and the article, `work/jnr-engineering.html`, `website-concepts/index.html` (nav only), `styles.css` (additions only, at the end, under a comment `/* business review additions */`), `nav.js` (only if the menu behaviour changes; none expected), `form-check.js` (visible fallback address to `rhys@rhyshume.co.uk`), `api/contact.js` (**only** the visible `FALLBACK` constant and nothing else), `sitemap.xml`, `llms.txt`, `robots.txt` (no change expected), `README.md` page list line, existing tests that assert changed copy: `test/home.test.js`, `test/pages.test.js`, `test/flagship.test.js`, `test/contact.test.js` (fallback string only).
Creates: `seo-and-ai-visibility.html`, `docs/business-review/PRICE-SNAPSHOT-before.txt` and `-after.txt`, `test/br-site.test.js`.
Must: take the price and payment line snapshot first and diff at the end (values identical, no £297, no mandatory subscription, no new prices for SEO, AI visibility or automation, "Request a quote" or "Discuss your requirements" instead); homepage H1 and supporting text exactly as the brief; primary CTA "See how your business compares" to `/business-review`, secondary "Get a free website preview" to `/contact`; section flow as the brief; nav on all pages (about 23 files) gains the new links consistently, including the home page's different header; engineering page headline and explanation as the brief with the ISO wording rule in DECISIONS 14 (no edition numbers unless re-verified on iso.org that day; "familiar with", never "compliant" or "certified"; no employer named); no invented clients, testimonials, counts or results; concepts and existing pages keep working; JSON-LD valid for new pages and no review or rating markup; sitemap and `llms.txt` list only real pages; the privacy notice is rewritten only with wording Rhys has approved (SPEC-GAPS 4), drafted by E, marked for approval; copy rules: British English, no em dashes, ellipses or decorative hyphens, avoid "seamless", "showcase", "delve", "cutting edge".
Tests: `test/br-site.test.js` (prices unchanged against the snapshot; forbidden prices absent; new pages have title, description, canonical; every internal link on changed pages resolves to a file or a fixed route; nav identical across pages; banned words and punctuation in the new copy; sitemap entries exist; hidden routes still noindex).
Depends on: fixed routes only. Needs B and C pages merged before the link test runs (merge order).

## WP-F: provider configuration guide and test plan (owner: documentation builder, last)

Creates (new): `docs/business-review/PROVIDERS.md` (for each provider: what it does, which variables, flags, caps, how to create and restrict a key, cost, terms to read, how to switch off, what the site shows when off), `docs/business-review/TEST-PLAN.md` (functional, integrity, security, presentation, performance cases from the brief; browser test script list; what is fixture based), `docs/business-review/RELEASE-CHECKLIST.md` (order: approve migration, add variables to Preview then Production, Turnstile hostnames, privacy approval, cron, Vercel firewall rule, smoke test), `test/br-release.test.js` (no secret-looking strings in the tree, `.env.example` lists every variable the code reads, no production file imports fixtures, no provider enabled by default, price snapshot diff clean).
Edits: `README.md` (environment section, one owner after E's one line edit: E first, F second, never concurrent), `.env.example` is Phase 0 owned by A; F only reads it.
Depends on: A (names), all (final run).

## Shared files: single owner and hand-off

| File | Owner | Rule |
|---|---|---|
| `vercel.json` | A, Phase 0 only | The delta below is written now. Later changes are requested via HANDOFF and made by A in a separate commit. B, C, D, E never edit it. Cron entry added only at release with Rhys's approval. |
| `.vercelignore`, `.env.example` | A, Phase 0 | Same rule. |
| `styles.css` | E | Append only, under the marker comment. B and C use their own CSS files and may ask E for token additions. |
| `nav.js` | E | No change expected. |
| Nav markup (23 HTML files) | E | One commit changes all of them so they stay identical. B, C and D create pages with the same nav markup copied from E's committed version (E commits the nav change first, within the first day, and tells the others via HANDOFF). |
| `sitemap.xml`, `llms.txt` | E | Others list new routes in HANDOFF only. |
| `w-82503121e7fdf54e/index.html` | D | Only via the build script. |
| Existing tests | E | New packages add new `test/br-*.test.js` files only and never edit existing test files. If an existing test fails because of a package's change, that package fixes its change. |
| `test/fixtures/business-review/` | A | B and D read only. Request shape changes through HANDOFF. |
| `README.md` | E then F | Sequential. |
| `supabase/**`, `docs/business-review/*.md` (this set) | Architect | Others append to HANDOFF.md only; F owns PROVIDERS, TEST-PLAN, RELEASE-CHECKLIST. |

## Phase 0 delta (exact)

`vercel.json` additions (keep all existing entries unchanged):
```json
{ "headers": [ { "source": "/business-review/report",
      "headers": [ { "key": "X-Robots-Tag", "value": "noindex, nofollow, noarchive" },
                   { "key": "Referrer-Policy", "value": "no-referrer" },
                   { "key": "Cache-Control", "value": "no-store" } ] } ],
  "functions": { "api/business-review.js": { "maxDuration": 60 }, "api/business-review-admin.js": { "maxDuration": 60 } },
  "rewrites": [ { "source": "/api/business-review/admin/:path*", "destination": "/api/business-review-admin?route=:path*" },
                { "source": "/api/business-review/:path*", "destination": "/api/business-review?route=:path*" } ] }
```
The admin rewrite must come before the public one; the existing `/c/:id` rewrite is unaffected. Routers read the route from `req.query.route` and fall back to parsing `req.url`; a test covers both. **At release only (Rhys approves):** `"crons": [ { "path": "/api/business-review/admin/sweep", "schedule": "17 4 * * *" } ]` and variable `CRON_SECRET`.
`.vercelignore`: append `tools/workbook-reviews`.
`.env.example`: append names only, no values: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BR_OWNER_EMAIL`, `BR_SALT`, `BR_TOKEN_DAYS`, `BR_DAILY_REVIEWS`, `BR_REQUIRE_APPROVAL`, `BR_PSI`, `PSI_API_KEY`, `BR_PSI_DAILY_CALLS`, `BR_DISCOVERY`, `GOOGLE_PLACES_API_KEY`, `BR_PLACES_DAILY_CAP_PENCE`, `BR_AI_VISIBILITY`, `BR_AI_PUBLIC`, `BR_AI_DAILY_CAP_PENCE`, `BR_AI_MAX_CALLS_PER_REVIEW`, `BR_AI_MAX_PENCE_PER_REVIEW`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `PERPLEXITY_API_KEY`, `BR_EMAIL`, `CRON_SECRET`.

## Merge checklist (every package)

`node --test` fully green; only listed files changed (`git diff --name-only` checked against this list); no secret values; no migration applied; no deploy; HANDOFF lines resolved; the package's tests exist and fail when the behaviour is broken (mutation check by hand on one rule).
