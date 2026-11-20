# HANDOFF-D: from the workbook module (WP-D) to the owners of other files

Dated 20 Nov 2026. The workbook module is `tools/workbook-reviews/` plus the rebuilt `w-82503121e7fdf54e/index.html`. Nothing outside those files and `test/br-workbook.test.js`, `docs/business-review/HANDOFF-D.md` was edited.

## For A (backend, admin routes), contract points the module relies on

1. `POST /admin/reviews/:id/competitors` answers `{ competitors, review_status: "queued" }` for select, reject (with `reason`) and add (`name`, `website`). The module shows "queued again" only if `review_status === "queued"`.
2. `POST /admin/reviews/:id/reports/:version/revise` body `{ overrides: { recommendations: [{ key, hide?, owner_note? }] }, reason }`, 201 `{ report_version }`. `owner_note` is shown to the customer in the revised report, the form warns the owner. If A prefers it to be internal only, say so and the form wording changes.
3. `POST /admin/reviews/:id/ai-visibility/run` dry run returns `{ plan: { questions, runs, tools, calls, estimate_pence: { low, high }, within_caps, cap_reasons } }`; the real run returns `remaining_calls` (0 or absent means finished). The module sends the same `tools` and `runs` for each call.
4. `POST /admin/reviews/:id/link-workbook { workbook_id }` is called after the draft client row exists. If it fails the module falls back to an owner update of `br_prospects` (`workbook_id`, `status: draft_project`), allowed by the "owner update" policy, and records the outcome in `S.review.link`.
5. `GET /admin/metrics?days=` and `GET /admin/providers` response shapes as in CONTRACT 10 and 11. If the admin service cannot be reached the module counts from the rows it loaded and says so.
6. Admin errors: `unauthenticated` 401, `forbidden` 403 with the contract envelope; anything else without JSON (404, 405, 5xx) is shown as "not reachable, may not be deployed".

## For the architect (schema), optional improvements

1. **Notes for anonymous reviews.** `br_prospects` rows exist only after a follow up request, and the owner has update but no insert policy, so an anonymous review has nowhere to keep notes or marks. The module says so. Options: an admin route that creates the prospect row, or an owner insert policy. Not needed for the current scope.
2. The module selects `br_deliveries.to_email` only to show a masked address; that column is cleared after 30 days as designed.
3. `br_reviews.steps` is read as an array of `{ key, label, state, reason, message }` as in CONTRACT 3.4. If A stores it differently the step list shows "No steps have run yet" instead of failing.

## For E (copy, nav)

None. The module adds nothing to public pages. `.vercelignore` already lists `tools/workbook-reviews`.

## For F (provider guide, release checklist)

1. Release order: apply the migration first, then deploy the admin routes with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BR_OWNER_EMAIL`, then deploy the rebuilt workbook. With none of that done the Reviews area shows "not set up yet" and nothing else in the workbook changes.
2. The rebuilt workbook only becomes live on a production deploy. It was not deployed here.
3. After release, smoke test with a real review: list shows it, open it, correct a competitor, approve, convert a test enquiry, delete the test client.

## Compliance and privacy notes

1. The module shows the visitor's voluntarily supplied contact details only inside the signed in owner view, over owner only row level security. Nothing is logged or copied elsewhere. The copy kept on a draft project is the reference only (reference, versions, evidence count, requested services).
2. Marketing consent is displayed read only and never changed. The module sends nothing; the only send is the held report email the owner chooses to release, through the admin service.
3. Not checked: whether holding enquiry details in the workbook needs wording in the privacy notice. That is SPEC-GAPS 4 (Rhys decides).
