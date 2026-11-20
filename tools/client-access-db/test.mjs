// ISOLATED DATABASE TEST for the client access migration, on a local PGlite copy of the live schema. Nothing here touches Supabase.
// Usage: PGLITE=<path to @electric-sql/pglite/dist/index.js> node tools/client-access-db/test.mjs
// Fictional data only (Maple Street Bakery). Prints PASS/FAIL per check and exits 1 on any failure.
import fs from 'fs'; import path from 'path'; import { fileURLToPath, pathToFileURL } from 'url';
const { PGlite } = await import(pathToFileURL(process.env.PGLITE || '').href);
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.join(HERE, '..', '..');
const MIG = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261120150000_client_access.sql'), 'utf8');
const RB = fs.readFileSync(path.join(ROOT, 'supabase/rollback/20261120150000_client_access_rollback.sql'), 'utf8');
const db = new PGlite(); await db.exec(fs.readFileSync(path.join(HERE, 'live-schema.sql'), 'utf8'));
let fails = 0, passes = 0; const ok = (n, v, x) => { v ? passes++ : fails++; console.log((v ? 'PASS ' : 'FAIL ') + n + (x ? ' (' + x + ')' : '')); };
const OWNER = 'rhyshume1997@gmail.com';
const EXISTING = ['client_workbooks', 'client_portals', 'client_answers', 'client_videos', 'client_quotes', 'quote_acceptances', 'leads', 'business_details'];
const NEWT = ['client_accounts', 'client_access_log', 'client_access_rate'];
const snapSql = `select md5(string_agg(x, '|' order by x)) h, count(*) n from (
 select 'tbl:'||c.relname||':'||coalesce(c.relacl::text,'')||':'||c.relrowsecurity||c.relforcerowsecurity x from pg_class c where relnamespace='public'::regnamespace and relkind='r' and relname = any($1)
 union all select 'col:'||table_name||'.'||column_name||':'||data_type||coalesce(column_default,'')||is_nullable from information_schema.columns where table_schema='public' and table_name = any($1)
 union all select 'pol:'||tablename||policyname||cmd||roles::text||coalesce(qual,'')||coalesce(with_check,'') from pg_policies where schemaname='public' and tablename = any($1)
 union all select 'fn:'||p.oid::regprocedure::text||md5(p.prosrc)||coalesce(p.proacl::text,'')||p.prosecdef::text||coalesce(p.proconfig::text,'') from pg_proc p where pronamespace='public'::regnamespace and proname = any($2)
 union all select 'trg:'||tgrelid::regclass::text||pg_get_triggerdef(oid) from pg_trigger where not tgisinternal and tgrelid::regclass::text = any($1)
 union all select 'idx:'||indexdef from pg_indexes where schemaname='public' and tablename = any($1)
 union all select 'con:'||conrelid::regclass::text||pg_get_constraintdef(oid) from pg_constraint where connamespace='public'::regnamespace and conrelid::regclass::text = any($1)) s`;
const EXFN = ['touch_updated_at', 'quotes_lock', 'acceptances_lock', 'portal_create', 'portal_revoke', 'portal_open', 'portal_save', 'quote_send', 'quote_renew'];
const snap = async () => JSON.stringify((await db.query(snapSql, [EXISTING, EXFN])).rows);
const objs = async () => (await db.query(`select (select count(*) from pg_class where relnamespace='public'::regnamespace and relname like 'client\\_access%' or relname='client_accounts') t, (select count(*) from pg_proc where pronamespace='public'::regnamespace and (proname like 'client\\_%')) f`)).rows[0];

// ---- migration lifecycle
const s0 = await snap(); await db.exec(MIG); const s1 = await snap();
ok('existing tables, columns, policies, grants, triggers, indexes, constraints and functions byte-identical after apply', s0 === s1, s0.slice(0, 60));
await db.exec(RB); const s2 = await snap(); const o2 = await objs();
ok('rollback restores the snapshot and removes every new object', s0 === s2 && o2.t === 0n || (s0 === s2 && Number(o2.t) === 0 && Number(o2.f) === 0), JSON.stringify(o2, (k, v) => typeof v === 'bigint' ? Number(v) : v));
await db.exec(MIG); const s3 = await snap(); ok('re-apply after rollback works and existing objects still identical', s0 === s3);

