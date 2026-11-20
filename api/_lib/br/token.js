'use strict';
/*
Business review: access tokens, references, visitor hashes, sealing.
Inputs : crypto randomness, the BR_SALT secret.
Outputs: 43 char base64url tokens (only sha256 stored), BR-XXXXXXXX references, salted visitor hashes.
Must not change: token length and alphabet (CONTRACT section 0), the fact that only a hash is stored, the reference alphabet.
*/
const crypto = require('node:crypto');

const REF_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

function generateToken() { return crypto.randomBytes(32).toString('base64url'); }
function isTokenShape(t) { return typeof t === 'string' && TOKEN_RE.test(t); }
// bytea literal as PostgREST expects it.
function hashToken(token) { return '\\x' + crypto.createHash('sha256').update(String(token), 'utf8').digest('hex'); }
function generateRef() {
  let s = '';
  for (let i = 0; i < 8; i++) s += REF_ALPHABET[crypto.randomInt(REF_ALPHABET.length)];
  return 'BR-' + s;
}
function isRef(r) { return typeof r === 'string' && /^BR-[2-9A-HJ-NP-Z]{8}$/.test(r); }
function sha256Hex(s) { return crypto.createHash('sha256').update(String(s), 'utf8').digest('hex'); }
function visitorHash(salt, ip) { return sha256Hex(String(salt) + '|' + String(ip)); }
function uuid() { return crypto.randomUUID(); }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(s) { return typeof s === 'string' && UUID_RE.test(s); }

function hashesEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  if (x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

// AES-256-GCM sealing, used only for the one case where an emailed link must be completed after a hold (see HANDOFF-A).
function sealKey(salt) { return crypto.createHash('sha256').update('br-seal|' + String(salt)).digest(); }
function seal(plain, salt) {
  if (!salt) throw new Error('no salt');
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', sealKey(salt), iv);
  const enc = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return [iv.toString('base64url'), enc.toString('base64url'), c.getAuthTag().toString('base64url')].join('.');
}
function unseal(sealed, salt) {
  try {
    const p = String(sealed).split('.');
    if (p.length !== 3 || !salt) return null;
    const d = crypto.createDecipheriv('aes-256-gcm', sealKey(salt), Buffer.from(p[0], 'base64url'));
    d.setAuthTag(Buffer.from(p[2], 'base64url'));
    return Buffer.concat([d.update(Buffer.from(p[1], 'base64url')), d.final()]).toString('utf8');
  } catch (e) { return null; }
}

module.exports = { generateToken, isTokenShape, hashToken, generateRef, isRef, sha256Hex, visitorHash, uuid, isUuid, hashesEqual, seal, unseal, REF_ALPHABET };
