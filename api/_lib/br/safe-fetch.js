'use strict';
/*
Business review: SSRF safe fetcher (node:http, node:https, node:dns, node:net, node:zlib only).
Inputs : a URL typed by a visitor (or taken from a page / redirect), request options (method, limits, deadline).
Outputs: { ok:true, status, headers, body, finalUrl, chain, ... } or { ok:false, code, reason?, chain }.
         Failure codes are a closed set: url_not_allowed (+reason), unresolvable, site_unreachable, too_large,
         bad_content_type, timeout, too_many_redirects, redirect_loop.
Rules  : http and https only; no credentials; ports 80 and 443 only; no IP literals; local and internal names refused;
         DNS resolved first, EVERY address must be public, the validated address is then PINNED for the socket
         (a second DNS answer can never change where the connection goes); every redirect hop is validated again
         (scheme, port, name, resolution, pinning); size, time, redirect and decompression limits.
Must not change: the strict default policy. The factory options (lookup, allowAddress, allowedPorts) exist only so tests can
         point the fetcher at a local server; production code never passes them. Never echo resolved addresses to a visitor.
*/
const dns = require('node:dns');
const net = require('node:net');
const http = require('node:http');
const https = require('node:https');
const zlib = require('node:zlib');
const { BOT_UA } = require('./config');

const MAX_URL_LENGTH = 300;
const DEFAULT_ALLOWED_PORTS = [80, 443];
const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);

// ---------------------------------------------------------------- IP classification
function parseIPv4(s) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(s));
  if (!m) return null;
  const b = [+m[1], +m[2], +m[3], +m[4]];
  if (b.some(function (x) { return x > 255; })) return null;
  return b;
}
const V4_BLOCKED = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4]
].map(function (e) { const b = parseIPv4(e[0]); return { n: ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0, bits: e[1] }; });

function v4Int(b) { return ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0; }
function classifyV4Bytes(b) {
  const n = v4Int(b);
  for (let i = 0; i < V4_BLOCKED.length; i++) {
    const e = V4_BLOCKED[i];
    const mask = e.bits === 0 ? 0 : (0xFFFFFFFF << (32 - e.bits)) >>> 0;
    if (((n & mask) >>> 0) === ((e.n & mask) >>> 0)) return false;
  }
  return true;
}

// Expand an IPv6 string to 16 bytes. Returns null when invalid. Zone ids are refused.
function parseIPv6(s) {
  s = String(s);
  if (s.indexOf('%') !== -1 || !net.isIPv6(s)) return null;
  let tail = null;
  const lastColon = s.lastIndexOf(':');
  if (s.indexOf('.') !== -1) {
    tail = parseIPv4(s.slice(lastColon + 1));
    if (!tail) return null;
    s = s.slice(0, lastColon + 1) + ((tail[0] << 8) | tail[1]).toString(16) + ':' + ((tail[2] << 8) | tail[3]).toString(16);
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const rest = halves.length === 2 ? (halves[1] ? halves[1].split(':') : []) : [];
  let groups;
  if (halves.length === 2) {
    const fill = 8 - head.length - rest.length;
    if (fill < 1) return null;
    groups = head.concat(new Array(fill).fill('0'), rest);
  } else groups = head;
  if (groups.length !== 8) return null;
  const out = [];
  for (let i = 0; i < 8; i++) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(groups[i])) return null;
    const v = parseInt(groups[i], 16);
    out.push(v >> 8, v & 255);
  }
  return out;
}

