'use strict';
/*
Business review: competitor discovery selection logic (provider independent) and the discovery runner.
Inputs : category, location (text, kind), the review's own host, raw place candidates from a provider.
Outputs: up to 3 selected candidates with the reasons they were chosen, plus a few hidden alternates for the owner.
Rules  : OFF by default (the Places provider is disabled until the owner switches it on); when it is off or fails the review says so and
         continues, the visitor may name one competitor; never an assumed radius: local is about 15 miles, regional about 50 miles, national
         has none (the visitor can change the kind); results must have a website, must not be the visitor's own domain, a directory or a
         marketplace, and must match the category words; fewer than 3 is fine and none is fine; every candidate records origin, source
         reference and collection time; Places data expires after 30 days (data_expires_at).
Must not change: the exclusion rules, the "fewer is fine" rule, the 30 day expiry.
*/
const { callProvider } = require('./providers/index');
const { tidyCategory } = require('./questions');

const DIRECTORIES = ['yell.com', 'checkatrade.com', 'trustpilot.com', 'facebook.com', 'linkedin.com', 'instagram.com', 'twitter.com', 'x.com', 'google.com', 'google.co.uk', 'yelp.com', 'thomsonlocal.com', 'ratedpeople.com', 'bark.com', 'mybuilder.com', 'trustatrader.com', 'freeindex.co.uk', '192.com', 'cylex-uk.co.uk', 'amazon.co.uk', 'amazon.com', 'ebay.co.uk', 'gumtree.com', 'wikipedia.org', 'tripadvisor.co.uk', 'tripadvisor.com', 'youtube.com', 'tiktok.com', 'pinterest.com', 'which.co.uk', 'nextdoor.co.uk', 'bing.com', 'maps.apple.com', 'scotlandsfinest.com', 'misterwhat.co.uk', 'hotfrog.co.uk', 'scoot.co.uk', 'tuugo.co.uk', 'yelu.uk'];
const RADIUS_KM = { local: 24, regional: 80, national: null };
const MAX_SELECTED = 3, MAX_ALTERNATES = 4, DAY = 86400000;

function hostOf(u) { try { return new URL(/^https?:\/\//i.test(u) ? u : 'https://' + u).hostname.toLowerCase().replace(/^www\./, ''); } catch (e) { return ''; } }
function isDirectory(host) { return DIRECTORIES.some(function (d) { return host === d || host.endsWith('.' + d); }); }
function haversineKm(a, b) {
  const R = 6371, rad = function (x) { return x * Math.PI / 180; };
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
function queryFor(category, location) {
  const cat = tidyCategory(category);
  if (location.kind === 'national') return cat + ' UK';
  if (location.kind === 'regional') return cat + ' ' + location.text;
  return cat + ' in ' + location.text;
}

// Pure selection. places: provider output. ctx: { category, location:{text,kind}, ownHost, origin, collectedAt, center?:{lat,lng} }
function select(places, ctx) {
  const words = tidyCategory(ctx.category).toLowerCase().split(/[^a-z]+/).filter(function (w) { return w.length > 3; });
  const radius = RADIUS_KM[ctx.location.kind];
  const kept = [], dropped = [];
  (places || []).forEach(function (p) {
    const host = hostOf(p.website || '');
    const why = [];
    if (!p.website || !host) why.push('no_website');
    else if (host === String(ctx.ownHost || '').replace(/^www\./, '')) why.push('own_site');
    else if (isDirectory(host)) why.push('directory_or_marketplace');
    const hay = ((p.name || '') + ' ' + (p.primary_type || '') + ' ' + (p.types || []).join(' ')).toLowerCase().replace(/_/g, ' ');
    const catMatch = words.length ? words.some(function (w) { return hay.indexOf(w.replace(/s$/, '')) !== -1; }) : false;
    if (!catMatch) why.push('category_not_matched');
    let distance = null;
    if (ctx.center && p.lat != null && p.lng != null) distance = Math.round(haversineKm(ctx.center, { lat: p.lat, lng: p.lng }) * 10) / 10;
    if (radius !== null && distance !== null && distance > radius) why.push('outside_area');
    if (why.length) { dropped.push({ place: p, why: why }); return; }
    kept.push({ place: p, distance: distance, host: host });
  });
  kept.sort(function (a, b) { return (a.distance === null ? 1e9 : a.distance) - (b.distance === null ? 1e9 : b.distance) || (a.place.name < b.place.name ? -1 : 1); });
  const seenHosts = {};
  const unique = kept.filter(function (k) { if (seenHosts[k.host]) return false; seenHosts[k.host] = true; return true; });
  const rows = unique.slice(0, MAX_SELECTED + MAX_ALTERNATES).map(function (k, i) {
    const basis = ['category_match', 'has_website', 'not_directory'];
    if (k.distance !== null) basis.push('serves_area');
    return {
      name: k.place.name, website_url: /^https?:\/\//i.test(k.place.website) ? k.place.website : 'https://' + k.place.website, website_host: k.host, origin: ctx.origin, source_ref: k.place.place_id || null,
      collected_at: ctx.collectedAt, status: i < MAX_SELECTED ? 'selected' : 'candidate', position: i + 1,
      relevance: { basis: basis, category_match: true, distance_km: k.distance, note: k.distance === null ? 'Matched on category. Distance was not measured.' : 'Matched on category and within the usual area for a ' + ctx.location.kind + ' search.' },
      data_expires_at: ctx.origin === 'google_places' ? new Date(new Date(ctx.collectedAt).getTime() + 30 * DAY).toISOString() : null
    };
  });
  return { rows: rows, dropped: dropped };
}

async function run(deps, review) {
  const loc = { text: review.location_text, kind: review.location_kind };
  const call = await callProvider(deps, { id: 'google_places', operation: 'text_search', request: { text_query: queryFor(review.category, loc) }, reviewId: review.id, idempotencyKey: review.id + ':competitor_discovery:places:1', cacheTtlS: 86400, timeoutMs: 12000 });
  if (!call.ok) return { ok: false, state: call.state, code: call.code };
  let center = null;
  if (loc.kind !== 'national') {
    const g = await callProvider(deps, { id: 'osm', operation: 'geocode', request: { q: loc.text + ', UK' }, reviewId: review.id, idempotencyKey: review.id + ':competitor_discovery:osm:1', cacheTtlS: 86400 * 7, timeoutMs: 8000 });
    if (g.ok && g.data && g.data.found) center = { lat: g.data.lat, lng: g.data.lng };
  }
  const collectedAt = (deps.now ? deps.now() : new Date()).toISOString();
  const sel = select(call.data.places || [], { category: review.category, location: loc, ownHost: review.website_host, origin: 'google_places', collectedAt: collectedAt, center: center });
  return { ok: true, rows: sel.rows, provider_call_id: call.call_id, dropped: sel.dropped.length };
}

module.exports = { select, run, queryFor, isDirectory, haversineKm, RADIUS_KM, DIRECTORIES, MAX_SELECTED };
