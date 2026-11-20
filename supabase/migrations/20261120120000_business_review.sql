-- Business Review: schema for the Free Business Opportunity Review.
-- STATUS: NOT APPLIED. Written 20 Nov 2026 for approval. Do not apply to project vkpdrqkwxkokolphmkbh without Rhys's go ahead.
-- Rollback: supabase/rollback/20261120120000_business_review_rollback.sql
--
-- Inputs : server functions (api/business-review*.js) using the service role key. Browsers never touch these tables
--          except the owner (RLS below), who reads them from the signed in workbook, like leads and client_quotes.
-- Outputs: tables br_*, helper functions br_rate_hit, br_budget_spend, br_review_lease, br_purge_expired.
-- Must not change: existing tables (leads, client_workbooks, client_portals, client_answers, client_videos,
--          client_quotes, quote_acceptances, business_details) are only REFERENCED (foreign keys), never altered.
-- Conventions copied from the live schema: uuid ids, timestamptz, owner only RLS on the email in auth.jwt(),
--          SECURITY DEFINER functions with an empty search_path, lock triggers in the style of quotes_lock.

-- ---------------------------------------------------------------------------------------------- reviews
create table public.br_reviews (
  id                 uuid primary key default gen_random_uuid(),
  ref                text not null unique,                       -- public reference, e.g. BR-7K2M9QX4 (not secret)
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  status             text not null default 'awaiting_confirmation'
                     check (status in ('awaiting_confirmation','queued','running','ready','failed','expired','cancelled')),
  completeness       text not null default 'pending' check (completeness in ('pending','complete','partial')),
  assessment_level   text not null default 'standard' check (assessment_level in ('reduced','standard','full')),
  business_name      text not null check (char_length(business_name) between 1 and 160),
  website_url        text check (website_url is null or char_length(website_url) <= 300),
  website_host       text,
  location_text      text not null check (char_length(location_text) between 1 and 160),
  location_kind      text not null default 'local' check (location_kind in ('local','regional','national')),
  category           text not null check (char_length(category) between 1 and 120),
  goals              text[] not null default '{}',
  inputs             jsonb not null default '{}'::jsonb,         -- exactly what the visitor submitted, after trimming
  interpretation     jsonb not null default '{}'::jsonb,         -- what the server understood, shown for confirmation
  steps              jsonb not null default '[]'::jsonb,         -- step states, see CONTRACT.md
  current_step       text,
  attempt            int  not null default 0,
  lease_owner        text,
  lease_until        timestamptz,
  error_code         text,
  idempotency_key    text unique,
  input_hash         text not null,                              -- sha256 of normalised inputs, for repeat detection
  visitor_hash       text not null,                              -- sha256(salt|ip), never the raw address
  token_hash         bytea not null unique,                      -- sha256 of the access token, same pattern as client_portals
  token_expires_at   timestamptz not null,
  token_revoked      boolean not null default false,
  hold_for_approval  boolean not null default false,             -- true: emailed copies wait for the owner
  confirmed_at       timestamptz,
  completed_at       timestamptz,
  purge_after        timestamptz not null                        -- anonymous content is deleted after this
);
create index br_reviews_status_idx   on public.br_reviews (status, created_at desc);
create index br_reviews_created_idx  on public.br_reviews (created_at desc);
create index br_reviews_visitor_idx  on public.br_reviews (visitor_hash, created_at desc);
create index br_reviews_input_idx    on public.br_reviews (input_hash, created_at desc);
create index br_reviews_host_idx     on public.br_reviews (website_host, created_at desc);

-- ---------------------------------------------------------------------------------------------- provider calls
create table public.br_provider_calls (
  id               uuid primary key default gen_random_uuid(),
  review_id        uuid references public.br_reviews(id) on delete cascade,   -- null for shared cache entries
  provider         text not null check (provider in ('own_fetch','pagespeed','google_places','osm','ai_anthropic','ai_openai','ai_gemini','ai_perplexity','resend','turnstile')),
  operation        text not null,
  idempotency_key  text not null unique,                         -- review id + step + target + attempt group
  request_hash     text not null,                                -- sha256 of provider + operation + normalised request, for the cache
  status           text not null check (status in ('started','ok','error','unavailable','skipped_budget','cache_hit')),
  http_status      int,
  error_code       text,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  duration_ms      int,
  cost_pence       numeric(10,4) not null default 0,             -- estimate, see DECISIONS.md section 9
  model_version    text,                                         -- as REPORTED by the provider response
  response         jsonb,                                        -- trimmed, no secrets, no contact details
  cache_expires_at timestamptz
);
create index br_calls_cache_idx  on public.br_provider_calls (provider, request_hash, cache_expires_at desc) where status = 'ok';
create index br_calls_review_idx on public.br_provider_calls (review_id, started_at);
create index br_calls_fail_idx   on public.br_provider_calls (started_at desc) where status in ('error','unavailable');