// Returns { allowed, reason }. Strict allowlist for IPv6 (global unicast 2000::/3 only, minus special ranges).
function classifyIp(ip) {
  const s = String(ip == null ? '' : ip).trim();
  const v4 = parseIPv4(s);
  if (v4) return classifyV4Bytes(v4) ? { allowed: true } : { allowed: false, reason: 'private_address' };
  const b = parseIPv6(s);
  if (!b) return { allowed: false, reason: 'not_a_website' };
  const zeros = function (from, to) { for (let i = from; i < to; i++) if (b[i] !== 0) return false; return true; };
  // IPv4 mapped ::ffff:a.b.c.d (dotted or hex form: both parse to the same bytes)
  if (zeros(0, 10) && b[10] === 255 && b[11] === 255) {
    return classifyV4Bytes(b.slice(12, 16)) ? { allowed: true, note: 'v4_mapped' } : { allowed: false, reason: 'private_address' };
  }
  // NAT64 well known prefix 64:ff9b::/96 wraps an IPv4 address
  if (b[0] === 0 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b && zeros(4, 12)) {
    return classifyV4Bytes(b.slice(12, 16)) ? { allowed: true, note: 'nat64' } : { allowed: false, reason: 'private_address' };
  }
  // Only 2000::/3 (global unicast) may pass. This refuses ::, ::1, IPv4 compatible, fc00::/7, fe80::/10, ff00::/8 and the rest.
  if ((b[0] & 0xe0) !== 0x20) return { allowed: false, reason: 'private_address' };
  const w0 = (b[0] << 8) | b[1], w1 = (b[2] << 8) | b[3];
  if (w0 === 0x2001 && w1 === 0x0000) return { allowed: false, reason: 'private_address' };                 // Teredo
  if (w0 === 0x2001 && w1 === 0x0db8) return { allowed: false, reason: 'private_address' };                 // documentation
  if (w0 === 0x2001 && (w1 & 0xfff0) === 0x0010) return { allowed: false, reason: 'private_address' };      // ORCHID
  if (w0 === 0x2001 && (w1 & 0xfff0) === 0x0020) return { allowed: false, reason: 'private_address' };      // ORCHIDv2
  if (w0 === 0x2001 && w1 === 0x0002 && b[4] === 0 && b[5] === 0) return { allowed: false, reason: 'private_address' }; // benchmarking
  if (w0 === 0x2002) return classifyV4Bytes(b.slice(2, 6)) ? { allowed: true, note: '6to4' } : { allowed: false, reason: 'private_address' }; // 6to4
  if (w0 === 0x3fff && (w1 & 0xf000) === 0) return { allowed: false, reason: 'private_address' };           // documentation 3fff::/20
  return { allowed: true };
}

// ---------------------------------------------------------------- URL validation
const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.localdomain', '.home.arpa', '.lan', '.intranet', '.corp', '.private', '.arpa', '.test.invalid'];
const BLOCKED_NAMES = new Set(['localhost', 'metadata', 'metadata.google.internal', 'broadcasthost', 'ip6-localhost', 'ip6-loopback']);