// ---- seed (as the postgres owner, bypassing RLS)
const U = { A: 'aaaaaaaa-0000-4000-8000-00000000000a', B: 'bbbbbbbb-0000-4000-8000-00000000000b', O: 'cccccccc-0000-4000-8000-00000000000c', X: 'dddddddd-0000-4000-8000-00000000000d' };
const WA = '11111111-0000-4000-8000-0000000000a1', WB = '22222222-0000-4000-8000-0000000000b2', QA = '33333333-0000-4000-8000-0000000000a3', QB = '44444444-0000-4000-8000-0000000000b4';
const SIG = 'data:image/png;base64,' + 'A'.repeat(300);
await db.exec(`
insert into auth.users(id,email) values ('${U.A}','maple@example.test'),('${U.B}','other@example.test'),('${U.O}','${OWNER}'),('${U.X}','x@example.test');
insert into public.client_workbooks(id,client_name,data) values ('${WA}','Maple Street Bakery','{"internal":"MARGIN-SECRET-A","pb":"PRICEBOOK-A"}'),('${WB}','Other Co','{"internal":"MARGIN-SECRET-B"}');
insert into public.client_portals(workbook_id,token_hash) values ('${WA}', sha256('ta')),('${WB}', sha256('tb'));
insert into public.client_answers(workbook_id,answers) values ('${WA}','{"discovery":{"a":{"q1":"A-ANSWER"}}}'),('${WB}','{"discovery":{"a":{"q1":"B-ANSWER"}}}');
insert into public.client_quotes(id,workbook_id,ref,snapshot,snapshot_hash,expires_at) values ('${QA}','${WA}','QA','{"once":100}','h1', now()+interval '3 days'),('${QB}','${WB}','QB','{"once":999}','h2', now()+interval '3 days');
insert into public.client_videos(workbook_id,path) values ('${WA}','a/v.mp4'); insert into public.leads(name,email) values ('Lead One','l@example.test'); insert into public.business_details(data) values ('{"n":"x"}');
insert into public.client_accounts(auth_user_id,workbook_id,email,must_change_password,temp_expires_at,session_epoch) values
 ('${U.A}','${WA}','maple@example.test', true, now()+interval '7 days', now()-interval '1 hour'),
 ('${U.B}','${WB}','other@example.test', false, null, now()-interval '1 hour');`);
