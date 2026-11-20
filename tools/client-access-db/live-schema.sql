-- TEST FIXTURE: a reconstruction of the live public schema (project vkpdrqkwxkokolphmkbh) for the isolated PGlite test.
-- Built from SELECT-only reads of pg_class, pg_attribute, pg_policies, pg_proc, pg_trigger and default ACLs on 20 Nov 2026. No client rows.
-- Not the migration. Not applied anywhere. Fictional rows only.
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth; grant usage on schema auth to anon, authenticated, service_role;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$ select nullif(auth.jwt()->>'sub','')::uuid $$;
grant execute on function auth.jwt(), auth.uid() to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email varchar(255), raw_app_meta_data jsonb, last_sign_in_at timestamptz, banned_until timestamptz);
create schema extensions; -- PGlite has no pgcrypto here: a stand-in with the same signature for the one function the live portal_create calls
create function extensions.gen_random_bytes(n int) returns bytea language sql as $$ select decode(substr(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 1, n * 2), 'hex') $$;
grant usage on schema extensions to authenticated;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public grant truncate, references, trigger, maintain on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on functions from public;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
create table public.client_workbooks (id uuid primary key default gen_random_uuid(), client_name text not null, data jsonb not null default '{}', updated_at timestamptz not null default now(), created_at timestamptz not null default now());
create table public.client_portals (id uuid primary key default gen_random_uuid(), workbook_id uuid not null references public.client_workbooks(id) on delete cascade, token_hash bytea not null unique, active boolean not null default true, created_at timestamptz not null default now(), last_opened_at timestamptz, submitted_at timestamptz);
create index client_portals_workbook_idx on public.client_portals(workbook_id);
create table public.client_answers (workbook_id uuid primary key references public.client_workbooks(id) on delete cascade, answers jsonb not null default '{}', updated_at timestamptz not null default now());
create table public.client_videos (id uuid primary key default gen_random_uuid(), workbook_id uuid not null references public.client_workbooks(id) on delete cascade, path text not null, title text not null default '', note text not null default '', mime text not null default '', size bigint not null default 0, shown boolean not null default true, created_at timestamptz not null default now());
create table public.client_quotes (id uuid primary key default gen_random_uuid(), workbook_id uuid not null references public.client_workbooks(id) on delete cascade, ref text not null default '', version integer not null default 1, snapshot jsonb not null, snapshot_hash text not null, total_once numeric not null default 0, total_monthly numeric not null default 0, deposit numeric not null default 0, status text not null default 'open' check (status in ('open','replaced','accepted')), created_at timestamptz not null default now(), replaced_at timestamptz, expires_at timestamptz);
create table public.quote_acceptances (id uuid primary key default gen_random_uuid(), quote_id uuid not null unique references public.client_quotes(id) on delete cascade, workbook_id uuid not null references public.client_workbooks(id) on delete cascade, typed_name text not null, signature text not null, snapshot_hash text not null, total_once numeric not null default 0, total_monthly numeric not null default 0, deposit numeric not null default 0, ref text not null default '', version integer not null default 1, accepted_at timestamptz not null default now());
create table public.leads (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), name text not null, business text not null default '', email text not null, phone text not null default '', message text not null default '', picks jsonb not null default '{}', consent boolean not null default false, handled boolean not null default false, workbook_id uuid);
create table public.business_details (id integer primary key check (id = 1) default 1, data jsonb not null default '{}' check (jsonb_typeof(data)='object' and octet_length(data::text) < 4000), updated_at timestamptz not null default now());

alter table public.client_workbooks enable row level security;
alter table public.client_portals enable row level security;
alter table public.client_answers enable row level security;
alter table public.client_videos enable row level security;
alter table public.client_quotes enable row level security;
alter table public.quote_acceptances enable row level security;
alter table public.leads enable row level security;
alter table public.business_details enable row level security;
create policy "owner only" on public.business_details for all to public using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com')) with check (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
create policy "owner only" on public.client_answers for all to authenticated using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com')) with check (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
create policy "owner only" on public.client_portals for all to authenticated using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com')) with check (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
create policy "owner only" on public.client_videos for all to public using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com')) with check (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
create policy "owner only" on public.client_workbooks for all to authenticated using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com')) with check (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
create policy "owner only" on public.leads for all to public using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com')) with check (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
create policy "owner read" on public.client_quotes for select to public using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
create policy "owner read" on public.quote_acceptances for select to public using (((select auth.jwt() ->> 'email') = 'rhyshume1997@gmail.com'));
revoke all on all tables in schema public from anon, authenticated, service_role;
grant truncate, references, trigger, maintain on all tables in schema public to anon, authenticated, service_role;
grant select, insert, update, delete on public.client_workbooks, public.client_portals, public.client_answers, public.client_videos to authenticated;
grant select, insert, update on public.business_details to authenticated; grant select, update, delete on public.leads to authenticated;
grant select on public.client_quotes, public.quote_acceptances to authenticated;
create function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end $$;
create function public.quotes_lock() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'accepted' and pg_trigger_depth() <= 1 then raise exception 'accepted quotes cannot be deleted'; end if;
    return old;
  end if;
  if old.status = 'accepted' and (new.snapshot is distinct from old.snapshot or new.snapshot_hash is distinct from old.snapshot_hash or new.status is distinct from old.status or new.ref is distinct from old.ref or new.version is distinct from old.version or new.total_once is distinct from old.total_once or new.total_monthly is distinct from old.total_monthly or new.deposit is distinct from old.deposit or new.workbook_id is distinct from old.workbook_id) then
    raise exception 'accepted quotes cannot be changed, send a new version';
  end if;
  return new;
