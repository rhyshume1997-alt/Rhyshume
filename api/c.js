'use strict';

/*
  GET /c/<id>  (rewritten to /api/c?id=<id> in vercel.json)
  Shows a saved concept page. Only a link made by the owner builder works. Never indexed, never cached by others.
*/

const blob = require('./_lib/blob');

module.exports = async function handler(req, res) {
  const id = String((req.query && req.query.id) || '').toLowerCase();
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'private, no-store');
  let html = null;
  try { html = await blob.get(id); } catch (e) { html = null; }
  if (!html) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Not found');
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
};
