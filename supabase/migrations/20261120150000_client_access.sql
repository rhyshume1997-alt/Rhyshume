-- Client access: logins for clients (temporary password, forced change) mapped to their own portal data only.
-- STATUS: NOT APPLIED. Written 20 Nov 2026 for review. Do not apply to project vkpdrqkwxkokolphmkbh without Rhys's go ahead.
-- Rollback: supabase/rollback/20261120150000_client_access_rollback.sql
--
-- Inputs : server routes (api/client-access.js, api/client-change-password.js) using the service role key write client_accounts,
--          client_access_log and the rate counter. Signed in clients call only the client_* functions below, with their own JWT.
-- Outputs: tables client_accounts, client_access_log, client_access_rate; functions client_ctx (internal), client_whoami, client_open,
--          client_save, client_quote, client_quote_accept, client_rate_hit.
-- Must not change: existing tables (client_workbooks, client_portals, client_answers, client_videos, client_quotes, quote_acceptances,
--          leads, business_details) and their policies and grants are NOT altered. Their owner-only policies keep denying clients,
--          because a client's email is never the owner's. Clients get data only through the SECURITY DEFINER functions here.
-- Conventions copied from the live schema and the Business Review review: explicit GRANTs (default privileges would hand TRUNCATE to
--          every role), RLS on with no policy for browsers, SECURITY DEFINER with an empty search_path, lock triggers in the
--          style of quotes_lock, lower-case owner email.

-- ------------------------------------------------------------------------------------------------ client_accounts
create table public.client_accounts (
  id                    uuid primary key default gen_random_uuid(),
  auth_user_id          uuid not null unique references auth.users(id) on delete cascade,
  workbook_id           uuid not null unique references public.client_workbooks(id) on delete cascade,
  portal_id             uuid references public.client_portals(id) on delete set null,
  email                 text not null check (email = lower(btrim(email)) and char_length(email) between 3 and 254 and email <> 'rhyshume1997@gmail.com'),
  status                text not null default 'active' check (status in ('active','disabled')),
  must_change_password  boolean not null default true,
  temp_expires_at       timestamptz,
  session_epoch         timestamptz not null default now(),   -- tokens issued before this are refused (reset, change, disable)
  created_at            timestamptz not null default now(),
  disabled_at           timestamptz,
  password_changed_at   timestamptz,
  check ((status = 'disabled') = (disabled_at is not null)),
  check (must_change_password = false or temp_expires_at is not null)
);
create index client_accounts_email_idx on public.client_accounts (email);
alter table public.client_accounts enable row level security;
alter table public.client_accounts force row level security;
-- no policy on purpose: browsers (anon, authenticated) can never read or write this table. The server uses the service role.
revoke all on table public.client_accounts from public, anon, authenticated, service_role;
grant select, insert, update, delete on table public.client_accounts to service_role;

-- ------------------------------------------------------------------------------------------------ audit log (append only)
create table public.client_access_log (
  id           uuid primary key default gen_random_uuid(),
  at           timestamptz not null default now(),
  actor        text not null check (char_length(actor) <= 254),
  action       text not null check (action in ('create','reset','disable','enable','delete','email_login_info','email_password_warning','change_password','status')),
  workbook_id  uuid,                    -- no foreign key: the record outlives the client
  detail       jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object' and pg_column_size(detail) < 2000)
);
create index client_access_log_wb_idx on public.client_access_log (workbook_id, at desc);
alter table public.client_access_log enable row level security;
alter table public.client_access_log force row level security;
revoke all on table public.client_access_log from public, anon, authenticated, service_role;
grant select, insert on table public.client_access_log to service_role;
create or replace function public.client_access_log_lock() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'the client access log cannot be changed or deleted'; end $$;
revoke all on function public.client_access_log_lock() from public, anon, authenticated, service_role;
create trigger client_access_log_lock before update or delete on public.client_access_log for each row execute function public.client_access_log_lock();
create trigger client_access_log_nolock_truncate before truncate on public.client_access_log for each statement execute function public.client_access_log_lock();