end $$;
create function public.acceptances_lock() returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  raise exception 'acceptance records cannot be changed or deleted';
end $$;
create trigger business_details_touch before update on public.business_details for each row execute function public.touch_updated_at();
create trigger client_workbooks_touch before update on public.client_workbooks for each row execute function public.touch_updated_at();
create trigger client_quotes_lock before delete or update on public.client_quotes for each row execute function public.quotes_lock();
create trigger quote_acceptances_lock before delete or update on public.quote_acceptances for each row execute function public.acceptances_lock();
-- the live token portal functions (bodies as read from pg_proc)
create function public.portal_create(p_workbook_id uuid) returns text language plpgsql security definer set search_path = '' as $$
declare t text;
begin
  if (auth.jwt() ->> 'email') is distinct from 'rhyshume1997@gmail.com' then raise exception 'not allowed'; end if;
  update public.client_portals set active = false where workbook_id = p_workbook_id and active;
  t := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.client_portals(workbook_id, token_hash) values (p_workbook_id, sha256(convert_to(t, 'utf8')));
  return t;
end $$;
create function public.portal_revoke(p_workbook_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if (auth.jwt() ->> 'email') is distinct from 'rhyshume1997@gmail.com' then raise exception 'not allowed'; end if;
  update public.client_portals set active = false where workbook_id = p_workbook_id;
end $$;
create function public.portal_open(p_token text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.client_portals; r jsonb;
begin
  select * into p from public.client_portals where token_hash = sha256(convert_to(p_token, 'utf8')) and active;
  if not found then return null; end if;
  update public.client_portals set last_opened_at = now() where id = p.id;
  select jsonb_build_object('client_name', w.client_name, 'answers', coalesce(a.answers, '{}'::jsonb), 'submitted_at', p.submitted_at)
  into r from public.client_workbooks w left join public.client_answers a on a.workbook_id = w.id where w.id = p.workbook_id;
  return r;
end $$;
create function public.portal_save(p_token text, p_answers jsonb, p_submit boolean default false) returns jsonb language plpgsql security definer set search_path = '' as $$
declare p public.client_portals; clean jsonb := '{}'::jsonb; k text;
begin
  select * into p from public.client_portals where token_hash = sha256(convert_to(p_token, 'utf8')) and active;
  if not found then return null; end if;
  if pg_column_size(p_answers) > 8000000 then raise exception 'too large'; end if;
  foreach k in array array['discovery','eligibility','evidence','brand'] loop
    if p_answers ? k then clean := clean || jsonb_build_object(k, p_answers -> k); end if;
  end loop;
  insert into public.client_answers(workbook_id, answers, updated_at) values (p.workbook_id, clean, now())
  on conflict (workbook_id) do update set answers = excluded.answers, updated_at = now();
  if p_submit then update public.client_portals set submitted_at = now() where id = p.id; end if;
  return jsonb_build_object('saved', true, 'submitted', p_submit);
end $$;
create function public.quote_send(p_workbook_id uuid, p_snapshot jsonb, p_days integer default 5) returns jsonb language plpgsql security definer set search_path = '' as $$
declare h text; cur public.client_quotes; v int; nid uuid; r text; ex timestamptz;
begin
  if (auth.jwt() ->> 'email') is distinct from 'rhyshume1997@gmail.com' then raise exception 'not allowed'; end if;
  h := encode(sha256(convert_to(p_snapshot::text, 'utf8')), 'hex');
  select * into cur from public.client_quotes where workbook_id = p_workbook_id order by created_at desc limit 1;
  v := coalesce(cur.version, 0) + 1; r := left(coalesce(p_snapshot ->> 'ref', ''), 40); ex := now() + make_interval(days => p_days);
  update public.client_quotes set status = 'replaced', replaced_at = now() where workbook_id = p_workbook_id and status = 'open';
  insert into public.client_quotes(workbook_id, ref, version, snapshot, snapshot_hash, total_once, total_monthly, deposit, expires_at)
  values (p_workbook_id, r, v, p_snapshot, h, coalesce((p_snapshot ->> 'once')::numeric, 0), coalesce((p_snapshot ->> 'monthly')::numeric, 0), coalesce((p_snapshot ->> 'deposit')::numeric, 0), ex) returning id into nid;
  return jsonb_build_object('id', nid, 'version', v, 'status', 'open');
end $$;
create function public.quote_renew(p_workbook_id uuid, p_days integer default 5) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if (auth.jwt() ->> 'email') is distinct from 'rhyshume1997@gmail.com' then raise exception 'not allowed'; end if;
  return '{}'::jsonb;
end $$;
-- live function ACLs: portal_open, portal_save, portal_quote*: anon+authenticated; owner functions: authenticated
revoke all on all functions in schema public from public;
grant execute on function public.portal_open(text), public.portal_save(text, jsonb, boolean) to anon, authenticated;
grant execute on function public.portal_create(uuid), public.portal_revoke(uuid), public.quote_send(uuid, jsonb, integer), public.quote_renew(uuid, integer) to authenticated;