function parseUrl(input, opts) {
  const o = opts || {};
  const allowedPorts = o.allowedPorts || DEFAULT_ALLOWED_PORTS;
  if (typeof input !== 'string') return { ok: false, reason: 'not_a_website' };
  let raw = input.trim();
  if (raw.length > MAX_URL_LENGTH) return { ok: false, reason: 'too_long' };
  if (!raw || /[\u0000-\u001f\u007f\s]/.test(raw)) return { ok: false, reason: 'not_a_website' };
  if (/^[a-z][a-z0-9+.\-]*:\/\//i.test(raw)) {
    // has an explicit scheme
  } else if (/^(javascript|data|file|ftp|gopher|mailto|tel|view-source|blob|ws|wss|ldap|dict|sftp|jar|about):/i.test(raw)) {
    return { ok: false, reason: 'bad_scheme' };
  } else if (/^\/\//.test(raw)) {
    raw = 'https:' + raw;
  } else raw = 'https://' + raw;
  let u;
  try { u = new URL(raw); } catch (e) { return { ok: false, reason: 'not_a_website' }; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return { ok: false, reason: 'bad_scheme' };
  if (u.username || u.password || /^[a-z]+:\/\/[^/?#]*@/i.test(raw)) return { ok: false, reason: 'credentials' };
  const port = u.port ? parseInt(u.port, 10) : (u.protocol === 'https:' ? 443 : 80);
  if (allowedPorts.indexOf(port) === -1) return { ok: false, reason: 'bad_port' };
  let host = u.hostname.toLowerCase();
  if (!host) return { ok: false, reason: 'not_a_website' };
  if (host.charAt(0) === '[') {
    const inner = host.slice(1, -1);
    const c = classifyIp(inner);
    return { ok: false, reason: c.allowed ? 'not_a_website' : 'private_address' };
  }
  while (host.endsWith('.')) host = host.slice(0, -1);
  if (/^\d+(\.\d+){0,3}$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
    const c = classifyIp(host);
    return { ok: false, reason: c.allowed ? 'not_a_website' : 'private_address' };
  }
  if (BLOCKED_NAMES.has(host)) return { ok: false, reason: 'private_address' };
  for (let i = 0; i < BLOCKED_SUFFIXES.length; i++) if (host.endsWith(BLOCKED_SUFFIXES[i])) return { ok: false, reason: 'private_address' };
  if (host.indexOf('.') === -1) return { ok: false, reason: 'not_a_website' };
  if (!/^[a-z0-9.\-]+$/.test(host) || host.length > 253) return { ok: false, reason: 'not_a_website' };
  const labels = host.split('.');
  if (labels.some(function (l) { return !l || l.length > 63 || l.charAt(0) === '-' || l.charAt(l.length - 1) === '-'; })) return { ok: false, reason: 'not_a_website' };
  if (/^\d+$/.test(labels[labels.length - 1])) return { ok: false, reason: 'not_a_website' };
  return {
    ok: true, url: u.href, hostname: host, port: port, protocol: u.protocol,
    origin: u.protocol + '//' + host + (u.port ? ':' + u.port : ''),
    path: (u.pathname || '/') + (u.search || '')
  };
}

// ---------------------------------------------------------------- fetcher
function withTimeout(promise, ms, onTimeout) {
  let t;
  return Promise.race([promise, new Promise(function (_, rej) { t = setTimeout(function () { rej(onTimeout()); }, ms); })]).finally(function () { clearTimeout(t); });
}

function createSafeFetcher(factoryOpts) {
  const f = factoryOpts || {};
  const lookupImpl = f.lookup || function (host) { return dns.promises.lookup(host, { all: true }); };
  const allowAddress = f.allowAddress || function (ip) { return classifyIp(ip).allowed; };
  const allowedPorts = f.allowedPorts || DEFAULT_ALLOWED_PORTS;
  const dnsTimeoutMs = f.dnsTimeoutMs || 5000;

  async function resolveHost(host) {
    let list;
    try {
      list = await withTimeout(Promise.resolve(lookupImpl(host)), dnsTimeoutMs, function () { return { code: 'dns_timeout' }; });
    } catch (e) { return { ok: false, code: 'unresolvable' }; }
    if (!Array.isArray(list)) list = list ? [list] : [];
    list = list.filter(function (a) { return a && typeof a.address === 'string'; });
    if (!list.length) return { ok: false, code: 'unresolvable' };
    for (let i = 0; i < list.length; i++) {
      if (!allowAddress(list[i].address)) return { ok: false, code: 'url_not_allowed', reason: 'private_address' };
    }
    list.sort(function (a, b) { return (a.family === 4 ? 0 : 1) - (b.family === 4 ? 0 : 1); });
    return { ok: true, address: list[0].address, family: list[0].family || (net.isIPv6(list[0].address) ? 6 : 4) };
  }

  function once(p, pinned, o, timeoutMs) {
    return new Promise(function (resolve) {
      const mod = p.protocol === 'https:' ? https : http;
      let settled = false;
      let req;
      const done = function (v) { if (settled) return; settled = true; clearTimeout(timer); resolve(v); };
      const timer = setTimeout(function () { done({ ok: false, code: 'timeout' }); if (req) req.destroy(); }, Math.max(50, timeoutMs));
      const headers = Object.assign({
        'User-Agent': o.userAgent || BOT_UA,
        'Accept': o.accept || 'text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.1',
        'Accept-Encoding': 'gzip',
        'Connection': 'close'
      }, o.headers || {});
      const reqOpts = {
        host: p.hostname, port: p.port, method: o.method || 'GET', path: p.path, headers: headers, agent: false,
        servername: p.protocol === 'https:' ? p.hostname : undefined,
        lookup: function (hostname, options, cb) {
          if (typeof options === 'function') { cb = options; options = {}; }
          if (options && options.all) cb(null, [{ address: pinned.address, family: pinned.family }]);
          else cb(null, pinned.address, pinned.family);
        }
      };
      req = mod.request(reqOpts, function (res) {
        const status = res.statusCode;
        const hdr = {};
        ['content-type', 'content-length', 'content-encoding', 'location', 'x-robots-tag', 'server', 'last-modified'].forEach(function (k) { if (res.headers[k] != null) hdr[k] = String(res.headers[k]); });
        if (REDIRECT_STATUS.has(status) || (o.method === 'HEAD') || status < 200 || (status >= 300 && !o.readErrorBody) || status === 204) {
          res.destroy();
          return done({ ok: true, status: status, headers: hdr, body: '', bytes: 0 });
        }
        const ct = String(hdr['content-type'] || '').split(';')[0].trim().toLowerCase();
        if (o.allowedTypes && status >= 200 && status < 300 && o.allowedTypes.indexOf(ct) === -1) {
          res.destroy();
          return done({ ok: false, code: 'bad_content_type' });
        }
        const maxBytes = o.maxBytes || 1572864;
        const declared = parseInt(hdr['content-length'] || '0', 10);
        if (declared > maxBytes) { res.destroy(); return done({ ok: false, code: 'too_large' }); }
        const enc = String(hdr['content-encoding'] || 'identity').toLowerCase().trim();
        let stream = res;
        if (enc === 'gzip' || enc === 'x-gzip') stream = res.pipe(zlib.createGunzip());
        else if (enc === 'deflate') stream = res.pipe(zlib.createInflate());
        else if (enc !== 'identity' && enc !== '') { res.destroy(); return done({ ok: false, code: 'bad_content_type' }); }
        const chunks = [];
        let size = 0, rawSize = 0;
        res.on('data', function (d) { rawSize += d.length; if (rawSize > maxBytes) { res.destroy(); done({ ok: false, code: 'too_large' }); } });
        stream.on('data', function (d) {
          size += d.length;
          if (size > maxBytes) { res.destroy(); stream.destroy(); return done({ ok: false, code: 'too_large' }); }
          chunks.push(d);
        });
        stream.on('end', function () {
          let text;
          try {
            const cs = /charset=([\w-]+)/i.exec(String(hdr['content-type'] || ''));
            text = new TextDecoder(cs ? cs[1] : 'utf-8', { fatal: false }).decode(Buffer.concat(chunks));
          } catch (e) { text = Buffer.concat(chunks).toString('utf8'); }
          done({ ok: true, status: status, headers: hdr, body: text, bytes: size });
        });
        stream.on('error', function () { done({ ok: false, code: 'site_unreachable', detail: 'decode_error' }); });
        res.on('error', function () { done({ ok: false, code: 'site_unreachable', detail: 'connection_reset' }); });
        res.on('aborted', function () { done({ ok: false, code: 'site_unreachable', detail: 'connection_reset' }); });
      });
      req.on('error', function (e) {
        const c = e && e.code ? String(e.code) : '';
        let detail = 'connection_error';
        if (/CERT|TLS|SSL|DEPTH_ZERO|UNABLE_TO/.test(c)) detail = 'tls_error';
        else if (c === 'ECONNREFUSED') detail = 'connection_refused';
        else if (c === 'ECONNRESET') detail = 'connection_reset';
        done({ ok: false, code: 'site_unreachable', detail: detail });
      });
      req.end();
    });
  }

  // request(url, opts): opts { method, maxBytes, timeoutMs, deadline (epoch ms), followRedirects, maxRedirects, allowedTypes, userAgent, accept, readErrorBody }
  async function request(urlStr, o) {
    o = o || {};
    const maxRedirects = o.followRedirects === false ? 0 : (o.maxRedirects == null ? 4 : Math.min(4, o.maxRedirects));
    const chain = [];
    const visited = new Set();
    let current = urlStr;
    const started = Date.now();
    for (let hop = 0; ; hop++) {
      const p = parseUrl(current, { allowedPorts: allowedPorts });
      if (!p.ok) return { ok: false, code: 'url_not_allowed', reason: p.reason, chain: chain };
      const key = p.protocol + '//' + p.hostname + ':' + p.port + p.path;
      if (visited.has(key)) return { ok: false, code: 'redirect_loop', chain: chain };
      visited.add(key);
      const remaining = o.deadline ? o.deadline - Date.now() : Infinity;
      if (remaining < 200) return { ok: false, code: 'timeout', chain: chain };
      const r = await resolveHost(p.hostname);
      if (!r.ok) return { ok: false, code: r.code, reason: r.reason, chain: chain };
      const res = await once(p, r, o, Math.min(o.timeoutMs || 8000, remaining));
      if (!res.ok) return Object.assign({ chain: chain }, res);
      if (REDIRECT_STATUS.has(res.status) && res.headers.location && maxRedirects > 0) {
        if (hop >= maxRedirects) return { ok: false, code: 'too_many_redirects', chain: chain };
        let next;
        try { next = new URL(res.headers.location, p.url).href; } catch (e) { return { ok: false, code: 'site_unreachable', detail: 'bad_redirect', chain: chain }; }
        chain.push({ url: p.url, status: res.status, to_scheme: next.split(':')[0] });
        current = next;
        continue;
      }
      return Object.assign({}, res, { finalUrl: p.url, chain: chain, ms: Date.now() - started, scheme: p.protocol.replace(':', ''), host: p.hostname });
    }
  }

  return { request: request, parseUrl: function (u) { return parseUrl(u, { allowedPorts: allowedPorts }); }, resolveHost: resolveHost };
}

const defaultFetcher = createSafeFetcher();

module.exports = { createSafeFetcher, parseUrl, classifyIp, parseIPv6, parseIPv4, defaultFetcher, MAX_URL_LENGTH, REDIRECT_STATUS };
