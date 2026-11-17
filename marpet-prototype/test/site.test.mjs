// Checks on the built site. Run after `node build.mjs`:  node --test test/site.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { validateContent } from '../content/schema.mjs';

const SITE = new URL('../site/', import.meta.url);
const read = (f) => readFileSync(new URL(f, SITE), 'utf8');
const json = (f) => JSON.parse(readFileSync(new URL('../content/' + f + '.json', import.meta.url), 'utf8'));
const pages = readdirSync(SITE).filter((f) => f.endsWith('.html'));
const services = json('services'), projects = json('projects'), team = json('team'), company = json('company'), linkedin = json('linkedin');
const DEV = new Set(['dev-notes.html', 'material-test.html', 'phone-test.html']);

test('content files are valid', () => {
  assert.deepEqual(validateContent({ company, services, projects, team, linkedin, dims: json('image-dims') }), []);
});

test('the content check catches a bad entry', () => {
  const bad = [{ ...projects[0], service: 'no-such-service', hero: 'missing.jpg' }];
  const out = validateContent({ company, services, projects: bad, team, linkedin, dims: json('image-dims') });
  assert.equal(out.length, 2);
});

test('every required page is built', () => {
  const want = ['index.html', 'services.html', 'work.html', 'about.html', 'team.html', 'contact.html', 'privacy.html', '404.html',
    ...services.map((s) => `service-${s.slug}.html`), ...projects.map((p) => `project-${p.slug}.html`)];
  for (const f of want) assert.ok(pages.includes(f), f + ' is missing');
  assert.equal(pages.length, want.length + DEV.size, 'unexpected pages: ' + pages.filter((p) => !want.includes(p) && !DEV.has(p)).join(', '));
});

for (const f of pages) {
  test(`${f}: document basics`, () => {
    const h = read(f);
    assert.match(h, /<html lang="en-GB">/);
    assert.match(h, /<meta name="robots" content="noindex,nofollow,noarchive">/, 'development build must not be indexable');
    assert.match(h, /<title>[^<]{5,90}<\/title>/);
    const desc = h.match(/<meta name="description" content="([^"]*)">/);
    assert.ok(desc && desc[1].length >= 20 && desc[1].length <= 165, 'description length');
    assert.equal((h.match(/<h1[\s>]/g) || []).length, 1, 'exactly one h1');
    assert.equal((h.match(/<main id="main">/g) || []).length, 1);
    assert.match(h, /<a class="skip" href="#main">/);
    assert.match(h, /<nav class="nav" id="nav" aria-label="Main">/);
  });

  test(`${f}: links and assets resolve`, () => {
    const h = read(f);
    for (const m of h.matchAll(/(?:href|src|poster|data-model|data-hdri)="([^"#?]+)[^"]*"/g)) {
      const u = m[1];
      if (/^(https?:|mailto:|tel:|data:)/.test(u)) continue;
      assert.ok(existsSync(new URL(u, SITE)), `${u} does not exist`);
    }
    assert.doesNotMatch(h, /storyboard\.html|concept-b\.html|hero\.js|gsap/);
  });

  test(`${f}: images have alt text and sizes`, () => {
    for (const m of read(f).matchAll(/<img\b[^>]*>/g)) {
      assert.match(m[0], /\balt="/, 'missing alt: ' + m[0].slice(0, 80));
      if (!/class="thumb"|member__photo/.test(m[0])) assert.match(m[0], /\bwidth="\d+" height="\d+"/, 'missing size: ' + m[0].slice(0, 80));
    }
  });
}

test('nothing is invented: team, LinkedIn and projects stay marked until content is supplied', () => {
  const t = read('team.html');
  assert.equal((t.match(/Name to be supplied/g) || []).length, team.filter((m) => !m.name).length);
  if (!company.linkedin && !linkedin.profileUrl) assert.doesNotMatch(read('index.html'), /href="https:\/\/[a-z.]*linkedin\.com/);
  for (const p of projects.filter((x) => !x.overview)) assert.match(read(`project-${p.slug}.html`), /Placeholder: overview/);
  for (const f of pages) assert.doesNotMatch(read(f), /testimonial|ISO ?9001|accredited|award-winning/i, f + ' contains an unverified claim');
});

test('enquiry form: fields, labels, honeypot and status region', () => {
  const h = read('contact.html');
  for (const n of ['name', 'company', 'email', 'tel', 'service', 'message', 'website', 'ts']) assert.match(h, new RegExp(`name="${n}"`), n);
  for (const id of ['f-name', 'f-email', 'f-tel', 'f-service', 'f-msg', 'f-company']) assert.match(h, new RegExp(`<label for="${id}">`), 'label for ' + id);
  assert.match(h, /id="enquiry-status"[^>]*role="status"/);
  assert.match(h, /data-error-summary role="alert"/);
  assert.doesNotMatch(h, /type="file"|enctype="multipart/);
  assert.match(h, /method="post"/);
  if (!company.enquiryEndpoint) { assert.doesNotMatch(h, /<form[^>]*\saction=/); assert.match(h, /Not connected/); }
});

test('service options on the form match the server list', async () => {
  const { SERVICES } = await import('../api/enquiry.js');
  const opts = [...read('contact.html').matchAll(/<option>([^<]+)<\/option>/g)].map((m) => m[1]);
  assert.deepEqual(opts, SERVICES);
});

test('JNR and Marpet enquiry routes stay separate', () => {
  for (const f of pages) {
    const h = read(f);
    assert.doesNotMatch(h, /jnrengineering[^"]*\/quote/, 'no link into the JNR quote form');
    for (const m of h.matchAll(/href="https:\/\/jnrengineering\.co\.uk[^"]*"[^>]*>/g)) assert.match(m[0], /target="_blank" rel="noopener"/);
  }
});

test('old addresses all have a redirect target', () => {
  const r = JSON.parse(read('redirects.json'));
  const old = ['index', 'about', 'services', 'contact', 'conveyor-belts', 'production-lines', 'pipework', 'access-platform', 'catering', 'dentistry', 'generalfabrication'];
  for (const o of old) assert.ok(r.some((x) => x.from === `/${o}.html`), o);
});

test('the shipped 3D bundle is the minified one and stays under budget', () => {
  const size = readFileSync(new URL('assets/viewer.min.js', SITE)).length;
  assert.ok(size < 900_000, 'viewer bundle is ' + size + ' bytes');
  assert.ok(readFileSync(new URL('assets/render/conveyor.glb', SITE)).length < 1_600_000);
  assert.match(read('index.html'), /data-hero[^>]*data-model="assets\/render\/conveyor\.glb"/);
});
