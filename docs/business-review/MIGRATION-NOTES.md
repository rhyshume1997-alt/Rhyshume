# Migration notes: 20261120120000_business_review

File: `supabase/migrations/20261120120000_business_review.sql`. Rollback: `supabase/rollback/20261120120000_business_review_rollback.sql` (kept outside `migrations/` so the CLI never applies it by accident). **Neither has been applied anywhere.**

What was checked: the file was run end to end against a local PostgreSQL compatible engine (PGlite) with stand in `auth.jwt()`, roles and the two referenced tables. It creates cleanly, rolls back cleanly and re-applies. Behaviour tested: `br_rate_hit` allows then refuses, `br_budget_spend` stops at the cap, `br_review_lease` is exclusive, evidence updates and deletes are refused, a value-less `verified_public_observation` is refused, the purge function deletes expired reviews and cascades. Not tested locally: RLS policies against real Supabase JWTs (the stand in role has no policies exercised), `service_role` grants, the `rls_auto_enable` event trigger interaction.

It only references `public.leads` and `public.client_workbooks` (foreign keys); it alters no existing table, function or policy. It repeats the live owner email expression used in every existing policy.

## Applying it later (needs Rhys's approval)

1. Create a Supabase branch of project `vkpdrqkwxkokolphmkbh` (or a scratch project), apply the file there, and check: tables exist with RLS enabled; as an anonymous client `select * from br_reviews` returns no rows or an error; with the owner's session it returns rows; `select public.br_rate_hit('t',1,60)` works as service role and is refused for `anon` and `authenticated`.
2. Run `get_advisors` (security) on the branch and read the findings before promoting.
3. Apply to production (Supabase dashboard SQL editor or `apply_migration`), then record the version in the repo's migration list. The live project's earlier eight migrations are not in the repo: consider exporting them into `supabase/migrations/` in a separate task.
4. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Sensitive) to Vercel for the environments that need them. Never put the key in the repo, the browser or a log.
5. To undo: run the rollback file. It deletes all review data. Export first.

Retention is only applied when `br_purge_expired()` runs (daily sweep or manual). Until the sweep is scheduled nothing is deleted automatically.
