-- Rollback for 20261120120000_business_review.sql. NOT APPLIED. Deletes ALL review data (reviews, evidence, reports, prospects created
-- by the review). It does not touch leads or client_workbooks rows, only the foreign keys that point at them from br_* tables.
-- Export anything wanted first (reports are regenerable from br_evidence only while these tables exist).
drop function if exists public.br_purge_expired();
drop function if exists public.br_review_lease(uuid,text,int);
drop function if exists public.br_budget_spend(text,numeric,numeric);
drop function if exists public.br_rate_hit(text,int,int);
drop table if exists public.br_admin_log;
drop table if exists public.br_budget;
drop table if exists public.br_rate_limits;
drop table if exists public.br_deliveries;
drop table if exists public.br_prospects;
drop table if exists public.br_automation_opportunities;
drop table if exists public.br_report_versions;
drop table if exists public.br_ai_runs;
drop table if exists public.br_evidence;
drop table if exists public.br_competitors;
drop table if exists public.br_provider_calls;
drop table if exists public.br_reviews;
drop function if exists public.br_ai_lock();
drop function if exists public.br_report_lock();
drop function if exists public.br_evidence_lock();
drop function if exists public.br_touch_updated_at();