-- ------------------------------------------------------------------------------------------------ rate counter
create table public.client_access_rate (
  bucket       text primary key check (char_length(bucket) <= 120),
  window_start timestamptz not null,
  hits         integer not null
);
alter table public.client_access_rate enable row level security;
alter table public.client_access_rate force row level security;
revoke all on table public.client_access_rate from public, anon, authenticated, service_role;
create or replace function public.client_rate_hit(p_bucket text, p_max int, p_window_seconds int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.client_access_rate; t timestamptz := now();
begin
  if p_max < 1 or p_window_seconds < 1 then raise exception 'bad limit'; end if;
  insert into public.client_access_rate as b (bucket, window_start, hits) values (p_bucket, t, 1)
  on conflict (bucket) do update set
    window_start = case when b.window_start < t - make_interval(secs => p_window_seconds) then t else b.window_start end,
    hits         = case when b.window_start < t - make_interval(secs => p_window_seconds) then 1 else b.hits + 1 end
  returning * into r;
  return jsonb_build_object('allowed', r.hits <= p_max, 'hits', r.hits,
    'retry_after_s', greatest(0, ceil(extract(epoch from (r.window_start + make_interval(secs => p_window_seconds) - t)))::int));
end $$;
revoke all on function public.client_rate_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.client_rate_hit(text, int, int) to service_role;

-- ------------------------------------------------------------------------------------------------ the gate every client function uses
-- Returns the caller's account only when ALL of these hold; otherwise raises 'not allowed' (one generic message, nothing about why).
--   app_metadata.role = 'client' (app_metadata can only be set by the service role, user_metadata is never read)
--   the token's subject has an account row, status active, and the token email still equals the account email
--   must_change_password is false in the token (explicitly false, a missing flag counts as true) AND in the account row
--   the temporary password window has not passed (row) and the token's own temp_expires_at, if present, has not passed
--   the token was issued at or after the account's session_epoch (a reset, change or disable bumps it)
create or replace function public.client_ctx() returns public.client_accounts
language plpgsql stable security definer set search_path = '' as $$
declare c jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb; a public.client_accounts; sub uuid; iat numeric; tx timestamptz;
begin
  begin sub := (c ->> 'sub')::uuid; iat := (c ->> 'iat')::numeric; exception when others then raise exception 'not allowed'; end;
  if sub is null or iat is null then raise exception 'not allowed'; end if;
  if (c ->> 'role') is distinct from 'authenticated' then raise exception 'not allowed'; end if;
  if (c -> 'app_metadata' ->> 'role') is distinct from 'client' then raise exception 'not allowed'; end if;
  if (c -> 'app_metadata' -> 'must_change_password') is distinct from 'false'::jsonb then raise exception 'not allowed'; end if;
  begin tx := (c -> 'app_metadata' ->> 'temp_expires_at')::timestamptz; exception when others then raise exception 'not allowed'; end;
  if tx is not null and tx < now() then raise exception 'not allowed'; end if;
  select * into a from public.client_accounts where auth_user_id = sub;
  if not found or a.status <> 'active' or a.must_change_password then raise exception 'not allowed'; end if;
  if a.temp_expires_at is not null and a.temp_expires_at < now() then raise exception 'not allowed'; end if;
  if lower(btrim(coalesce(c ->> 'email', ''))) is distinct from a.email then raise exception 'not allowed'; end if;
  if iat < floor(extract(epoch from a.session_epoch)) then raise exception 'not allowed'; end if;
  return a;
end $$;
revoke all on function public.client_ctx() from public, anon, authenticated, service_role;

-- State only, no data. Callable while a password change is pending so the page can say what to do. Never raises for a wrong state.
create or replace function public.client_whoami() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb; a public.client_accounts; sub uuid;
begin
  begin sub := (c ->> 'sub')::uuid; exception when others then return jsonb_build_object('state', 'none'); end;
  if (c -> 'app_metadata' ->> 'role') is distinct from 'client' then return jsonb_build_object('state', 'none'); end if;
  select * into a from public.client_accounts where auth_user_id = sub;
  if not found then return jsonb_build_object('state', 'none'); end if;
  if a.status <> 'active' then return jsonb_build_object('state', 'disabled'); end if;
  if a.must_change_password then
    return jsonb_build_object('state', case when a.temp_expires_at < now() then 'expired' else 'must_change' end);
  end if;
  return jsonb_build_object('state', 'ok');
end $$;

-- Mirrors portal_open, for the signed in client's own workbook.
create or replace function public.client_open() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.client_accounts; p public.client_portals; r jsonb;
begin
  a := public.client_ctx();
  select * into p from public.client_portals where workbook_id = a.workbook_id order by created_at desc limit 1;
  if found then update public.client_portals set last_opened_at = now() where id = p.id; end if;
  select jsonb_build_object('client_name', w.client_name, 'answers', coalesce(x.answers, '{}'::jsonb), 'submitted_at', p.submitted_at)
    into r from public.client_workbooks w left join public.client_answers x on x.workbook_id = w.id where w.id = a.workbook_id;
  return r;
end $$;

-- Mirrors portal_save. Same four allowed answer groups, same size cap.
create or replace function public.client_save(p_answers jsonb, p_submit boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.client_accounts; clean jsonb := '{}'::jsonb; k text; pid uuid;
begin
  a := public.client_ctx();
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'bad answers'; end if;
  if pg_column_size(p_answers) > 8000000 then raise exception 'too large'; end if;
  foreach k in array array['discovery','eligibility','evidence','brand'] loop
    if p_answers ? k then clean := clean || jsonb_build_object(k, p_answers -> k); end if;
  end loop;
  insert into public.client_answers(workbook_id, answers, updated_at) values (a.workbook_id, clean, now())
  on conflict (workbook_id) do update set answers = excluded.answers, updated_at = now();
  if p_submit then
    select id into pid from public.client_portals where workbook_id = a.workbook_id order by created_at desc limit 1;
    if pid is null then -- the workbook reads "sent to you" from client_portals, so keep a switched off placeholder row for it
      insert into public.client_portals(workbook_id, token_hash, active, submitted_at)
      values (a.workbook_id, sha256(convert_to(gen_random_uuid()::text || clock_timestamp()::text, 'utf8')), false, now());
    else update public.client_portals set submitted_at = now() where id = pid; end if;
  end if;
  return jsonb_build_object('saved', true, 'submitted', p_submit);
end $$;

-- Mirrors portal_quote and portal_quote_accept for the client's own workbook.
create or replace function public.client_quote(p_quote_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.client_accounts; q public.client_quotes; z public.quote_acceptances; latest uuid;
begin
  a := public.client_ctx();
  select id into latest from public.client_quotes where workbook_id = a.workbook_id order by created_at desc limit 1;
  if p_quote_id is null then p_quote_id := latest; end if;
  if p_quote_id is null then return jsonb_build_object('state', 'none'); end if;
  select * into q from public.client_quotes where id = p_quote_id and workbook_id = a.workbook_id;
  if not found then return jsonb_build_object('state', 'none'); end if;
  if q.status = 'replaced' then return jsonb_build_object('state', 'replaced', 'id', q.id, 'latest', latest); end if;
  if q.status = 'accepted' then
    select * into z from public.quote_acceptances where quote_id = q.id;
    return jsonb_build_object('state', 'accepted', 'id', q.id, 'ref', q.ref, 'version', q.version, 'snapshot', q.snapshot,
      'accepted', jsonb_build_object('name', z.typed_name, 'at', z.accepted_at, 'signature', z.signature, 'hash', z.snapshot_hash));
  end if;
  if q.expires_at is not null and q.expires_at < now() then return jsonb_build_object('state', 'expired', 'id', q.id); end if;
  return jsonb_build_object('state', 'open', 'id', q.id, 'ref', q.ref, 'version', q.version, 'snapshot', q.snapshot, 'expires_at', q.expires_at);
end $$;

create or replace function public.client_quote_accept(p_quote_id uuid, p_name text, p_signature text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a public.client_accounts; q public.client_quotes; z public.quote_acceptances;
begin
  a := public.client_ctx();
  select * into q from public.client_quotes where id = p_quote_id and workbook_id = a.workbook_id for update;
  if not found then raise exception 'quote not found'; end if;
  if q.status = 'replaced' then return jsonb_build_object('state', 'replaced', 'id', q.id); end if;
  if q.status = 'accepted' then
    select * into z from public.quote_acceptances where quote_id = q.id;
    return jsonb_build_object('state', 'accepted', 'id', q.id, 'accepted', jsonb_build_object('name', z.typed_name, 'at', z.accepted_at));
  end if;
  if q.expires_at is not null and q.expires_at < now() then return jsonb_build_object('state', 'expired', 'id', q.id); end if;
  p_name := btrim(coalesce(p_name, ''));
  if char_length(p_name) < 2 or char_length(p_name) > 120 then raise exception 'name needed'; end if;
  if p_signature is null or p_signature !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$' or char_length(p_signature) > 400000 or char_length(p_signature) < 200 then
    raise exception 'signature needed';
  end if;
  insert into public.quote_acceptances(quote_id, workbook_id, typed_name, signature, snapshot_hash, total_once, total_monthly, deposit, ref, version)
  values (q.id, q.workbook_id, p_name, p_signature, q.snapshot_hash, q.total_once, q.total_monthly, q.deposit, q.ref, q.version)
  returning * into z;
  update public.client_quotes set status = 'accepted' where id = q.id;
  return jsonb_build_object('state', 'accepted', 'id', q.id, 'accepted', jsonb_build_object('name', z.typed_name, 'at', z.accepted_at));
end $$;

-- explicit function grants: nobody by default, then only what is needed
revoke all on function public.client_whoami(), public.client_open(), public.client_save(jsonb, boolean), public.client_quote(uuid), public.client_quote_accept(uuid, text, text) from public, anon, authenticated, service_role;
grant execute on function public.client_whoami(), public.client_open(), public.client_save(jsonb, boolean), public.client_quote(uuid), public.client_quote_accept(uuid, text, text) to authenticated;
