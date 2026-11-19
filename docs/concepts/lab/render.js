const { chromium } = require('playwright');
const fs = require('fs');
const L = __dirname + '/';
fs.mkdirSync(L + 'frames', { recursive: true });
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + L + 'fire.html'); await pg.waitForFunction(() => window.ready, null, { timeout: 15000 });
  const N = 120, t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const url = await pg.evaluate(p => window.draw(p), i / N);
    fs.writeFileSync(L + 'frames/f' + String(i).padStart(3, '0') + '.jpg', Buffer.from(url.split(',')[1], 'base64'));
  }
  console.log('rendered', N, 'frames in', ((Date.now() - t0) / 1000).toFixed(1), 's', errs);
  await b.close();
})();