-- ---------------------------------------------------------------------------------------------- competitors
create table public.br_competitors (
  id              uuid primary key default gen_random_uuid(),
  review_id       uuid not null references public.br_reviews(id) on delete cascade,
  created_at      timestamptz not null default now(),
  name            text not null check (char_length(name) between 1 and 160),
  website_url     text,
  website_host    text,
  origin          text not null check (origin in ('google_places','osm','visitor_nominated','owner_added')),
  source_ref      text,                                          -- provider place id or OSM id
  collected_at    timestamptz not null,                          -- when the provider returned it
  provider_call_id uuid references public.br_provider_calls(id) on delete set null,
  relevance       jsonb not null default '{}'::jsonb,            -- why it was thought relevant: category match, distance, type
  status          text not null default 'candidate' check (status in ('candidate','selected','rejected')),
  rejected_reason text,
  reviewed_by_owner boolean not null default false,
  position        int not null default 0,
  data_expires_at timestamptz                                    -- provider data kept only as long as its terms allow (30 days for Places)
);
create index br_comp_review_idx on public.br_competitors (review_id, status, position);

-- ---------------------------------------------------------------------------------------------- evidence (append only)
create table public.br_evidence (
  id               uuid primary key default gen_random_uuid(),
  review_id        uuid not null references public.br_reviews(id) on delete cascade,
  competitor_id    uuid references public.br_competitors(id) on delete cascade,   -- null: the visitor's own business
  created_at       timestamptz not null default now(),
  category         text not null check (category in ('technical','local','ai_visibility','customer_supplied','automation')),
  metric_key       text not null check (metric_key ~ '^[a-z0-9_.]{1,80}$'),
  evidence_state   text not null check (evidence_state in
                   ('verified_public_observation','verified_authenticated_account_data','customer_supplied','reasonable_inference','not_tested','unavailable')),
  reason_code      text,                                         -- required in practice when state is not_tested or unavailable
  value            jsonb,                                        -- null when not_tested or unavailable
  observed_at      timestamptz not null,
  source           jsonb not null,                               -- { kind, name, url?, provider_call_id? }
  method           jsonb not null default '{}'::jsonb,           -- test settings: device, throttling, user agent, crawl limits
  inputs           jsonb not null default '{}'::jsonb,           -- exact measurement inputs: url tested, final url, question text
  limitations      text[] not null default '{}',
  provider_call_id uuid references public.br_provider_calls(id) on delete set null,
  run_key          text not null default 'main',                 -- distinguishes repeat measurements (e.g. psi mobile run 1)
  superseded_by    uuid references public.br_evidence(id) on delete set null,
  check (evidence_state in ('not_tested','unavailable') or value is not null)
);
create unique index br_evidence_unique on public.br_evidence
  (review_id, coalesce(competitor_id, '00000000-0000-0000-0000-000000000000'::uuid), metric_key, run_key)
  where superseded_by is null;
create index br_evidence_review_idx on public.br_evidence (review_id, category, metric_key);

-- ---------------------------------------------------------------------------------------------- AI visibility runs
create table public.br_ai_runs (
  id               uuid primary key default gen_random_uuid(),
  review_id        uuid not null references public.br_reviews(id) on delete cascade,
  created_at       timestamptz not null default now(),
  question_id      text not null,                                -- stable id of the question within the question set
  question_set     text not null,                                -- version of the question template set, e.g. qs-1
  question_text    text not null,                                -- exact question sent
  provider         text not null check (provider in ('ai_anthropic','ai_openai','ai_gemini','ai_perplexity')),
  tool             text not null,                                -- the tool as called, e.g. web_search, google_search_grounding, sonar
  model_requested  text not null,
  model_reported   text,                                         -- what the response said it used
  run_index        int  not null check (run_index between 1 and 5),
  ran_at           timestamptz,
  location_context text,                                         -- location hint sent with the call
  status           text not null default 'planned' check (status in ('planned','running','ok','error','unavailable','skipped_budget')),
  error_code       text,
  answer_text      text,                                         -- exact answer, retained as evidence
  citations        jsonb not null default '[]'::jsonb,           -- [{url,title,cited_text?}] exactly as returned
  search_queries   jsonb not null default '[]'::jsonb,           -- queries the tool says it ran, if returned
  business_named   boolean,
  business_named_basis text,                                     -- text_match | citation_match | both | none
  competitors_named text[] not null default '{}',
  sources_provided boolean,
  provider_call_id uuid references public.br_provider_calls(id) on delete set null,
  cost_pence       numeric(10,4) not null default 0,
  unique (review_id, question_id, provider, tool, run_index)
);
create index br_ai_review_idx on public.br_ai_runs (review_id, question_id);

