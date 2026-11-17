'use strict';

/*
  Tiny Vercel Blob client over the REST API, so the site needs no package.json.
  Needs BLOB_READ_WRITE_TOKEN (Vercel adds it when a Blob store is connected to the project).
  Concepts are stored under c/<id>.html. The id is 24 random hex characters and nothing lists them,
  so a link only works for whoever was sent it. Reads go through /api/c, which adds noindex headers.
*/

const API = 'https://blob.vercel-storage.com';

function token() { return process.env.BLOB_READ_WRITE_TOKEN || ''; }

// Token looks like vercel_blob_rw_<storeId>_<secret>. The public host is <storeid lowercase>.public.blob.vercel-storage.com
function storeHost() {
  const m = /^vercel_blob_rw_([a-z0-9]+)_/i.exec(token());
  return m ? m[1].toLowerCase() + '.public.blob.vercel-storage.com' : '';
}

function validId(id) { return /^[a-f0-9]{24}$/.test(String(id || '')); }

async function put(id, html, fetchImpl) {
  if (!token() || !validId(id)) throw new Error('blob not configured');
  const res = await (fetchImpl || fetch)(API + '/c/' + id + '.html', {
    method: 'PUT',
    headers: {
      authorization: 'Bearer ' + token(),
      'x-api-version': '7',
      'x-add-random-suffix': '0',
      'x-allow-overwrite': '1',
      'x-content-type': 'text/html; charset=utf-8',
      'x-cache-control-max-age': '60'
    },
    body: html
  });
  if (!res.ok) throw new Error('blob write failed ' + res.status);
}

async function get(id, fetchImpl) {
  const host = storeHost();
  if (!host || !validId(id)) return null;
  const res = await (fetchImpl || fetch)('https://' + host + '/c/' + id + '.html');
  if (!res.ok) return null;
  return await res.text();
}

module.exports = { put, get, validId, storeHost };
