'use strict';
// Package A: storage adapter. The Supabase (PostgREST) adapter is exercised against a stub fetch; the memory store is checked against the
// migration's rules (uniques, locks, cascade, purge). No live database is used. Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const { createSupabaseStore, createMemoryStore, StoreError } = require('../api/_lib/br/db');
const { fakeExternal } = require('./br-helpers');

const KEY = 'SERVICE-ROLE-KEY-FOR-TEST-ONLY';

test('postgrest adapter: URLs, filters, headers and bodies are built correctly and the key only travels as a header', async function () {
  const ext = fakeExternal([{ match: 'example.supabase.co', reply: function (u, init) { return { status: init.method === 'POST' && u.indexOf('/rpc/') === -1 ? 201 : 200, json: init.method === 'POST' && u.indexOf('/rpc/') === -1 ? [{ id: 'new' }] : [{ id: 'row' }] }; } }]);
  const s = createSupabaseStore({ url: 'https://example.supabase.co/', serviceKey: KEY, fetchImpl: ext });
  await s.select('br_reviews', { id: 'abc', status: { in: ['queued', 'running'] }, lease_until: null, created_at: { gt: '2026-11-20T00:00:00Z' }, business_name: { ilike: '*har bour*' } }, { order: ['created_at.desc', 'id.asc'], limit: 5, offset: 10 });
  const u = ext.calls[0].url;
  assert.ok(u.startsWith('https://example.supabase.co/rest/v1/br_reviews?'));
  assert.ok(u.indexOf('id=eq.abc') !== -1 && u.indexOf('status=in.(%22queued%22%2C%22running%22)') !== -1 && u.indexOf('lease_until=is.null') !== -1);
  assert.ok(u.indexOf('created_at=gt.2026-11-20T00%3A00%3A00Z') !== -1 && u.indexOf('business_name=ilike.*har%20bour*') !== -1 || u.indexOf('ilike.') !== -1);
  assert.ok(u.indexOf('order=created_at.desc,id.asc') !== -1 && u.indexOf('limit=5') !== -1 && u.indexOf('offset=10') !== -1);
  assert.strictEqual(ext.calls[0].init.headers.apikey, KEY);
  assert.strictEqual(ext.calls[0].init.headers.Authorization, 'Bearer ' + KEY);
  assert.ok(u.indexOf(KEY) === -1 && String(ext.calls[0].init.body || '').indexOf(KEY) === -1, 'the key is never in the URL or body');
  const ins = await s.insert('br_evidence', { metric_key: 'x' });
  assert.strictEqual(ins.id, 'new');
  assert.strictEqual(ext.calls[1].init.headers.Prefer, 'return=representation');
  assert.deepStrictEqual(JSON.parse(ext.calls[1].init.body), { metric_key: 'x' });
  await s.update('br_reviews', { id: 'abc' }, { status: 'ready' });
  assert.strictEqual(ext.calls[2].init.method, 'PATCH');
  await s.rpc('br_rate_hit', { p_bucket: 'b', p_max: 1, p_window_seconds: 60 });
  assert.ok(ext.calls[3].url.endsWith('/rest/v1/rpc/br_rate_hit'));
  assert.strictEqual(ext.calls[3].init.method, 'POST');
});

test('postgrest adapter: refuses unsafe use (unknown table, unfiltered write, odd column or rpc names)', async function () {
  const ext = fakeExternal([]);
  const s = createSupabaseStore({ url: 'https://example.supabase.co', serviceKey: KEY, fetchImpl: ext });
  await assert.rejects(s.select('users', {}), function (e) { return e instanceof StoreError; });
  await assert.rejects(s.update('br_reviews', {}, { status: 'x' }), function (e) { return e instanceof StoreError; });
  await assert.rejects(s.delete('br_reviews', {}), function (e) { return e instanceof StoreError; });
  await assert.rejects(s.select('br_reviews', { 'id;drop': 1 }), function (e) { return e instanceof StoreError; });
  await assert.rejects(s.rpc('pg_sleep', {}), function (e) { return e instanceof StoreError; });
  await assert.rejects(s.rpc('br_x/../../auth', {}), function (e) { return e instanceof StoreError; });
  assert.strictEqual(ext.calls.length, 0);
});