const now = () => Math.floor(Date.now() / 1000);
const claims = (who, o = {}) => JSON.stringify(Object.assign({ sub: U[who], role: 'authenticated', aud: 'authenticated', email: { A: 'maple@example.test', B: 'other@example.test', O: OWNER, X: 'x@example.test' }[who], iat: now() }, o, { app_metadata: Object.assign({ role: 'client', must_change_password: false }, o.app_metadata || {}) }));
// run SQL as a role with claims; returns {ok, rows, err}. Always rolled back unless keep.
async function as(role, cl, sql, params, keep) {
  await db.exec('begin'); try {
    await db.exec(`set local role ${role}`); if (cl) await db.query(`select set_config('request.jwt.claims', $1, true)`, [cl]);
    const r = await db.query(sql, params || undefined); await db.exec(keep ? 'commit' : 'rollback'); return { ok: true, rows: r.rows, n: r.affectedRows };
  } catch (e) { await db.exec('rollback'); return { ok: false, err: String(e.message) }; }
}
const denied = r => !r.ok || (r.rows && r.rows.length === 0 && !(r.n > 0)) || r.n === 0;
const ALL = EXISTING.concat(NEWT);
const sample = { client_workbooks: `insert into public.client_workbooks(client_name) values ('x')`, client_portals: `insert into public.client_portals(workbook_id,token_hash) values ('${WA}', sha256('z'))`, client_answers: `insert into public.client_answers(workbook_id) values ('${WB}')`, client_videos: `insert into public.client_videos(workbook_id,path) values ('${WA}','p')`, client_quotes: `insert into public.client_quotes(workbook_id,snapshot,snapshot_hash) values ('${WA}','{}','h')`, quote_acceptances: `insert into public.quote_acceptances(quote_id,workbook_id,typed_name,signature,snapshot_hash) values ('${QA}','${WA}','n','s','h')`, leads: `insert into public.leads(name,email) values ('n','e')`, business_details: `insert into public.business_details(id,data) values (1,'{}')`, client_accounts: `insert into public.client_accounts(auth_user_id,workbook_id,email,temp_expires_at) values ('${U.X}','${WB}','x@example.test', now())`, client_access_log: `insert into public.client_access_log(actor,action) values ('x','create')`, client_access_rate: `insert into public.client_access_rate values ('b', now(), 1)` };
async function everyOp(who, role, cl, label) {
  const bad = [];
  for (const t of ALL) {
    for (const [op, sql] of [['select', `select * from public.${t}`], ['insert', sample[t]], ['update', `update public.${t} set ${t === 'client_workbooks' ? "client_name='hack'" : t === 'client_access_rate' ? 'hits=0' : t === 'client_accounts' ? "status='active'" : t === 'client_access_log' ? "actor='h'" : t === 'leads' ? "name='h'" : t === 'business_details' ? "data='{}'" : t === 'client_portals' ? 'active=true' : t === 'client_answers' ? "answers='{}'" : t === 'client_videos' ? "title='h'" : t === 'client_quotes' ? "ref='h'" : "typed_name='h'"}`], ['delete', `delete from public.${t}`], ['truncate', `truncate public.${t}`]]) {
      const r = await as(role, cl, sql); const wrote = r.ok && op !== 'select' && (r.n > 0), read = r.ok && op === 'select' && r.rows.length > 0, trunc = r.ok && op === 'truncate' && !EXISTING.includes(t); // TRUNCATE on the existing tables is a default grant already on the live project, see the INFO check below; the REST API has no truncate verb
      if (wrote || read || trunc) bad.push(t + '.' + op);
    }
  }
  ok(label + ': every select, insert, update, delete and truncate on every table denied (' + ALL.length * 5 + ' attempts; truncate counted for the 3 new tables only)', bad.length === 0, bad.join(','));
}
const fnDenied = async (role, cl, label, calls) => { const bad = []; for (const c of calls) { const r = await as(role, cl, c); if (r.ok) bad.push(c.slice(0, 40)); } ok(label, bad.length === 0, bad.join(' | ')); };
const CLIENT_FNS = [`select public.client_open()`, `select public.client_save('{}'::jsonb,false)`, `select public.client_quote(null)`, `select public.client_quote_accept('${QA}','Maple Owner','${SIG}')`];
const OWNER_FNS = [`select public.portal_create('${WA}')`, `select public.portal_revoke('${WA}')`, `select public.quote_send('${WA}','{}'::jsonb,5)`, `select public.quote_renew('${WA}',5)`];
const INTERNAL = [`select public.client_ctx()`, `select public.client_rate_hit('x',1,1)`];

