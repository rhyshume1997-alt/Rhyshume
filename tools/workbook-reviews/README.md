# Business reviews module for the Client Workbook (WP-D)

Owner view of the Free Business Opportunity Review, added to the hosted workbook the same way as the meeting module. Not deployed with the site (`tools/workbook-reviews` is in `.vercelignore`).

## What it adds

- A **Business reviews** screen. Two places show it: the client list level (button beside Refresh the list, no client needs to be open) and inside an open client (nav item under `1 Client`, and a small **Reviews** button in the header beside START CLIENT MEETING, online copy only).
- List with search, status filter, "needs attention" filter, numbers (from the admin service, or counted from the stored rows if it cannot be reached), provider status, and the provider error log.
- One review: inputs, analysis steps, provider calls and failures, enquiry (contact, consent, status, needs, **internal notes**), competitors (reject, select, add through the admin API), report versions (approve, rebuild, revise), recommendations (mark for discussion), evidence table (read only), AI visibility (plan first, spend only after a tick), report delivery (send a held email), link extend or revoke, and a customer safe summary.
- **Create draft project**: confirms, then reuses the existing `leadmk` ("Make into a client"). A hook adds an additive `S.review` key (reference, report versions, evidence count, requested services) before the row is made, and links the review to the new project afterwards. It creates no quote and sends nothing. The existing "Make into a client" button on the client list gets the same reference.

## Where data comes from and goes

| Action | Route |
|---|---|
| Read reviews, prospects, evidence, report versions, deliveries, provider calls | PostgREST `br_*` tables with the owner's session (`clRest`), owner only row level security |
| Save needs, internal notes, status, discuss marks | PostgREST update on `br_prospects` (owner update policy) |
| Competitor corrections, rebuild, approve, revise, send held email, AI run, token, link, metrics, providers | `POST/GET /api/business-review/admin/*` with `Authorization: Bearer <owner session token>`; the server checks the token against Supabase and the owner email and acts with the service role |
| Lead row for the conversion | `leads` (existing) |

No key is in the module. The service role key lives only in the server environment.

## Internal versus customer material

Internal notes and needs are stored only in `br_prospects`. They are never copied into `S`, the saved project, a file, a quote, the portal or any document. `S.review` holds the reference only. The customer safe summary is built from the report and the discuss marks only (the function cannot see the notes). In revise, the per recommendation note is **customer visible** and the form says so.

## Rebuild

```
git show <commit before the module>:w-82503121e7fdf54e/index.html > /tmp/src.html   # the workbook with the meeting module, before this one
python3 tools/workbook-reviews/build.py /tmp/src.html w-82503121e7fdf54e/index.html
python3 tools/workbook-reviews/additive-check.py /tmp/src.html w-82503121e7fdf54e/index.html
```

The build refuses to run on a file that already has the module, and stops if any anchor does not match exactly once, so a change to the workbook cannot silently break the module. Rollback: restore the previous `w-82503121e7fdf54e/index.html`.

### Anchors used (all in the existing workbook)

1. `SCREEN_DEFS` meeting entry (adds the `reviews` nav item)
2. `meeting: vMeeting, biz: vBiz,` in `view()`
3. `START CLIENT MEETING</button><span class="chip revchip"` in `shell()` (header button)
4. the `meetBanner()` expression in `shell()` (reference strip on a draft that began from a review)
5. `function cloudGate() {...` (gate level screen, only after sign in)
6. the Refresh the list button in `clListHtml()`
7. two places in `leadmk` (attach before the row is made, link afterwards)
8. the end of the document's style block, and `<script>init();</script>`

The sign in code (`cloudGate` logic, `clToken`, `clRest`, `clSendLink`) is not changed, and the hosted copy still has no offline way in.

## Tests

- `node --test test/br-workbook.test.js` (static checks, build once and refuse twice, drift stop, additive proof)
- `NODE_PATH=$(npm root -g) AXE=<axe.min.js> node tools/workbook-reviews/e2e.js w-82503121e7fdf54e/index.html [shots dir]` runs the browser test against `mock.js`, a local stand in for the Supabase REST endpoints and the admin API using clearly labelled fixture data about fictional businesses. `ONLY=<scene>` runs one scene.
- The meeting test must still pass on the built file: `node tools/workbook-meeting/e2e.js w-82503121e7fdf54e/index.html` (69 checks).

## Limits

- Needs the review migration (not applied) and the admin routes (package A) to do more than show "not set up yet". Without the tables it says so. Without the admin routes reads still work and changes explain why they cannot run.
- Notes and discuss marks need a `br_prospects` row, which exists only when the visitor asked to be contacted. An anonymous review is shown but has nowhere to keep notes (see HANDOFF-D).
- The customer's report link cannot be reconstructed (only its hash is stored), so the module cannot open the customer view of a report.