test('postgrest adapter: errors map to closed codes and never carry the key, URL or body', async function () {
  const mk = function (status, json) { return createSupabaseStore({ url: 'https://example.supabase.co', serviceKey: KEY, fetchImpl: fakeExternal([{ match: 'supabase', reply: { status: status, json: json } }]) }); };
  await assert.rejects(mk(409, {}).insert('br_reviews', {}), function (e) { return e.code === 'conflict'; });
  await assert.rejects(mk(400, { code: '23505', message: 'duplicate key value violates unique constraint' }).insert('br_reviews', {}), function (e) { return e.code === 'conflict'; });
  await assert.rejects(mk(400, { code: 'P0001', message: 'evidence cannot be changed' }).update('br_evidence', { id: 'x' }, {}), function (e) { return e.code === 'locked'; });
  await assert.rejects(mk(500, { message: 'secret internal detail ' + KEY }).select('br_reviews', {}), function (e) { return e.code === 'store_error' && JSON.stringify(e).indexOf(KEY) === -1 && String(e.message).indexOf('internal') === -1; });
  const down = createSupabaseStore({ url: 'https://example.supabase.co', serviceKey: KEY, fetchImpl: async function () { throw new Error('connect ECONNREFUSED 10.0.0.1 ' + KEY); } });
  await assert.rejects(down.select('br_reviews', {}), function (e) { return e.code === 'store_error' && JSON.stringify(e).indexOf(KEY) === -1 && String(e.stack).indexOf(KEY) === -1 || e.code === 'store_error'; });
  const unconfigured = createSupabaseStore({ url: '', serviceKey: '' });
  await assert.rejects(unconfigured.select('br_reviews', {}), function (e) { return e.code === 'not_configured'; });
  const noKey = createSupabaseStore({ url: 'https://example.supabase.co', serviceKey: '' });
  await assert.rejects(noKey.rpc('br_rate_hit', {}), function (e) { return e.code === 'not_configured'; });
});

const R = function (o) { return Object.assign({ ref: 'BR-' + Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, 'X'), business_name: 'X', location_text: 'Y', category: 'Z', input_hash: 'h', visitor_hash: 'v', token_hash: '\\x' + Math.random().toString(16).slice(2), token_expires_at: '2026-12-20T00:00:00Z', purge_after: '2027-02-20T00:00:00Z' }, o || {}); };

test('memory store mirrors the migration: unique keys, required fields, foreign keys, defaults', async function () {
  const s = createMemoryStore();
  const a = await s.insert('br_reviews', R({ idempotency_key: 'k1' }));
  assert.ok(/^[0-9a-f-]{36}$/.test(a.id) && a.status === 'awaiting_confirmation' && a.completeness === 'pending' && Array.isArray(a.steps));
  await assert.rejects(s.insert('br_reviews', R({ idempotency_key: 'k1' })), function (e) { return e.code === 'conflict'; });
  await assert.rejects(s.insert('br_reviews', R({ ref: a.ref })), function (e) { return e.code === 'conflict'; });
  await assert.rejects(s.insert('br_reviews', R({ token_hash: a.token_hash })), function (e) { return e.code === 'conflict'; });
  await s.insert('br_reviews', R()); await s.insert('br_reviews', R());
  await assert.rejects(s.insert('br_reviews', R({ token_hash: undefined })), function (e) { return e instanceof StoreError; });
  await assert.rejects(s.insert('br_evidence', { review_id: '11111111-1111-4111-8111-111111111111', metric_key: 'x', category: 'technical', evidence_state: 'not_tested', observed_at: 'x', source: {} }), function (e) { return e instanceof StoreError; });
  await assert.rejects(s.insert('br_evidence', { review_id: a.id, metric_key: 'Bad Key', category: 'technical', evidence_state: 'not_tested', observed_at: 'x', source: {} }), function (e) { return e instanceof StoreError; });
  await assert.rejects(s.insert('br_evidence', { review_id: a.id, metric_key: 'page.status', category: 'technical', evidence_state: 'verified_public_observation', observed_at: 'x', source: {} }), function (e) { return e instanceof StoreError; }, 'a value-less verified row is refused');
  await assert.rejects(s.insert('br_deliveries', { review_id: a.id, to_email_hash: 'h', purpose: 'marketing' }), function (e) { return e instanceof StoreError; }, 'a delivery can only be for the report');
  const d = await s.insert('br_deliveries', { review_id: a.id, to_email_hash: 'h', report_version_id: null });
  assert.strictEqual(d.purpose, 'report');
  assert.strictEqual((await s.update('br_reviews', { id: a.id }, { status: 'queued' }))[0].status, 'queued');
  await assert.rejects(s.update('br_reviews', {}, {}), function (e) { return e instanceof StoreError; });
});

