'use strict';
/*
Business review: Google Places API (New) Text Search provider. DISABLED unless BR_DISCOVERY=1 AND GOOGLE_PLACES_API_KEY AND a daily cap in pence.
Inputs : { text_query }. Outputs: a trimmed list of places (id, name, website, types, address, location, rating, count).
Rules  : a field mask is always sent (the highest tier field prices the whole request); results are only kept as long as Google's terms allow
         (the caller sets data_expires_at = collected_at + 30 days); no results are ever invented when the provider fails.
Must not change: off by default, field mask always present, never called without a budget spend (callProvider enforces it).
Not verified: current Places terms on storage and the exact attribution wording (DECISIONS 5b). Read them before switching this on.
*/
const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = 'places.id,places.displayName,places.websiteUri,places.primaryType,places.types,places.formattedAddress,places.location,places.rating,places.userRatingCount';
const COSTS = require('../costs');

function status(cfg) {
  if (!cfg.discovery.enabled) return { state: 'disabled', reason: 'BR_DISCOVERY is off' };
  if (!cfg.discovery.placesKey) return { state: 'not_configured', reason: 'no GOOGLE_PLACES_API_KEY' };
  if (cfg.discovery.dailyCapPence <= 0) return { state: 'budget_exhausted', reason: 'daily cap is 0 pence' };
  return { state: 'available', reason: null };
}

async function run(request, ctx) {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, ctx.timeoutMs || 12000);
  let res;
  try {
    res = await ctx.fetchImpl(ENDPOINT, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': ctx.cfg.discovery.placesKey, 'X-Goog-FieldMask': FIELD_MASK },
      body: JSON.stringify({ textQuery: String(request.text_query).slice(0, 200), languageCode: 'en-GB', regionCode: 'GB', maxResultCount: 10 })
    });
  } catch (e) { return { ok: false, code: controller.signal.aborted ? 'timeout' : 'provider_error', retryable: false }; }
  finally { clearTimeout(timer); }
  if (res.status === 429) return { ok: false, code: 'rate_limited', retryable: false };
  if (!res.ok) return { ok: false, code: 'provider_error', detail: 'http_' + res.status, retryable: false };
  let json;
  try { json = await res.json(); } catch (e) { return { ok: false, code: 'provider_error', detail: 'bad_json', retryable: false }; }
  const places = (Array.isArray(json && json.places) ? json.places : []).slice(0, 10).map(function (p) {
    return {
      place_id: String(p.id || '').slice(0, 200), name: p.displayName && p.displayName.text ? String(p.displayName.text).slice(0, 160) : null,
      website: p.websiteUri ? String(p.websiteUri).slice(0, 300) : null, primary_type: p.primaryType || null,
      types: Array.isArray(p.types) ? p.types.slice(0, 10).map(String) : [], address: p.formattedAddress ? String(p.formattedAddress).slice(0, 300) : null,
      lat: p.location && typeof p.location.latitude === 'number' ? p.location.latitude : null, lng: p.location && typeof p.location.longitude === 'number' ? p.location.longitude : null,
      rating: typeof p.rating === 'number' ? p.rating : null, rating_count: typeof p.userRatingCount === 'number' ? p.userRatingCount : null
    };
  }).filter(function (p) { return p.place_id && p.name; });
  return { ok: true, data: { places: places }, cost_pence: COSTS.PLACES_TEXT_SEARCH_PENCE, model_version: 'places-v1' };
}

module.exports = { id: 'google_places', kind: 'discovery', label: 'Google Places search', status, run, FIELD_MASK, ENDPOINT };