// ---- privileges
const priv = (await db.query(`select r.rolname, t.relname, p.priv, has_table_privilege(r.rolname, t.oid, p.priv) h from pg_roles r, pg_class t, (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(priv) where r.rolname in ('anon','authenticated') and t.relnamespace='public'::regnamespace and t.relkind='r' and t.relname = any($1)`, [NEWT])).rows.filter(x => x.h);
ok('new tables: anon and authenticated hold no privilege at all (default ACLs would have given TRUNCATE)', priv.length === 0, JSON.stringify(priv.slice(0, 3)));
const sr = (await db.query(`select t.relname, array_agg(p.priv order by p.priv) pr from pg_class t, (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE')) p(priv) where t.relnamespace='public'::regnamespace and t.relname = any($1) and has_table_privilege('service_role', t.oid, p.priv) group by 1 order by 1`, [NEWT])).rows;
ok('service_role gets only what the server needs', JSON.stringify(sr) === JSON.stringify([{ relname: 'client_access_log', pr: ['INSERT', 'SELECT'] }, { relname: 'client_accounts', pr: ['DELETE', 'INSERT', 'SELECT', 'UPDATE'] }]), JSON.stringify(sr));
const rls = (await db.query(`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname = any($1)`, [NEWT])).rows; ok('RLS enabled and forced on all new tables, and they have no policies', rls.every(r => r.relrowsecurity && r.relforcerowsecurity) && (await db.query(`select 1 from pg_policies where tablename = any($1)`, [NEWT])).rows.length === 0);
const fa = (await db.query(`select p.proname, p.prosecdef, p.proconfig::text c, has_function_privilege('anon', p.oid, 'execute') an, has_function_privilege('authenticated', p.oid, 'execute') au, has_function_privilege('service_role', p.oid, 'execute') sr from pg_proc p where pronamespace='public'::regnamespace and proname like 'client\\_%'`)).rows;
const want = { client_whoami: [false, true, false], client_open: [false, true, false], client_save: [false, true, false], client_quote: [false, true, false], client_quote_accept: [false, true, false], client_ctx: [false, false, false], client_rate_hit: [false, false, true], client_access_log_lock: [false, false, false] };
ok('function grants: client_* to authenticated only, helpers to nobody, rate counter to service_role only; all SECURITY DEFINER with empty search_path', fa.every(f => JSON.stringify([f.an, f.au, f.sr]) === JSON.stringify(want[f.proname] || ['?'])) && fa.filter(f => f.prosecdef).every(f => /search_path=(\\?"){2}/.test(f.c)), JSON.stringify(fa.map(f => [f.proname, f.an, f.au, f.sr])));

const tr = (await db.query(`select r.rolname, string_agg(t.relname, ',' order by t.relname) ts from pg_roles r, pg_class t where r.rolname in ('anon','authenticated') and t.relnamespace='public'::regnamespace and t.relname = any($1) and has_table_privilege(r.rolname, t.oid, 'TRUNCATE') group by 1 order by 1`, [EXISTING])).rows;
ok('INFO (pre-existing, same before and after the migration, not changed by it): TRUNCATE is granted on existing tables to ' + tr.map(x => x.rolname + ' [' + x.ts + ']').join('; ') + '. RLS does not stop TRUNCATE; PostgREST has no truncate call, so it is reachable only over a direct database connection', true);
// ---- A with must_change_password true everywhere
await everyOp('A', 'authenticated', claims('A', { app_metadata: { must_change_password: true, temp_expires_at: new Date(Date.now() + 6e8).toISOString() } }), 'client A, password change pending');
await fnDenied('authenticated', claims('A', { app_metadata: { must_change_password: true } }), 'client A, password change pending: every client function and owner function refused', CLIENT_FNS.concat(OWNER_FNS, INTERNAL));
let r = await as('authenticated', claims('A', { app_metadata: { must_change_password: true } }), `select public.client_whoami() w`); ok('whoami works while change is pending and returns state only', r.ok && r.rows[0].w.state === 'must_change' && Object.keys(r.rows[0].w).join() === 'state');
// stale or mismatched flags
await fnDenied('authenticated', claims('A', { app_metadata: { must_change_password: false } }), 'JWT says false but account row says true (stale or forged token): refused', CLIENT_FNS);
await fnDenied('authenticated', JSON.stringify({ sub: U.A, role: 'authenticated', email: 'maple@example.test', iat: now(), app_metadata: { role: 'client' } }), 'flag missing from the JWT counts as true: refused', CLIENT_FNS);
// expired temp
await db.exec(`update public.client_accounts set temp_expires_at = now() - interval '1 minute' where auth_user_id='${U.A}'`);
r = await as('authenticated', claims('A', { app_metadata: { must_change_password: true } }), `select public.client_whoami() w`); ok('expired temporary password reports expired', r.ok && r.rows[0].w.state === 'expired');
await fnDenied('authenticated', claims('A'), 'expired temporary password: refused', CLIENT_FNS);
// clear the flag as the server would
await db.exec(`update public.client_accounts set must_change_password=false, temp_expires_at=null, password_changed_at=now(), session_epoch=now() - interval '2 seconds' where auth_user_id='${U.A}'`);
const GA = claims('A', { iat: now() });
await fnDenied('authenticated', claims('A', { iat: now() - 3600 }), 'token issued before the session epoch (before the change) refused', CLIENT_FNS);
r = await as('authenticated', GA, `select public.client_whoami() w`); ok('after the change whoami says ok', r.rows[0].w.state === 'ok');
r = await as('authenticated', GA, `select public.client_open() o`); const o = r.rows[0] && r.rows[0].o;
ok('client A sees their own name and answers, nothing from B, no internal data', r.ok && o.client_name === 'Maple Street Bakery' && o.answers.discovery.a.q1 === 'A-ANSWER' && !JSON.stringify(o).includes('MARGIN') && !JSON.stringify(o).includes('B-ANSWER') && !JSON.stringify(o).includes('PRICEBOOK'), JSON.stringify(Object.keys(o || {})));
r = await as('authenticated', GA, `select public.client_save('{"discovery":{"a":{"q1":"A-NEW"}},"internal":"HACK","price":1}'::jsonb, true) s`, null, true); ok('client A can save, and submit', r.ok && r.rows[0].s.saved === true, r.err);
const after = (await db.query(`select (select answers from public.client_answers where workbook_id='${WA}') a, (select answers from public.client_answers where workbook_id='${WB}') b, (select submitted_at is not null from public.client_portals where workbook_id='${WA}') sa, (select submitted_at is not null from public.client_portals where workbook_id='${WB}') sb`)).rows[0];
ok('save wrote only A, kept only the four allowed groups, marked A submitted and B untouched', after.a.discovery.a.q1 === 'A-NEW' && !('internal' in after.a) && !('price' in after.a) && after.b.discovery.a.q1 === 'B-ANSWER' && after.sa === true && after.sb === false);
r = await as('authenticated', GA, `select public.client_save('[]'::jsonb) s`); ok('malformed answers refused', !r.ok);
r = await as('authenticated', GA, `select public.client_quote(null) q`); ok('client A sees A quote only', r.ok && r.rows[0].q.state === 'open' && r.rows[0].q.id === QA);
r = await as('authenticated', GA, `select public.client_quote('${QB}') q`); ok("client A asking for B's quote gets nothing", r.ok && r.rows[0].q.state === 'none');
r = await as('authenticated', GA, `select public.client_quote_accept('${QB}','Maple Owner','${SIG}') q`); ok("client A cannot accept B's quote", !r.ok && /quote not found/.test(r.err));
r = await as('authenticated', GA, `select public.client_quote_accept('${QA}','M','${SIG}') q`); ok('name too short refused', !r.ok);
r = await as('authenticated', GA, `select public.client_quote_accept('${QA}','Maple Owner','data:image/png;base64,AAA') q`); ok('bad signature refused', !r.ok);
r = await as('authenticated', GA, `select public.client_quote_accept('${QA}','Maple Owner','${SIG}') q`, null, true); ok('client A can accept their own quote by typed name', r.ok && r.rows[0].q.state === 'accepted', r.err);
r = await as('authenticated', GA, `select public.client_quote_accept('${QA}','Maple Owner','${SIG}') q`); ok('accepting twice does not create a second record', r.ok && (await db.query(`select count(*)::int c from public.quote_acceptances where quote_id='${QA}'`)).rows[0].c === 1);
await everyOp('A', 'authenticated', GA, 'client A, change done (own data only through the functions)');
await fnDenied('authenticated', GA, 'client A cannot call owner functions or internal helpers', OWNER_FNS.concat(INTERNAL));
// forged claims
const FORGE = [['role only in user_metadata', JSON.stringify({ sub: U.A, role: 'authenticated', email: 'maple@example.test', iat: now(), user_metadata: { role: 'client' }, app_metadata: { must_change_password: false } })], ['app_metadata role admin', claims('A', { app_metadata: { role: 'admin' } })], ['app_metadata role owner', claims('A', { app_metadata: { role: 'owner' } })], ['postgres role claim not authenticated', claims('A', { role: 'service_role' })], ['email changed by the client', claims('A', { email: 'new@example.test' })], ['email case/space lookalike still same account is accepted only after lower+trim', null], ['unknown subject', claims('A', { sub: '99999999-0000-4000-8000-000000000099' })], ['garbage subject', claims('A', { sub: 'not-a-uuid' })], ['no iat', JSON.stringify({ sub: U.A, role: 'authenticated', email: 'maple@example.test', app_metadata: { role: 'client', must_change_password: false } })], ['must_change as string false', claims('A', { app_metadata: { must_change_password: 'false' } })], ['temp_expires_at in the past in token', claims('A', { app_metadata: { temp_expires_at: '2020-01-01T00:00:00Z' } })], ['temp_expires_at garbage', claims('A', { app_metadata: { temp_expires_at: 'soon' } })], ['no claims at all', null], ['claims is not json object', '[]']];
for (const [n, c] of FORGE) { if (c === null && /lookalike/.test(n)) continue; await fnDenied('authenticated', c, 'forged claims refused: ' + n, CLIENT_FNS); }
await fnDenied('anon', claims('A'), 'anon role with client claims cannot call any function', CLIENT_FNS.concat(INTERNAL));
r = await as('authenticated', claims('A', { email: ' Maple@Example.TEST ' }), `select public.client_open() o`); ok('email compare is on lower-cased trimmed values (Supabase stores lower case)', r.ok);
// B
const GB = claims('B');
r = await as('authenticated', GB, `select public.client_open() o`); ok('client B sees only B', r.ok && r.rows[0].o.client_name === 'Other Co' && r.rows[0].o.answers.discovery.a.q1 === 'B-ANSWER' && !JSON.stringify(r.rows[0].o).includes('Maple'));
r = await as('authenticated', GB, `select public.client_quote('${QA}') q`); ok("client B cannot see A's quote", r.rows[0].q.state === 'none');
await everyOp('B', 'authenticated', GB, 'client B');
await everyOp('X', 'authenticated', claims('X'), 'a client-role user with no account row');
await fnDenied('authenticated', claims('X'), 'user with no account row: all client functions refused', CLIENT_FNS);
// anon
await everyOp('A', 'anon', null, 'anon');
// disabled and epoch
await db.exec(`update public.client_accounts set status='disabled', disabled_at=now() where auth_user_id='${U.B}'`);
await fnDenied('authenticated', GB, 'disabled client is refused at once, even with a live token', CLIENT_FNS);
r = await as('authenticated', GB, `select public.client_whoami() w`); ok('disabled state reported', r.rows[0].w.state === 'disabled');
await db.exec(`update public.client_accounts set status='active', disabled_at=null, session_epoch=now() + interval '5 seconds' where auth_user_id='${U.B}'`);
await fnDenied('authenticated', GB, 'bumping the session epoch (reset) kills tokens issued before it', CLIENT_FNS);
// owner paths
const GO = JSON.stringify({ sub: U.O, role: 'authenticated', email: OWNER, iat: now() });
r = await as('authenticated', GO, `select count(*)::int c from public.client_workbooks`); ok('owner can still read all client workbooks', r.ok && r.rows[0].c === 2);
r = await as('authenticated', GO, `select public.portal_create('${WA}') t`); ok('owner can still create a link', r.ok && /^[0-9a-f]{48}$/.test(r.rows[0].t));
r = await as('authenticated', GO, `select count(*)::int c from public.leads`); ok('owner can still read leads', r.ok && r.rows[0].c === 1);
await fnDenied('authenticated', GO, 'owner is not a client: client_* functions refuse the owner token', CLIENT_FNS);
for (const t of NEWT) { r = await as('authenticated', GO, `select * from public.${t}`); ok('owner browser session cannot read ' + t + ' directly (server only)', !r.ok); }
// constraints
const ins = async (em) => as('postgres', null, `insert into public.client_accounts(auth_user_id,workbook_id,email,temp_expires_at) values ('${U.X}','${WB}',$1, now())`, [em]);
ok('account email must be lower case and trimmed', !(await ins('Upper@Example.test')).ok && !(await ins(' pad@example.test')).ok);
ok('account email may never be the owner email', !(await ins(OWNER)).ok);
ok('one login per client and one per auth user', !(await as('postgres', null, `insert into public.client_accounts(auth_user_id,workbook_id,email,temp_expires_at) values ('${U.X}','${WA}','z@example.test', now())`)).ok);
ok('a pending password change needs an expiry', !(await as('postgres', null, `insert into public.client_accounts(auth_user_id,workbook_id,email,must_change_password) values ('${U.X}','${WB}','x@example.test', true)`)).ok);
// log append only, rate
r = await as('service_role', null, `insert into public.client_access_log(actor,action,workbook_id,detail) values ('${OWNER}','create','${WA}','{"k":1}')`, null, true); ok('service role can append to the log', r.ok, r.err);
ok('log cannot be updated, deleted or truncated, even by the service role', !(await as('service_role', null, `update public.client_access_log set actor='x'`)).ok && !(await as('service_role', null, `delete from public.client_access_log`)).ok && !(await as('postgres', null, `truncate public.client_access_log`)).ok);
ok('log refuses an unknown action and an oversized detail', !(await as('service_role', null, `insert into public.client_access_log(actor,action) values ('a','hack')`)).ok && !(await as('service_role', null, `insert into public.client_access_log(actor,action,detail) values ('a','create', jsonb_build_object('x', repeat('y', 3000)))`)).ok);
r = await as('service_role', null, `select public.client_rate_hit('t',2,60) a, public.client_rate_hit('t',2,60) b, public.client_rate_hit('t',2,60) c`); ok('rate counter: third hit in the window is refused', r.ok && r.rows[0].a.allowed && r.rows[0].b.allowed && !r.rows[0].c.allowed);
ok('browser roles cannot call the rate counter', !(await as('authenticated', claims('A'), `select public.client_rate_hit('t',2,60)`)).ok);
ok('service role can create and update accounts (server path)', (await as('service_role', null, `update public.client_accounts set must_change_password=true, temp_expires_at=now()+interval '7 days' where auth_user_id='${U.A}'`)).n === 1);
const s4 = await snap(); ok('after the whole run the existing objects are still byte-identical to the live copy', s0 === s4);
console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
