/* Checks the hosted copy over http: the sign in is shown, there is no offline button, and ?offline is ignored.
   Usage: NODE_PATH=$(npm root -g) node tools/workbook-meeting/hosted-check.js <repo root>
   Serves the repo on a local port, aborts every request to anything that is not that local server (so Supabase is never called). */
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const root = path.resolve(process.argv[2] || '.');
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f.endsWith('/') ? f + 'index.html' : f, (e, d) => { if (e) { r.statusCode = 404; r.end(); } else { r.setHeader('content-type', f.endsWith('.html') ? 'text/html' : 'application/octet-stream'); r.end(d); } }); });
srv.listen(0, async () => {
  const port = srv.address().port; const b = await chromium.launch(); let fails = 0; const ok = (n, v) => { console.log((v ? 'PASS ' : 'FAIL ') + n); if (!v) fails++; };
  for (const q of ['', '?offline', '?offline=1']) {
    const ctx = await b.newContext(); const blocked = []; await ctx.route('**/*', r => { if (new URL(r.request().url()).host === 'localhost:' + port || r.request().url().startsWith('data:')) r.continue(); else { blocked.push(r.request().url()); r.abort(); } });
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:' + port + '/w-82503121e7fdf54e/index.html' + q); await p.waitForTimeout(1500); const t = await p.innerText('body');
    ok('sign in shown' + q, /Send me a sign in link/.test(t) && /Sign in/.test(t));
    ok('no offline button' + q, !/Work offline/i.test(t) && !(await p.$('[data-act=cloffline]')));
    ok('no workbook, meeting or grant screens before sign in' + q, !/START CLIENT MEETING/.test(t) && !/Grant meeting/.test(t) && !/Price book/i.test(t));
    ok('no page errors' + q, errs.length === 0);
    ok('grant meeting code is present but unreachable: no gm state opened' + q, await p.evaluate(() => typeof gmShell === 'function' && !(S.gmeet && S.gmeet.open)));
    await ctx.close();
  }
  await b.close(); srv.close(); console.log('FAILS', fails); process.exit(fails ? 1 : 0);
});