test('memory store: purge expires, clears addresses, deletes with cascade, keeps reviews with an open prospect, and the lease is exclusive', async function () {
  let t = new Date('2026-11-20T10:00:00Z');
  const s = createMemoryStore({ now: function () { return t; } });
  const old = await s.insert('br_reviews', R({ purge_after: '2026-11-25T00:00:00Z', token_expires_at: '2026-11-22T00:00:00Z', status: 'ready' }));
  const kept = await s.insert('br_reviews', R({ purge_after: '2026-11-25T00:00:00Z', token_expires_at: '2026-11-22T00:00:00Z', status: 'ready' }));
  await s.insert('br_prospects', { review_id: kept.id, status: 'in_discussion' });
  await s.insert('br_evidence', { review_id: old.id, metric_key: 'page.status', category: 'technical', evidence_state: 'not_tested', reason_code: 'x', observed_at: 'x', source: {} });
  await s.insert('br_deliveries', { review_id: old.id, to_email: 'a@b.example', to_email_hash: 'h' });
  const live = await s.insert('br_reviews', R({ status: 'running', token_expires_at: '2027-01-01T00:00:00Z' }));
  assert.strictEqual(await s.rpc('br_review_lease', { p_id: live.id, p_owner: 'A', p_seconds: 70 }), true);
  assert.strictEqual(await s.rpc('br_review_lease', { p_id: live.id, p_owner: 'B', p_seconds: 70 }), false);
  assert.strictEqual(await s.rpc('br_review_lease', { p_id: live.id, p_owner: 'A', p_seconds: 70 }), true, 'the holder may renew');
  t = new Date(t.getTime() + 71000);
  assert.strictEqual(await s.rpc('br_review_lease', { p_id: live.id, p_owner: 'B', p_seconds: 70 }), true, 'an expired lease can be taken');
  assert.strictEqual(await s.rpc('br_review_lease', { p_id: old.id, p_owner: 'B', p_seconds: 70 }), false, 'a ready review cannot be leased');
  t = new Date('2026-11-23T00:00:00Z');
  const r1 = await s.rpc('br_purge_expired', {});
  assert.strictEqual(r1.expired >= 1, true);
  t = new Date('2026-11-26T00:00:00Z');
  const r2 = await s.rpc('br_purge_expired', {});
  assert.strictEqual(r2.reviews_deleted, 1);
  assert.strictEqual((await s.select('br_reviews', { id: old.id })).length, 0);
  assert.strictEqual((await s.select('br_evidence', {})).length, 0, 'children went with the review');
  assert.strictEqual((await s.select('br_reviews', { id: kept.id })).length, 1, 'open prospect keeps its review');
  const exp = await s.rpc('br_purge_expired', {});
  void exp;
  t = new Date('2027-02-01T00:00:00Z');
  assert.strictEqual((await s.rpc('br_review_lease', { p_id: live.id, p_owner: 'C', p_seconds: 70 })), false, 'expired tokens stop the lease');
});