-- ---------------------------------------------------------------------------------------------- report versions (content immutable)
create table public.br_report_versions (
  id                uuid primary key default gen_random_uuid(),
  review_id         uuid not null references public.br_reviews(id) on delete cascade,
  version           int  not null check (version >= 1),
  created_at        timestamptz not null default now(),
  created_by        text not null check (created_by in ('system','owner')),
  reason            text not null default 'initial',             -- initial | competitors_changed | ai_run_added | owner_revision
  generator_version text not null,
  status            text not null default 'published' check (status in ('draft','published','superseded')),
  content           jsonb not null,                              -- the report JSON in CONTRACT.md section 9
  content_hash      text not null,
  evidence_ids      uuid[] not null default '{}',
  approved_at       timestamptz,                                 -- owner approval for emailed copies when hold_for_approval
  approved_note     text,
  unique (review_id, version)
);
create index br_report_review_idx on public.br_report_versions (review_id, version desc);

-- ---------------------------------------------------------------------------------------------- automation opportunities
create table public.br_automation_opportunities (
  id            uuid primary key default gen_random_uuid(),
  review_id     uuid not null references public.br_reviews(id) on delete cascade,
  created_at    timestamptz not null default now(),
  task_text     text not null check (char_length(task_text) between 1 and 600),   -- customer supplied, verbatim
  category_key  text not null,
  match_basis   text not null,                                   -- which rule matched, so the mapping is explainable
  detail        jsonb not null,                                  -- the opportunity object in CONTRACT.md
  unique (review_id, task_text)
);

-- ---------------------------------------------------------------------------------------------- prospects (the lead relationship)
create table public.br_prospects (
  review_id           uuid primary key references public.br_reviews(id) on delete cascade,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  lead_id             uuid references public.leads(id) on delete set null,          -- the row the workbook already lists
  workbook_id         uuid references public.client_workbooks(id) on delete set null, -- set when a draft project is made
  contact_name        text,
  email               text,
  phone               text,
  requested_services  text[] not null default '{}',
  message             text,
  follow_up_consent   boolean not null default false,            -- agreed that Rhys may contact them about the results
  marketing_consent   boolean not null default false,            -- separate, default false, never implied
  consent_text_version text,
  consent_at          timestamptz,
  status              text not null default 'new' check (status in ('new','in_discussion','draft_project','closed')),
  needs               text,                                      -- owner's notes on needs
  internal_notes      text,                                      -- never shown to the customer, never in customer documents
  discuss_keys        text[] not null default '{}',              -- recommendation keys the owner marked for discussion
  purge_after         timestamptz
);
create index br_prospects_status_idx on public.br_prospects (status, created_at desc);
create index br_prospects_lead_idx   on public.br_prospects (lead_id);

-- ---------------------------------------------------------------------------------------------- deliveries (report email)
create table public.br_deliveries (
  id                 uuid primary key default gen_random_uuid(),
  review_id          uuid not null references public.br_reviews(id) on delete cascade,
  report_version_id  uuid references public.br_report_versions(id) on delete set null,
  created_at         timestamptz not null default now(),
  purpose            text not null default 'report' check (purpose = 'report'),   -- never marketing
  to_email           text,                                       -- cleared by br_purge_expired after the retention period
  to_email_hash      text not null,                              -- sha256, for duplicate detection after the address is cleared
  status             text not null default 'queued' check (status in ('queued','held_for_approval','sent','failed','cancelled')),
  resend_id          text,
  error_code         text,
  attempts           int not null default 0,
  sent_at            timestamptz,
  unique (review_id, report_version_id, to_email_hash)
);

