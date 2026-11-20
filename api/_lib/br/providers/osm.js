'use strict';
/*
Business review: OpenStreetMap Nominatim geocoder (town to coordinates), used only to measure distance for discovery when BR_DISCOVERY=1.
Inputs : { q }. Outputs: { lat, lng, display_name } or nothing. Free; the public instance allows 1 request a second and needs an identifying user agent.
Rules  : never used to name competitors on its own (coverage of small businesses is patchy); ODbL attribution is the caller's duty.
Must not change: identifying user agent, one result, off with the discovery flag.
*/
const { BOT_UA } = require('../config');
function status(cfg) { return cfg.discovery.enabled ? { state: 'available', reason: null } : { state: 'disabled', reason: 'BR_DISCOVERY is off' }; }
async function run(request, ctx) {
  const u = new URL('https://nominatim.openstreetmap.org/search');
  u.searchParams.set('q', String(request.q).slice(0, 200));
  u.searchParams.set('format', 'jsonv2'); u.searchParams.set('limit', '1'); u.searchParams.set('countrycodes', 'gb');
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, ctx.timeoutMs || 8000);
  let res;
  try { res = await ctx.fetchImpl(u.toString(), { headers: { 'User-Agent': BOT_UA, Accept: 'application/json' }, signal: controller.signal }); }
  catch (e) { return { ok: false, code: controller.signal.aborted ? 'timeout' : 'provider_error', retryable: false }; }
  finally { clearTimeout(timer); }
  if (!res.ok) return { ok: false, code: res.status === 429 ? 'rate_limited' : 'provider_error', retryable: false };
  let json;
  try { json = await res.json(); } catch (e) { return { ok: false, code: 'provider_error', retryable: false }; }
  const f = Array.isArray(json) ? json[0] : null;
  if (!f) return { ok: true, data: { found: false }, cost_pence: 0, model_version: 'nominatim' };
  return { ok: true, data: { found: true, lat: parseFloat(f.lat), lng: parseFloat(f.lon), display_name: String(f.display_name || '').slice(0, 200) }, cost_pence: 0, model_version: 'nominatim' };
}
module.exports = { id: 'osm', kind: 'discovery', label: 'OpenStreetMap Nominatim', status, run };