-- ---------------------------------------------------------------------------------------------- rate limits, budget, admin log
create table public.br_rate_limits (
  bucket       text primary key,                                 -- e.g. start:ip:<hash>, start:host:<hash>, mail:review:<id>
  window_start timestamptz not null,
  hits         int not null
);
create table public.br_budget (
  day        date not null,
  provider   text not null,
  pence_used numeric(12,4) not null default 0,
  calls      int not null default 0,
  primary key (day, provider)
);
create table public.br_admin_log (
  id         bigint generated always as identity primary key,
  at         timestamptz not null default now(),
  actor      text not null,
  action     text not null,
  review_id  uuid references public.br_reviews(id) on delete set null,
  detail     jsonb not null default '{}'::jsonb                  -- no contact details, no secrets
);

-- ---------------------------------------------------------------------------------------------- triggers
create or replace function public.br_touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger br_reviews_touch   before update on public.br_reviews   for each row execute function public.br_touch_updated_at();
create trigger br_prospects_touch before update on public.br_prospects for each row execute function public.br_touch_updated_at();

-- Evidence is append only. A newer measurement supersedes an older one (superseded_by); nothing is edited or deleted.
-- Cascade deletes (a whole review being purged) run at trigger depth > 1 and are allowed.
create or replace function public.br_evidence_lock() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if pg_trigger_depth() > 1 then return old; end if;
    raise exception 'evidence cannot be deleted';
  end if;
  if new.id is distinct from old.id or new.review_id is distinct from old.review_id
     or new.competitor_id is distinct from old.competitor_id or new.metric_key is distinct from old.metric_key
     or new.evidence_state is distinct from old.evidence_state or new.value is distinct from old.value
     or new.observed_at is distinct from old.observed_at or new.source is distinct from old.source
     or new.method is distinct from old.method or new.inputs is distinct from old.inputs
     or new.run_key is distinct from old.run_key or new.category is distinct from old.category
     or new.reason_code is distinct from old.reason_code or new.limitations is distinct from old.limitations or new.created_at is distinct from old.created_at then
    raise exception 'evidence cannot be changed, add a new measurement';
  end if;
  return new;
end $$;
create trigger br_evidence_lock_t before update or delete on public.br_evidence for each row execute function public.br_evidence_lock();

-- A published report's content never changes. Only its status and approval fields may.
create or replace function public.br_report_lock() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if pg_trigger_depth() > 1 then return old; end if;
    raise exception 'report versions cannot be deleted';
  end if;
  if new.content is distinct from old.content or new.content_hash is distinct from old.content_hash
     or new.version is distinct from old.version or new.review_id is distinct from old.review_id
     or new.evidence_ids is distinct from old.evidence_ids then
    raise exception 'report content cannot be changed, create a new version';
  end if;
  return new;
end $$;
create trigger br_report_lock_t before update or delete on public.br_report_versions for each row execute function public.br_report_lock();

-- AI run answers are evidence too: once a run is ok, its answer and citations are fixed.
create or replace function public.br_ai_lock() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if pg_trigger_depth() > 1 then return old; end if;
    raise exception 'ai runs cannot be deleted';
  end if;
  if old.status = 'ok' and (new.status is distinct from old.status or new.answer_text is distinct from old.answer_text or new.citations is distinct from old.citations
     or new.question_text is distinct from old.question_text or new.model_reported is distinct from old.model_reported
     or new.ran_at is distinct from old.ran_at or new.review_id is distinct from old.review_id or new.provider is distinct from old.provider
     or new.tool is distinct from old.tool or new.run_index is distinct from old.run_index or new.business_named is distinct from old.business_named
     or new.competitors_named is distinct from old.competitors_named) then
    raise exception 'a completed ai run cannot be changed';
  end if;
  return new;
end $$;
create trigger br_ai_lock_t before update or delete on public.br_ai_runs for each row execute function public.br_ai_lock();

-- ---------------------------------------------------------------------------------------------- functions (service role only)
-- Atomic fixed window counter. Returns {allowed, hits, retry_after_s}. This is the real rate limit: it works across all instances.
create or replace function public.br_rate_hit(p_bucket text, p_max int, p_window_seconds int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.br_rate_limits; t timestamptz := now();
begin
  if p_max < 1 or p_window_seconds < 1 then raise exception 'bad limit'; end if;
  insert into public.br_rate_limits as b (bucket, window_start, hits) values (p_bucket, t, 1)
  on conflict (bucket) do update set
    window_start = case when b.window_start < t - make_interval(secs => p_window_seconds) then t else b.window_start end,
    hits         = case when b.window_start < t - make_interval(secs => p_window_seconds) then 1 else b.hits + 1 end
  returning * into r;
  return jsonb_build_object('allowed', r.hits <= p_max, 'hits', r.hits,
    'retry_after_s', greatest(0, ceil(extract(epoch from (r.window_start + make_interval(secs => p_window_seconds) - t)))::int));
end $$;

-- Atomic spend against a daily cap. Returns false (and spends nothing) if the cap would be exceeded. The hard budget stop.
create or replace function public.br_budget_spend(p_provider text, p_pence numeric, p_daily_cap_pence numeric) returns boolean
language plpgsql security definer set search_path = '' as $$
declare used numeric;
begin
  if p_pence < 0 or p_daily_cap_pence <= 0 or p_pence > p_daily_cap_pence then return false; end if;
  insert into public.br_budget as b (day, provider, pence_used, calls) values (current_date, p_provider, p_pence, 1)
  on conflict (day, provider) do update set pence_used = b.pence_used + p_pence, calls = b.calls + 1
    where b.pence_used + p_pence <= p_daily_cap_pence
  returning pence_used into used;
  return used is not null;
end $$;

-- Takes the run lease for a review so two browsers or retries never run the same step twice.
create or replace function public.br_review_lease(p_id uuid, p_owner text, p_seconds int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare got uuid;
begin
  update public.br_reviews set lease_owner = p_owner, lease_until = now() + make_interval(secs => p_seconds),
         status = case when status = 'queued' then 'running' else status end
   where id = p_id and status in ('queued','running') and token_expires_at > now()
     and (lease_until is null or lease_until < now() or lease_owner = p_owner)
  returning id into got;
  return got is not null;
end $$;

-- Retention: expire old reviews, clear delivery addresses, delete anonymous content past purge_after.
create or replace function public.br_purge_expired() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a int; b int; c int;
begin
  update public.br_reviews set status = 'expired' where status in ('ready','failed','awaiting_confirmation','queued','running') and token_expires_at < now();
  get diagnostics a = row_count;
  update public.br_deliveries set to_email = null where to_email is not null and created_at < now() - interval '30 days';
  get diagnostics b = row_count;
  delete from public.br_reviews r where r.purge_after < now()
    and not exists (select 1 from public.br_prospects p where p.review_id = r.id and p.status <> 'closed');  -- a review with an open prospect is kept
  get diagnostics c = row_count;
  delete from public.br_rate_limits where window_start < now() - interval '2 days';
  delete from public.br_provider_calls where review_id is null and (cache_expires_at is null or cache_expires_at < now() - interval '1 day');
  return jsonb_build_object('expired', a, 'addresses_cleared', b, 'reviews_deleted', c);
end $$;

-- The live project gives service_role NO table privileges on public.leads (only functions are granted). The engine therefore touches
-- leads through these two functions instead of widening the ACL of an existing table. They only write rows whose message starts with a
-- review reference '[BR-', and never touch a lead the owner has marked handled.
create or replace function public.br_lead_put(p_lead_id uuid, p_name text, p_business text, p_email text, p_phone text, p_message text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare got uuid;
begin
  if p_message is null or p_message !~ '^\[BR-[2-9A-HJ-NP-Z]{8}\]' then raise exception 'bad lead'; end if;
  if p_lead_id is not null then
    update public.leads set name = p_name, business = p_business, email = p_email, phone = p_phone, message = p_message
     where id = p_lead_id and handled = false and message like '[BR-%' returning id into got;
    return coalesce(got, p_lead_id);
  end if;
  insert into public.leads (name, business, email, phone, message, picks, consent) values (p_name, p_business, p_email, p_phone, p_message, '{}'::jsonb, true) returning id into got;
  return got;
end $$;
create or replace function public.br_lead_drop(p_lead_id uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  delete from public.leads where id = p_lead_id and handled = false and message like '[BR-%';
  get diagnostics n = row_count;
  return n > 0;
end $$;

revoke all on function public.br_rate_hit(text,int,int)        from public, anon, authenticated;
revoke all on function public.br_budget_spend(text,numeric,numeric) from public, anon, authenticated;
revoke all on function public.br_review_lease(uuid,text,int)   from public, anon, authenticated;
revoke all on function public.br_purge_expired()               from public, anon, authenticated;
revoke all on function public.br_lead_put(uuid,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.br_lead_drop(uuid)               from public, anon, authenticated;
grant execute on function public.br_rate_hit(text,int,int)        to service_role;
grant execute on function public.br_budget_spend(text,numeric,numeric) to service_role;
grant execute on function public.br_review_lease(uuid,text,int)   to service_role;
grant execute on function public.br_purge_expired()               to service_role;
grant execute on function public.br_lead_put(uuid,text,text,text,text,text) to service_role;
grant execute on function public.br_lead_drop(uuid)               to service_role;

-- ---------------------------------------------------------------------------------------------- row level security
-- The live project's rls_auto_enable event trigger also switches RLS on for new tables; it is repeated here so this file stands alone.
alter table public.br_reviews                enable row level security;
alter table public.br_provider_calls         enable row level security;
alter table public.br_competitors            enable row level security;
alter table public.br_evidence               enable row level security;
alter table public.br_ai_runs                enable row level security;
alter table public.br_report_versions        enable row level security;
alter table public.br_automation_opportunities enable row level security;
alter table public.br_prospects              enable row level security;
alter table public.br_deliveries             enable row level security;
alter table public.br_rate_limits            enable row level security;
alter table public.br_budget                 enable row level security;
alter table public.br_admin_log              enable row level security;

-- Owner (same email test as every existing policy) may READ the review tables from the signed in workbook.
-- No policy exists for anon, so the public can never read or write these tables directly. All public access goes through
-- the server functions using the service role, which bypasses RLS.
-- br_rate_limits and br_budget get no policy at all: even the owner reads them only through the admin API.
create policy "owner read" on public.br_reviews                  for select to authenticated using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
create policy "owner read" on public.br_provider_calls           for select to authenticated using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
create policy "owner read" on public.br_competitors              for select to authenticated using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
create policy "owner read" on public.br_evidence                 for select to authenticated using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
create policy "owner read" on public.br_ai_runs                  for select to authenticated using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
create policy "owner read" on public.br_report_versions          for select to authenticated using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
create policy "owner read" on public.br_automation_opportunities for select to authenticated using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
create policy "owner read" on public.br_deliveries               for select to authenticated using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
create policy "owner read" on public.br_admin_log                for select to authenticated using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
-- The prospect row is the owner's working record (notes, status, needs), so the owner may read and update it directly.
create policy "owner read"   on public.br_prospects for select to authenticated using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
create policy "owner update" on public.br_prospects for update to authenticated
  using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com')) with check (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));

-- Table privileges. The live project's default privileges give anon, authenticated AND service_role only truncate/references/trigger/maintain
-- on new tables (see pg_default_acl), so nothing works until the privileges below are granted explicitly (same approach as client_quotes).
-- Everything is stripped first, then exactly what is needed is granted back.
revoke all on public.br_reviews, public.br_provider_calls, public.br_competitors, public.br_evidence, public.br_ai_runs,
  public.br_report_versions, public.br_automation_opportunities, public.br_prospects, public.br_deliveries,
  public.br_rate_limits, public.br_budget, public.br_admin_log from anon, authenticated, service_role;
-- Server functions (service_role). No truncate, ever. delete only where the engine or a purge needs it: br_reviews (cascades to the
-- children, which the append only triggers allow at depth > 1), competitors, and the working tables.
grant select, insert, update on public.br_reviews, public.br_provider_calls, public.br_competitors, public.br_evidence, public.br_ai_runs,
  public.br_report_versions, public.br_automation_opportunities, public.br_prospects, public.br_deliveries, public.br_rate_limits, public.br_budget to service_role;
grant select, insert on public.br_admin_log to service_role;
grant delete on public.br_reviews, public.br_competitors, public.br_provider_calls, public.br_rate_limits to service_role;
-- Owner (signed in workbook): read the review tables, update the prospect record. RLS policies above decide who the owner is.
grant select on public.br_reviews, public.br_provider_calls, public.br_competitors, public.br_evidence, public.br_ai_runs,
  public.br_report_versions, public.br_automation_opportunities, public.br_prospects, public.br_deliveries, public.br_admin_log to authenticated;
grant update on public.br_prospects to authenticated;
