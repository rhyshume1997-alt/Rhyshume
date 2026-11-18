// Builds the static prototype into ./site from ./content/*.json.
// Run: node build.mjs   Then serve ./site with any static server.
import { readFileSync, writeFileSync } from 'node:fs';
import { validateContent, validateMedia } from './content/schema.mjs';
const J = (f) => JSON.parse(readFileSync(new URL(`./content/${f}.json`, import.meta.url), 'utf8'));
const co = J('company'), services = J('services'), projects = J('projects'), team = J('team'), li = J('linkedin'), dims = J('image-dims');
const mediaCfg = J('media'), slots = mediaCfg.slots;
// every service page header is a media slot too; it starts on the service's own photograph
for (const s of services) slots[`service-${s.slug}`] ??= { use: `${s.name} page header`, photo: s.hero, alt: '', video: null, videoMobile: null, poster: null, mode: 'loop',
  brief: { shot: `${s.name}: work in progress, then the finished job`, detail: 'This kind of work being fabricated in the workshop, then the finished job in place. Client sites need written permission.', length: '8 to 12 s', where: 'Workshop and client site' } };
const problems = validateContent({ company: co, services, projects, team, linkedin: li, dims });
problems.push(...validateMedia(mediaCfg, dims, new URL('./site/assets/', import.meta.url)));
if (problems.length) { console.error('Content problems:\n- ' + problems.join('\n- ')); process.exit(1); }
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const svc = (slug) => services.find((s) => s.slug === slug);
const img = (file, alt, attrs = '') => { const [w, h] = dims[file] || [0, 0]; return `<img src="assets/img/${file}" alt="${esc(alt)}" width="${w}" height="${h}" decoding="async" ${attrs}>`; };
const stem = (f) => f.replace(/\.\w+$/, '');
// graded copy of a genuine Marpet photograph (tools/cine.py): same picture, cinematic colour and tone
const cimg = (file, alt, attrs = '') => { const [w, h] = dims[file] || [4, 3]; const W = w >= 900 ? 1600 : 1280; return `<img src="assets/img/cine/${stem(file)}.webp" alt="${esc(alt)}" width="${W}" height="${Math.round(h * W / w)}" decoding="async" ${attrs}>`; };
const cbg = (file) => `<img src="assets/img/cine/${stem(file)}-bg.webp" alt="" width="480" height="${Math.round(480 * (dims[file] || [4, 3])[1] / (dims[file] || [4, 3])[0])}" decoding="async">`;
// ---- media slots (content/media.json): video when supplied, otherwise the genuine Marpet still ----
const slot = (id) => { const s = slots[id]; if (!s) throw new Error('No media slot ' + id); return s; };
const stillSrc = (s) => (s.still ? `assets/${s.still}` : `assets/img/cine/${stem(s.photo)}.webp`);
const stillDims = (s) => { if (s.still) return [s.w, s.h]; const [w, h] = dims[s.photo]; const W = w >= 900 ? 1600 : 1280; return [W, Math.round(h * W / w)]; };
const media = (id, { alt = null, attrs = '' } = {}) => {
  const s = slot(id), a = alt ?? s.alt ?? '', [w, h] = stillDims(s);
  if (s.video) {
    const label = a ? `role="img" aria-label="${esc(a)}"` : 'aria-hidden="true"';
    return `<video class="m" data-video data-slot="${id}" data-mode="${s.mode || 'loop'}" data-src="assets/${s.video}"${s.videoMobile ? ` data-src-mobile="assets/${s.videoMobile}"` : ''} poster="${s.poster ? 'assets/' + s.poster : stillSrc(s)}" muted playsinline loop preload="none" width="${w}" height="${h}" ${label}></video>`;
  }
  return `<img class="m" data-slot="${id}" src="${stillSrc(s)}" alt="${esc(a)}" width="${w}" height="${h}" decoding="async" ${attrs}>`;
};
// soft backdrop for a slot: the blurred copy of its photograph
const mbg = (id) => { const s = slot(id); return s.photo ? cbg(s.photo) : `<img src="${stillSrc(s)}" alt="" decoding="async" class="is-soft">`; };
// development builds label every placeholder still with what needs filming (showShotNotes in media.json)
const note = (id) => { const s = slot(id); return mediaCfg.showShotNotes && !s.video ? `<span class="shot-note" aria-hidden="true"><b>Placeholder still</b>To film: ${esc(s.brief.shot)}</span>` : ''; };
const FX = '<div class="fx" aria-hidden="true"><i class="fx__light"></i><i class="fx__haze"></i><i class="fx__grain"></i><i class="fx__vig"></i></div>';
// full-bleed photographic header for pages without their own lead photograph
const cineScene = (id) => `<div class="ph-scene" aria-hidden="true"><div class="ph-scene__img">${media(id, { alt: '' })}</div>${FX}${note(id)}</div>`;
// layered header for service and project pages: soft backdrop of the same photograph behind the sharp one
const layerScene = (id) => (slot(id).video ? cineScene(id) : `<div class="ph-scene ph-scene--soft" aria-hidden="true"><div class="ph-scene__img">${mbg(id)}</div>${FX}${note(id)}</div>`);
// full-width film section: the media stays pinned while the copy passes over it; scroll can also drive the clip
const layerScene_p = (p) => `<div class="ph-scene ph-scene--soft" aria-hidden="true"><div class="ph-scene__img">${cbg(p.hero)}</div>${FX}</div>`;   // projects use their own photographs only
const filmBand = (id, { eyebrow, heading, text = '', link = '' }) => `<section class="film-band" data-film-band>
  <div class="film-band__pin"><div class="film-band__media">${media(id)}</div>${FX}${note(id)}
    <div class="wrap film-band__copy"><p class="eyebrow">${eyebrow}</p><h2>${heading}</h2>${text ? `<p class="lead">${text}</p>` : ''}${link}</div>
  </div>
</section>`;
const lowres = (file) => (dims[file] && dims[file][0] < 600 ? `<span class="res">Source ${dims[file][0]}px wide</span>` : '');
const ph = (title, body) => `<div class="ph"><b>Placeholder: ${title}</b><p>${body}</p></div>`;
const bolts = '<i class="bolt tl"></i><i class="bolt tr"></i><i class="bolt bl"></i><i class="bolt br"></i>';

const orgLd = {
  '@context': 'https://schema.org', '@type': 'Organization', name: co.name, url: 'https://www.marpet.co.uk/',
  telephone: co.phoneHref, email: co.email,
  address: { '@type': 'PostalAddress', streetAddress: co.address.slice(0, 2).join(', '), addressLocality: co.address[2], postalCode: co.address[3], addressCountry: 'GB' },
};

const built = [];
const NAV = [['services', 'Services', 'services.html'], ['work', 'Our Work', 'work.html'], ['about', 'About', 'about.html'], ['team', 'Team', 'team.html'], ['contact', 'Contact', 'contact.html']];

function page({ file, title, desc, section, page, main }) {
  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<script>document.documentElement.classList.add('js')</script>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>${esc(title)} | Marpet Fabrications</title>
<meta name="description" content="${esc(desc)}">
<link rel="icon" href="data:,">
<link rel="preload" href="assets/fonts/archivo-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/styles.css">
${page === 'home' ? `<link rel="preload" href="assets/img/cine/IMG_0283.webp" as="image" fetchpriority="high">\n<script type="application/ld+json">${JSON.stringify(orgLd)}</script>\n` : ''}</head>
<body data-page="${page}" data-section="${section}" data-nav-scope>
<a class="skip" href="#main">Skip to content</a>
<p class="proto-bar">Development build. Not the live Marpet site. <a href="dev-notes.html">Open items and test pages</a> · <a href="shot-list.html">Shot list</a></p>
<header class="site-header">
  <div class="wrap">
    <a class="brand${co.logoSvg ? ' brand--svg' : ''}" href="index.html" data-name="Home"><img src="assets/img/${co.logoSvg || co.logo}" alt="Marpet Fabrications, home" width="${co.logoSvg ? 3516 : dims[co.logo][0]}" height="${co.logoSvg ? 1284 : dims[co.logo][1]}"></a>
    <button class="menu-btn" aria-expanded="false" aria-controls="nav">Menu</button>
    <nav class="nav" id="nav" aria-label="Main">
      <ul>${NAV.map(([s, n, h]) => `<li><a href="${h}" data-section="${s}"${s === section ? ' aria-current="page"' : ''}${s === 'contact' ? '' : ''}>${n}</a></li>`).join('')}</ul>
    </nav>
    <a class="header-tel" href="tel:${co.phoneHref}">${co.phone}</a>
    <a class="btn btn--primary header-cta" href="contact.html#enquiry" data-name="Request a quote">Request a quote</a>
  </div>
</header>
${main}
<footer class="site-footer">
  <div class="wrap">
    <div class="cols">
      <div><h2>Marpet Fabrications</h2><p>${co.strapline}</p><p>${co.address.join(', ')}</p></div>
      <div><h2>Services</h2><ul>${services.map((s) => `<li><a href="service-${s.slug}.html">${s.name}</a></li>`).join('')}</ul></div>
      <div><h2>Company</h2><ul><li><a href="work.html">Our work</a></li><li><a href="about.html">About Marpet</a></li><li><a href="team.html">Meet the team</a></li><li><a href="contact.html">Contact</a></li></ul></div>
      <div><h2>Contact</h2><ul><li><a href="tel:${co.phoneHref}">${co.phone}</a></li><li><a href="mailto:${co.email}">${co.email}</a></li>${li.profileUrl ? `<li><a href="${esc(li.profileUrl)}" target="_blank" rel="noopener">LinkedIn<span class="visually-hidden"> (opens in a new tab)</span></a></li>` : ''}<li>Sister company: <a href="https://jnrengineering.co.uk/" target="_blank" rel="noopener">JNR Engineering<span class="visually-hidden"> (opens in a new tab)</span></a></li></ul></div>
    </div>
    <p class="legal"><span>${co.legalName}. Registered in Scotland ${co.companyNumber}. VAT number ${co.vat}.</span><span><a href="privacy.html">Privacy</a> · Development build. Photographs from marpet.co.uk.</span></p>
  </div>
</footer>
<script src="assets/motion.min.js" defer></script>
<script src="assets/app.js" defer></script>
</body>
</html>
`;
  writeFileSync(new URL(`./site/${file}`, import.meta.url), html);
  built.push(file);
}

const cta = (h = 'Have a drawing or a line to fit out?', p = 'Tell us what you need made and where it is going. Marpet will come back to you.') => `
<section class="cta"><div class="wrap"><div><h2>${h}</h2><p>${p}</p></div><div class="btn-row" style="margin:0"><a class="btn btn--primary" href="contact.html#enquiry" data-name="Request a quote">Request a quote</a><a class="btn btn--steel" href="tel:${co.phoneHref}">Call ${co.phone}</a></div></div></section>`;

const frameCard = (p) => `<li data-service="${p.service}"><a class="frame plate" href="project-${p.slug}.html" data-plate data-name="${esc(p.title)}">${bolts}<div class="frame__img">${img(p.hero, p.title + ', Marpet photograph', 'loading="lazy"')}</div><div class="frame__cap"><b>${p.title}</b><span>${svc(p.service).short}</span></div></a></li>`;

const stack = (list) => `<div class="stack-scene"><ol class="stack stack--grid">${list.map((s, i) => `<li><a href="service-${s.slug}.html" data-name="${esc(s.name)}"><span class="plate" data-plate>${bolts}<span class="no">${String(i + 1).padStart(2, '0')}</span><span class="name">${s.name}</span>${img(s.hero, '', 'class="thumb" loading="lazy"')}<span class="go">View</span></span></a></li>`).join('')}</ol></div>`;

const svcSelector = `<div class="svc" data-svc>
  <ol class="stack stack--flat">${services.map((s, i) => `<li><a href="service-${s.slug}.html" data-svc-item="${i}" data-name="${esc(s.name)}"><span class="plate" data-plate>${bolts}<span class="no">${String(i + 1).padStart(2, '0')}</span><span class="name">${s.name}</span><span class="go">View</span></span><span class="svc__lead">${s.lead}</span></a></li>`).join('')}</ol>
  <div class="svc__stage" aria-hidden="true">${FX}${services.map((s, i) => `<div class="svc__slide${i === 0 ? ' is-on' : ''}" data-svc-slide="${i}">
    <div class="svc__bg">${cimg(s.hero, '', i === 0 ? '' : 'loading="lazy"')}</div>
    <div class="svc__fg">${img(s.images[0], '', 'loading="lazy"')}</div>
    <div class="svc__cap"><span class="svc__no">${String(i + 1).padStart(2, '0')}</span><b>${s.name}</b><p>${s.lead}</p><ul>${s.capability.slice(0, 3).map((c) => `<li>${c}</li>`).join('')}</ul></div>
  </div>`).join('')}</div>
</div>`;

const workCard = (p, i) => `<li class="wk${i % 2 ? ' wk--alt' : ''}" data-service="${p.service}" style="--ar:${dims[p.hero][0] >= dims[p.hero][1] ? '4/3' : '4/5'};--max:${Math.round(dims[p.hero][0] * 1.15)}px"><a href="project-${p.slug}.html" data-plate data-name="${esc(p.title)}"><span class="wk__bg" aria-hidden="true">${cbg(p.hero)}</span><span class="wk__frame">${cimg(p.hero, p.title + ', Marpet photograph', i < 1 ? '' : 'loading="lazy"')}</span><span class="wk__cap"><span class="wk__no" aria-hidden="true" data-no="${String(i + 1).padStart(2, '0')}"></span><b>${p.title}</b><span class="wk__svc">${svc(p.service).name}</span><span class="wk__go">View project</span></span></a></li>`;

const jnr = `
<section class="section on-dark" id="jnr"><div class="wrap">
  <p class="eyebrow">Fabrication and machining</p>
  <div class="section-head"><h2>Need it machined as well?</h2></div>
  <div class="jnr" data-reveal>
    <div class="jnr__door jnr__door--l plate"><i class="bolt tl"></i><i class="bolt bl"></i><span>Fabricated</span></div>
    <div class="jnr__door jnr__door--r plate"><i class="bolt tr"></i><i class="bolt br"></i><span>Machined</span></div>
    <div class="jnr__inner">
      <img src="assets/jnr/logo-white.png" alt="JNR Engineering Ltd logo" width="271" height="360" loading="lazy">
      <div>
        <h3>JNR Engineering, Hamilton</h3>
        <p>JNR Engineering is Marpet's sister company. It does CNC milling, CNC turning and water jet profiling in Hamilton, with its own quotes and its own contact details.</p>

        <div class="btn-row"><a class="btn btn--ghost" href="https://jnrengineering.co.uk/" target="_blank" rel="noopener">Visit JNR Engineering<span class="visually-hidden"> (opens in a new tab)</span></a></div>
      </div>
    </div>
  </div>
</div></section>`;

const linkedin = `
<section class="section on-steel" id="linkedin"><div class="wrap">
  <p class="eyebrow">Current work</p>
  <div class="section-head"><h2>Connect with Marpet on LinkedIn</h2></div>
  ${li.posts.some((p) => p.url) ? `  <details class="li-panel" open>
    <summary class="plate">${bolts}<b>Latest from the workshop</b><span>Panel</span></summary>
    <div class="li-body">
      ${li.posts.map((p, i) => p.url ? `<a class="li-post" href="${esc(p.url)}" target="_blank" rel="noopener">${p.image ? img(p.image, '') : ''}<span>${esc(p.summary || 'View this post on LinkedIn')}</span><small>${esc(p.date || '')}<span class="visually-hidden"> (opens LinkedIn in a new tab)</span></small></a>` : ph(`LinkedIn post ${i + 1}`, 'A real Marpet post: photograph, one line of text, date and a link to the post on LinkedIn. Added by hand in the content file. No likes or follower counts are shown.')).join('')}
    </div>
  </details>` : '<p class="lead">Current jobs, new work and workshop news are posted on Marpet\'s LinkedIn page.</p>'}
  <div class="btn-row">${li.profileUrl ? `<a class="btn btn--primary" href="${li.profileUrl}">Follow Marpet on LinkedIn</a>` : `<span class="btn btn--steel" aria-disabled="true">Follow Marpet on LinkedIn</span> <span class="confirm">Page address to be added</span>`}</div>
</div></section>`;

/* ---------------- Home ---------------- */
const featured = projects.filter((p) => p.featured);
page({ file: 'index.html', title: 'Stainless steel fabrication, Glasgow', desc: 'Marpet Fabrications design, manufacture and install stainless steel, mild steel and aluminium fabrication.', section: 'home', page: 'home', main: `
<main id="main">
<section class="hero cine" data-open>
  <div class="hero__stage" data-stage>
    ${slot('home-weld').video
    ? `<div class="shot shot--film" data-shot="film">${media('home-weld')}</div>`
    : `<div class="shot shot--macro" data-shot="macro">${media('home-weld', { attrs: 'fetchpriority="high"' })}${note('home-weld')}</div>
    <div class="shot shot--frame" data-shot="frame">${media('home-detail')}${note('home-detail')}</div>`}
    <div class="shot shot--hall" data-shot="hall"><div class="shot__bg">${mbg('home-reveal')}</div><div class="shot__img">${media('home-reveal', { attrs: 'fetchpriority="high"' })}</div>${note('home-reveal')}</div>
    ${FX}
  </div>
  <div class="hero__copy">
    <p class="eyebrow">Sheet metal fabricators, Glasgow</p>
    <h1><span class="ln"><span>Fabricated</span></span> <span class="ln ln--hi"><span>into place.</span></span></h1>
    <p class="lead">Marpet design, manufacture and install stainless steel, mild steel and aluminium fabrication, in the workshop or on site.</p>
    <div class="btn-row"><a class="btn btn--primary" href="contact.html#enquiry" data-name="Request a quote">Request a quote</a><a class="btn btn--ghost" href="services.html">Our services</a></div>
  </div>
  <p class="hero__note">Marpet photographs, colour graded.</p>
  <div class="hero__ctrl"><button type="button" data-hero-skip hidden>Skip intro</button><button type="button" data-hero-replay hidden>Replay</button></div>
</section>
<section class="section on-deep process"><div class="wrap">
  <div class="process__head"><p class="eyebrow">How Marpet works</p><h2>One firm from drawing to fitted on site.</h2></div>
  <ol class="process__list">
    ${[
      ['home-design', 'Designed', 'Marpet designs the work, or makes it to your design.', 'services.html', 'Our services'],
      ['home-workshop', 'Made in the workshop', 'Made by skilled, time served tradesmen in the fabrication workshop.', 'about.html', 'About Marpet'],
      ['home-site', 'Installed on site', 'Fitted at your premises, from a single table to a complete production line.', 'work.html', 'Completed work'],
    ].map(([id, h, lead, href, label], i) => `<li class="process__item">
      <div class="process__media">${media(id, { attrs: 'loading="lazy"' })}${note(id)}</div>
      <p class="process__no">${String(i + 1).padStart(2, '0')}</p>
      <h3>${h}</h3>
      <p>${lead}</p>
      <a class="text-link" href="${href}">${label}</a>
    </li>`).join('\n    ')}
  </ol>
</div></section>
<div class="facts">
  <div><b>Design, manufacture, install</b>One firm from drawing to fitted on site.</div>
  <div><b>Stainless, mild steel, aluminium</b>Sheet metal and fabricated steelwork.</div>
  <div><b>Food and drink</b>Food processing, packaging and catering sectors.</div>
  <div><b>East of Glasgow</b>Scotland and the North of England by the M74.</div>
</div>
<section class="section on-deep wk-sec done-sec"><div class="wk-wrap">
  <div class="done-head"><p class="eyebrow">Completed work</p><h2 class="done-title"><span>Finished,</span> <span>fitted,</span> <span>in production.</span></h2><a class="text-link" href="work.html">All completed work</a></div>
  <ul class="wk-grid">${featured.map(workCard).join('')}</ul>
</div></section>
<section class="section on-white"><div class="wrap split">
  <div data-reveal>
    <p class="eyebrow">About Marpet</p>
    <h2>Stainless steel work for production floors</h2>
    <p class="lead">Marpet Fabrications has built a reputation for quality across sheet metal, engineering and fabrication, with a client base across Scotland and the North of England.</p>
    <p>The work is made by skilled, time served tradesmen, either in the fabrication workshop or on site at client premises.</p>
    <p>${co.legalName} was incorporated in ${co.incorporated} and works from Clyde Workshops, to the east of Glasgow.</p>
    <a class="text-link" href="about.html">About Marpet</a>
  </div>
  <div class="beamed" data-reveal>${img('IMG_0276.jpg', 'Stainless steel side table beside a blue belt conveyor with the MF mark on its side panel', 'loading="lazy"')}</div>
</div></section>
<section class="section on-steel"><div class="wrap">
  <p class="eyebrow">What we make</p>
  <div class="section-head"><h2>Services</h2><a class="text-link" href="services.html">All services</a></div>
  ${stack(services.slice(0, 5))}
</div></section>
<section class="section on-white"><div class="wrap">
  <p class="eyebrow">Who we work for</p>
  <div class="section-head"><h2>Customers</h2></div>
  <p>Some of the companies Marpet works for.</p>
  <ul class="customers">${co.customers.map((c) => `<li class="plate">${c}</li>`).join('')}</ul>
</div></section>
${jnr}
${linkedin}
${cta()}
</main>` });

/* ---------------- Shot list (development) ---------------- */
{
  const ids = Object.keys(slots).filter((k) => !k.startsWith('test-'));
  const todo = ids.filter((k) => !slots[k].video).length;
  page({ file: 'shot-list.html', title: 'Shot list', desc: 'What to film for each section of the Marpet site.', section: 'review', page: 'notes', main: `
<main id="main">
<section class="page-head"><div class="wrap">
  <p class="crumbs"><a href="dev-notes.html">Development notes</a><span>/</span><span>Shot list</span></p>
  <h1>Shot list</h1>
  <p class="lead">Every photographic section of the site, what it shows today and what to film for it. ${todo} of ${ids.length} still show a placeholder photograph.</p>
</div></section>
<section class="section on-white"><div class="wrap">
  <div class="table-wrap" tabindex="0" role="region" aria-label="Shot list table"><table class="shots">
    <thead><tr><th scope="col">Section</th><th scope="col">Shows now</th><th scope="col">To film</th><th scope="col">Length</th><th scope="col">Where</th><th scope="col">Status</th></tr></thead>
    <tbody>${ids.map((k) => { const s = slots[k]; return `<tr><th scope="row">${esc(s.use)}<br><code>${k}</code></th><td><img src="${stillSrc(s)}" alt="" width="160" height="${Math.round(160 * stillDims(s)[1] / stillDims(s)[0])}" loading="lazy"></td><td><b>${esc(s.brief.shot)}</b><br>${esc(s.brief.detail)}</td><td>${esc(s.brief.length)}</td><td>${esc(s.brief.where)}</td><td>${s.video ? 'Footage supplied' : 'Placeholder still'}</td></tr>`; }).join('')}</tbody>
  </table></div>
  <h2>How to supply footage</h2>
  <ul class="plain">
    <li>Real Marpet work only. People in shot must have agreed; client sites need written permission.</li>
    <li>Landscape, 4K or 1080p, 25 fps, no audio needed. Steady: tripod, slider or gimbal.</li>
    <li>Keep the left third of the frame calm: headlines sit there.</li>
    <li>Send the original files. They are trimmed to 8 to 15 second loops and compressed for the web (see docs/footage.md).</li>
  </ul>
</div></section>
</main>` });
}

/* ---------------- Media test (development) ---------------- */
{
  const T = (mode, shot) => ({ use: 'Test page', still: 'video/test/test-pattern.jpg', w: 1280, h: 720, alt: '', video: 'video/test/test-pattern.mp4', videoMobile: null, poster: 'video/test/test-pattern.jpg', mode, brief: { shot, detail: '', length: '', where: '' } });
  slots['test-loop'] = T('loop', 'Test pattern, loop');
  slots['test-scrub'] = T('scrub', 'Test pattern, scroll scrub');
  page({ file: 'media-test.html', title: 'Video sections test', desc: 'Checks that video sections play, pause and follow scroll.', section: 'review', page: 'notes', main: `
<main id="main">
<section class="page-head page-head--cine">${cineScene('test-loop')}<div class="wrap">
  <p class="crumbs"><a href="dev-notes.html">Development notes</a><span>/</span><span>Video sections test</span></p>
  <h1>Video sections</h1>
  <p class="lead">A generated test pattern, not Marpet footage. It shows how real footage will behave in each kind of section: header loop, pinned film band, and scroll-controlled clip.</p>
</div></section>
${filmBand('test-loop', { eyebrow: 'Loop', heading: 'Plays while on screen.', text: 'Pauses when it leaves the screen. With reduced motion or data saver, only the still frame is shown.' })}
${filmBand('test-scrub', { eyebrow: 'Scroll controlled', heading: 'Scroll moves through the clip.', text: 'Forward and back with the page.' })}
<section class="section on-white"><div class="wrap"><p><a class="text-link" href="shot-list.html">Shot list</a></p></div></section>
</main>` });
}

/* ---------------- Services ---------------- */
page({ file: 'services.html', title: 'Services', desc: 'Conveyor systems, production lines, pipework, access platforms, catering, dentistry and general fabrication.', section: 'services', page: 'services', main: `
<main id="main">
<section class="page-head page-head--cine">${cineScene('page-services')}<div class="wrap">
  <p class="crumbs"><a href="index.html">Home</a><span>/</span><span>Services</span></p>
  <h1>Services</h1>
  <p class="lead">Seven kinds of fabrication. Pick a plate.</p>
</div></section>
<section class="section on-deep svc-sec"><div class="wrap">
  <h2 class="visually-hidden">All services</h2>
  ${svcSelector}
</div></section>
<section class="section on-white"><div class="wrap split">
  <div><p class="eyebrow">Food and drink processing</p><h2>On the production floor</h2><ul class="ticks">${['Conveyor systems, designed and installed', 'Access platforms', 'Pipework', 'Handrails', 'Work stations', 'Ducting', 'Tables', 'Wall sheeting', 'Sinks'].map((t) => `<li>${t}</li>`).join('')}</ul></div>
  <div><p class="eyebrow">Catering</p><h2>Cafes, bars, clubs and restaurants</h2><ul class="ticks">${svc('catering').list.map((t) => `<li>${t}</li>`).join('')}</ul></div>
</div></section>
${cta()}
</main>` });

const motion = (m) => m === 'steps' ? `<div class="motion-strip motion-strip--steps" aria-hidden="true">${Array.from({ length: 9 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</div>` : m === 'none' ? '' : `<div class="motion-strip motion-strip--${m}" aria-hidden="true"></div>`;
for (const s of services) {
  const rel = projects.filter((p) => p.service === s.slug);
  page({ file: `service-${s.slug}.html`, title: s.name, desc: s.lead, section: 'services', page: 'service', main: `
<main id="main">
<section class="page-head page-head--cine page-head--layered">${layerScene(`service-${s.slug}`)}<div class="wrap split">
  <div>
    <p class="crumbs"><a href="index.html">Home</a><span>/</span><a href="services.html">Services</a><span>/</span><span>${s.name}</span></p>
    <h1>${s.name}</h1>
    <p class="lead">${s.lead}</p>

    <div class="btn-row"><a class="btn btn--primary" href="contact.html#enquiry" data-name="Request a quote">Ask about ${s.short.toLowerCase()}</a></div>
    ${motion(s.motion)}
  </div>
  <div class="page-head__media plate" data-frame-target>${bolts}<div class="frame__img">${cimg(s.hero, s.name + ', Marpet photograph')}${lowres(s.hero)}</div></div>
</div></section>
<section class="section on-white"><div class="wrap split" style="align-items:start">
  <div>
    <p class="eyebrow">The work</p>
    <h2>What Marpet does</h2>
    ${s.body.map((b) => `<p>${b}</p>`).join('')}
    ${s.list ? `<ul class="ticks">${s.list.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
  </div>
  <div><p class="eyebrow">Capability</p><h2>How it is made</h2><ul class="ticks">${s.capability.map((t) => `<li>${t}</li>`).join('')}</ul></div>
</div></section>
<section class="section on-steel"><div class="wrap">
  <p class="eyebrow">Photographs</p>
  <div class="section-head"><h2>Examples of ${s.short.toLowerCase()}</h2></div>
  <div class="gallery">${s.images.map((f) => `<figure class="plate">${bolts}<div class="frame__img">${img(f, s.name + ', Marpet photograph', 'loading="lazy"')}${lowres(f)}</div></figure>`).join('')}</div>
</div></section>
${rel.length ? `<section class="section on-dark"><div class="wrap"><p class="eyebrow">Related work</p><div class="section-head"><h2>Projects</h2><a class="text-link" href="work.html?service=${s.slug}">All ${s.short.toLowerCase()} work</a></div><ul class="grid">${rel.slice(0, 3).map(frameCard).join('')}</ul></div></section>` : ''}
${cta(`Need ${s.short.toLowerCase()} made?`)}
</main>` });
}

/* ---------------- Work ---------------- */
const used = [...new Set(projects.map((p) => p.service))];
page({ file: 'work.html', title: 'Our work', desc: 'Completed fabrication work by Marpet Fabrications.', section: 'work', page: 'work', main: `
<main id="main">
<section class="page-head page-head--cine">${cineScene('page-work')}<div class="wrap">
  <p class="crumbs"><a href="index.html">Home</a><span>/</span><span>Our work</span></p>
  <h1>Our work</h1>
  <p class="lead">Conveyors, production lines, pipework, platforms and stainless fit-outs, photographed in the workshop and on site.</p>
</div></section>
<section class="section on-deep wk-sec"><div class="wk-wrap">
  <h2 class="visually-hidden">Projects</h2>
  <div class="filter" data-filter role="group" aria-label="Filter projects by service"><button type="button" value="all" aria-pressed="true">All</button>${used.map((u) => `<button type="button" value="${u}" aria-pressed="false">${svc(u).short}</button>`).join('')}</div>
  <p class="filter-count" data-filter-count aria-live="polite">${projects.length} projects shown</p>
  <ul class="wk-grid" data-filter-list data-work>${projects.map(workCard).join('')}</ul>
</div></section>
${cta()}
</main>` });

for (const p of projects) {
  const s = svc(p.service);
  const rel = projects.filter((x) => x.service === p.service && x.slug !== p.slug).slice(0, 3);
  page({ file: `project-${p.slug}.html`, title: p.title, desc: `${p.title}. ${s.name} by Marpet Fabrications.`, section: 'work', page: 'project', main: `
<main id="main">
<section class="page-head page-head--cine page-head--layered">${layerScene_p(p)}<div class="wrap split">
  <div>
    <p class="crumbs"><a href="index.html">Home</a><span>/</span><a href="work.html">Our work</a><span>/</span><span>${p.title}</span></p>
    <h1>${p.title}</h1>
    <p class="lead">${s.lead}</p>
    <dl class="spec">
      <dt>Service</dt><dd><a href="service-${s.slug}.html">${s.name}</a></dd>
      ${p.client ? `<dt>Client</dt><dd>${esc(p.client)}</dd>` : ''}
      ${p.date ? `<dt>Date</dt><dd>${esc(p.date)}</dd>` : ''}

    </dl>
  </div>
  <div class="page-head__media plate" data-frame-target>${bolts}<div class="frame__img">${cimg(p.hero, p.title + ', Marpet photograph')}${lowres(p.hero)}</div></div>
</div></section>
<section class="section on-white"><div class="wrap split" style="align-items:start">
  <div><p class="eyebrow">Overview</p><h2>What was made</h2>${p.overview ? `<p>${esc(p.overview)}</p>` : `<p>${s.body[0]}</p><p>The photographs on this page are Marpet's own, taken in the workshop and on site.</p>`}</div>
  <div><p class="eyebrow">Scope</p><h2>How it is made</h2>${p.scope ? `<p>${esc(p.scope)}</p>` : `<ul class="ticks">${s.capability.map((t) => `<li>${t}</li>`).join('')}</ul>`}</div>
</div></section>
${p.images.length ? `<section class="section on-steel"><div class="wrap"><p class="eyebrow">Photographs</p><div class="section-head"><h2>More images</h2></div><div class="gallery">${p.images.map((f) => `<figure class="plate">${bolts}<div class="frame__img">${img(f, p.title + ', Marpet photograph', 'loading="lazy"')}${lowres(f)}</div></figure>`).join('')}</div></div></section>` : ''}
${rel.length ? `<section class="section on-dark"><div class="wrap"><p class="eyebrow">Related</p><div class="section-head"><h2>More ${s.short.toLowerCase()} work</h2><a class="text-link" href="service-${s.slug}.html">${s.name}</a></div><ul class="grid">${rel.map(frameCard).join('')}</ul></div></section>` : ''}
${cta('Need something similar?')}
</main>` });
}

/* ---------------- About ---------------- */
page({ file: 'about.html', title: 'About Marpet', desc: 'Marpet Fabrications, sheet metal fabricators to the east of Glasgow.', section: 'about', page: 'about', main: `
<main id="main">
<section class="page-head page-head--cine">${cineScene('page-about')}<div class="wrap">
  <p class="crumbs"><a href="index.html">Home</a><span>/</span><span>About</span></p>
  <h1>About Marpet</h1>
  <p class="lead">Sheet metal fabricators to the east of Glasgow, serving food processing, packaging and catering.</p>
</div></section>
${filmBand('band-about', { eyebrow: 'In the workshop', heading: 'Made by hand, fitted on site.', text: 'Skilled, time served tradesmen, in the fabrication workshop or at your premises.' })}
<section class="section on-white"><div class="wrap split">
  <div data-reveal>
    <p class="eyebrow">The company</p>
    <h2>Where we are and who we work for</h2>
    <p>Marpet Fabrications is located to the east of Glasgow, placed to serve local customers and those further afield by the M74.</p>
    <p>Marpet is an established supplier to food processing, packaging and catering, working with companies locally and nationally.</p>
    <p>${co.legalName} was incorporated in ${co.incorporated} and is registered in Scotland, number ${co.companyNumber}.</p>
  </div>
  <div class="beamed" data-reveal>${img('general-fabrication-1.jpg', 'Stainless steel roller table with enclosure in front of a Marpet Fabrications van', 'loading="lazy"')}</div>
</div></section>
<section class="section on-steel"><div class="wrap split">
  <div class="beamed" data-reveal>${img('IMG_0283.jpg', 'Long stainless steel belt conveyor installed in a food production hall', 'loading="lazy"')}</div>
  <div data-reveal>
    <p class="eyebrow">How we work</p>
    <h2>Workshop or on site</h2>
    <p>The work is produced by skilled, time served tradesmen in a fully equipped fabrication workshop, or on site at client premises.</p>
    <p>Marpet will design, manufacture and install on site virtually all types of stainless steel, mild steel or aluminium fabrication.</p>

  </div>
</div></section>
${jnr}
${cta()}
</main>` });

/* ---------------- Team ---------------- */
page({ file: 'team.html', title: 'Meet the team', desc: 'The people behind Marpet Fabrications.', section: 'team', page: 'team', main: `
<main id="main">
<section class="page-head page-head--cine">${cineScene('page-team')}<div class="wrap">
  <p class="crumbs"><a href="index.html">Home</a><span>/</span><span>Team</span></p>
  <h1>Meet the team</h1>
  <p class="lead">Team content will be supplied by Marpet. Every plate below is an empty slot.</p>
</div></section>
<section class="section on-steel"><div class="wrap">
  <h2 class="visually-hidden">Team members</h2>
  <div class="team">${team.map((m, i) => `
    <details class="member"${i === 0 ? ' open' : ''}>
      <summary class="plate">${bolts}<b>${m.name || 'Name to be supplied'}</b><em>${m.role || 'Job title'}</em><span class="hint">Lift plate</span></summary>
      <div class="member__body">${m.photo ? `<img class="member__photo" src="assets/img/${esc(m.photo)}" alt="${esc(m.name || '')}" loading="lazy">` : '<div class="ph member__photo"><div><b>Placeholder: photograph</b><p>Approved portrait, 4:5.</p></div></div>'}${m.bio ? `<p>${esc(m.bio)}</p>` : ph('biography', 'Two or three sentences and responsibilities, approved by the person before publication.')}</div>
    </details>`).join('')}</div>
</div></section>
${cta('Want to talk to the people who will make it?')}
</main>` });

/* ---------------- Contact ---------------- */
page({ file: 'contact.html', title: 'Contact', desc: 'Contact Marpet Fabrications to discuss your fabrication requirements.', section: 'contact', page: 'contact', main: `
<main id="main">
<section class="page-head page-head--cine">${cineScene('page-contact')}<div class="wrap">
  <p class="crumbs"><a href="index.html">Home</a><span>/</span><span>Contact</span></p>
  <h1>Contact Marpet</h1>
  <p class="lead">Call, email, or send the form. The form needs nothing but a name, a way to reach you and what you need.</p>
</div></section>
<section class="section on-steel"><div class="wrap split" style="align-items:start">
  <div class="contact-card plate">${bolts}
    <h2>Direct</h2>
    <p><a class="big" href="tel:${co.phoneHref}">${co.phone}</a><a href="mailto:${co.email}">${co.email}</a></p>
    <p>${co.address.join('<br>')}</p>
    <p>Fax ${co.fax}</p>
    <p><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(co.address.join(', '))}" target="_blank" rel="noopener">Find us on Google Maps<span class="visually-hidden"> (opens in a new tab)</span></a></p>

  </div>
  <form class="form" id="enquiry" data-enquiry method="post" ${co.enquiryEndpoint ? `action="${esc(co.enquiryEndpoint)}"` : ''} data-email="${co.email}" novalidate>
    <h2 class="full">Request a quote</h2>
    <div class="full form-status" id="enquiry-status" data-form-status role="status" tabindex="-1" hidden></div>
    <div class="full error-summary" data-error-summary role="alert" tabindex="-1" hidden><h3>Check the form</h3><ul></ul></div>
    <div><label for="f-name">Name</label><input id="f-name" name="name" autocomplete="name" required minlength="2" maxlength="100" aria-describedby="f-name-err"><p class="field-error" id="f-name-err" hidden></p></div>
    <div><label for="f-company">Company (optional)</label><input id="f-company" name="company" autocomplete="organization" maxlength="120"></div>
    <div><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" required maxlength="254" aria-describedby="f-email-err"><p class="field-error" id="f-email-err" hidden></p></div>
    <div><label for="f-tel">Phone (optional)</label><input id="f-tel" name="tel" type="tel" autocomplete="tel" maxlength="40" aria-describedby="f-tel-err"><p class="field-error" id="f-tel-err" hidden></p></div>
    <div class="full"><label for="f-service">What do you need? (optional)</label><select id="f-service" name="service"><option value="">Choose one</option>${services.map((s) => `<option>${s.name}</option>`).join('')}<option>Something else</option></select></div>
    <div class="full"><label for="f-msg">Tell us about the job</label><textarea id="f-msg" name="message" required minlength="10" maxlength="5000" aria-describedby="f-msg-hint f-msg-err"></textarea><p class="hint" id="f-msg-hint">Sizes, material, where it is going and when you need it. Drawings and photographs can follow by email.</p><p class="field-error" id="f-msg-err" hidden></p></div>
    <div class="hp" aria-hidden="true"><label for="f-website">Leave this field empty</label><input id="f-website" name="website" tabindex="-1" autocomplete="off"></div>
    <input type="hidden" name="ts" value="">
    ${co.turnstileSiteKey ? `<div class="full cf-turnstile" data-sitekey="${esc(co.turnstileSiteKey)}"></div>` : ''}
    <div class="full"><button class="btn btn--primary" type="submit">Send enquiry</button></div>
    <p class="full hint">We use what you send only to answer your enquiry. <a href="privacy.html">Privacy</a></p>
    ${co.enquiryEndpoint ? '' : `<p class="full"><span class="confirm">Not connected</span> No sending service is set up yet. Until it is, this form checks what you type and then opens your email program with the enquiry ready to send to ${co.email}.</p>`}
  </form>
</div></section>
</main>` });

/* ---------------- Privacy ---------------- */
page({ file: 'privacy.html', title: 'Privacy', desc: 'How Marpet Fabrications handles enquiry information.', section: 'privacy', page: 'privacy', main: `
<main id="main">
<section class="page-head"><div class="wrap">
  <p class="crumbs"><a href="index.html">Home</a><span>/</span><span>Privacy</span></p>
  <h1>Privacy</h1>
</div></section>
<section class="section on-white"><div class="wrap">
    <h2>Who we are</h2>
  <p>${co.legalName} (registered in Scotland, ${co.companyNumber}) is responsible for the information you give us through this website. You can reach us at ${co.address.join(', ')}, on ${co.phone}, or at <a href="mailto:${co.email}">${co.email}</a>.</p>
  <h2>What we collect</h2>
  <p>When you send an enquiry we collect your name, your email address and what you tell us about the job. Your company, phone number and the type of work are optional.</p>
  <p>This website does not use advertising or tracking cookies.</p>
  <h2>Why we use it</h2>
  <p>We use what you send to answer your enquiry, to prepare a quotation, and to carry out any work that follows. We rely on our legitimate interest in replying to people who contact us, and on taking steps you have asked for before entering into a contract.</p>
  <p>We do not sell your information and we do not use it for marketing.</p>
  <h2>Who sees it</h2>
  <p>Your enquiry is read by Marpet staff. It is delivered to us by email, and the form is checked for spam, so the companies that provide those services handle it on our behalf.</p>
  <h2>How long we keep it</h2>
  <p>We keep enquiries for as long as we need them to deal with your request and any work that follows, and for as long as the law requires us to keep business records.</p>
  <h2>Your rights</h2>
  <p>You can ask us for a copy of the information we hold about you, ask us to correct it or delete it, or object to how we use it. Email <a href="mailto:${co.email}">${co.email}</a>.</p>
  <p>If you are unhappy with how we have handled your information you can complain to the Information Commissioner's Office at <a href="https://ico.org.uk/make-a-complaint/" target="_blank" rel="noopener">ico.org.uk<span class="visually-hidden"> (opens in a new tab)</span></a>.</p>
</div></section>
</main>` });

/* ---------------- Not found ---------------- */
page({ file: '404.html', title: 'Page not found', desc: 'That page does not exist.', section: 'none', page: 'notfound', main: `
<main id="main">
<section class="page-head"><div class="wrap">
  <h1>Page not found</h1>
  <p class="lead">That page has moved or does not exist.</p>
  <div class="btn-row"><a class="btn btn--primary" href="index.html">Home</a><a class="btn btn--ghost" href="services.html">Services</a><a class="btn btn--ghost" href="contact.html">Contact</a></div>
</div></section>
</main>` });

/* ---------------- Old addresses, for the launch redirect rules ---------------- */
const redirects = [
  { from: '/index.html', to: '/' }, { from: '/about.html', to: '/about' }, { from: '/services.html', to: '/services' }, { from: '/contact.html', to: '/contact' },
  ...services.map((s) => ({ from: '/' + s.oldUrl, to: '/services/' + s.slug })),
];

/* ---------------- Development notes (not part of the public site) ---------------- */
const openContent = [
  ['Logo', 'A vector or high resolution original. It replaces site/assets/img/logo.jpg, or set "logo" in content/company.json. The 3D logo plate uses the same file.'],
  ['LinkedIn', 'The company page address goes in content/linkedin.json ("profileUrl"). Posts to feature go in the same file.'],
  ['Photographs', 'Largest existing photograph is 1024 x 768. Higher resolution originals or a new shoot, plus workshop and people photographs.'],
  ['Team', 'Names, job titles, biographies and approved portraits. Four empty plates are shown.'],
  ['Projects', 'Eleven projects are grouped from existing photographs and titled from what they show. Real titles, dates and scope can be added in content/projects.json.'],
  ['Dentistry and Catering', 'Both are on the existing site and are kept. Say if either is no longer offered.'],
  ['Privacy notice', 'Written from what the site does. It should be read by Marpet before launch, and updated when the enquiry sending service is chosen.'],
  ['Conveyor model', 'Measured drawings or more photographs. Drive, underside and belt return are not modelled.'],
];
const decisions = [
  ['Founding date', 'Incorporated 1997, from company registry listings. The "early 80s" wording on the old site is not used.'],
  ['Address', 'Fullarton Road, as in the registry listings. A Google Maps link is on the contact page.'],
  ['Company number', 'SC172812.'],
  ['Customers', 'The ten names from the existing site are published.'],
  ['Fax', 'Still in use and shown.'],
  ['JNR Engineering', 'Described as Marpet\'s sister company. Enquiries stay separate.'],
  ['Service capability', 'Taken from the existing site: materials, design to installation, workshop or on site, standard and bespoke sizes.'],
];
const openTech = [
  ['Enquiry sending', 'The server function is written and tested (api/enquiry.js) but not connected: it needs a Resend account with a verified sending domain, a Cloudflare Turnstile site key and secret, and a host that runs it.'],
  ['Hosting and domain', 'Where the new site will be hosted, and access to marpet.co.uk DNS for launch and redirects.'],
  ['Real phone test', 'Frame rate on real phones has not been measured. Use the phone test page.'],
  ['Analytics', 'None installed. Choose one, or none, before launch.'],
];
page({ file: 'dev-notes.html', title: 'Development notes', desc: 'Open items and test pages for the Marpet development build.', section: 'review', page: 'notes', main: `
<main id="main">
<section class="page-head"><div class="wrap">
  <h1>Development notes</h1>
  <p class="lead">Not part of the public site. What is still needed, and the test pages.</p>
  <div class="btn-row"><a class="btn btn--ghost" href="material-test.html">Realism test</a><a class="btn btn--ghost" href="phone-test.html" data-no-nav>Phone test</a><a class="btn btn--ghost" href="index.html?intro=1" data-no-nav>Replay the homepage opening</a></div>
</div></section>
<section class="section on-white"><div class="wrap">
  <h2>Content needed from Marpet</h2>
  <div class="table-wrap"><table><tbody>${openContent.map((r) => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</tbody></table></div>
  <h2 style="margin-top:2.5rem">Decisions made (17 November 2026)</h2>
  <div class="table-wrap"><table><tbody>${decisions.map((r) => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</tbody></table></div>
  <h2 style="margin-top:2.5rem">Technical items</h2>
  <div class="table-wrap"><table><tbody>${openTech.map((r) => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</tbody></table></div>
  <h2 style="margin-top:2.5rem">Old addresses to redirect at launch</h2>
  <div class="table-wrap"><table><thead><tr><th scope="col">Existing address</th><th scope="col">New address</th></tr></thead><tbody>${redirects.map((r) => `<tr><td>${r.from}</td><td>${r.to}</td></tr>`).join('')}</tbody></table></div>
</div></section>
</main>` });

/* ---------------- Realism test (isolated; nothing else on the site uses these assets) ---------------- */
const V = 'data-model="assets/render/conveyor.glb" data-hdri="assets/render/studio.exr"';
const why = [
  ['No occlusion', 'Every surface reflected the full studio, even inside joints and under the frame.', 'Ambient occlusion baked in Blender into the model, one part at a time so nothing ghosts during assembly.'],
  ['No grounding', 'One hard shadow map and a floor that could not reflect.', 'Two soft shadow maps, contact shadows that follow moving parts, a pool of light, and a soft reflection near the machine on desktop.'],
  ['Legs lit like plastic', 'Bright lamps and a bright studio floor in the reflections turned the legs flat white.', 'Lamps cut to shadow-casting only. The reflected environment now includes the dark floor.'],
  ['Lost surface detail', 'Blender\'s procedural grain, scratches and smudges do not export to GLB.', 'A single 4096 px roughness texture mapped once across the whole side panel, with anisotropic highlights.'],
  ['Wrong light levels', 'I had the HDRI five times too bright and the lamps sixteen times too bright.', 'HDRI at Blender\'s strength, plus a light card for each Blender lamp at the same position, size and output.'],
  ['Heavy, unmerged model', '418 separate parts, 370,000 triangles, 2.7 MB.', '13 merged parts, 112,000 triangles, 1.26 MB (0.65 MB compressed). A simplified phone version was tried and rejected: it faceted the side panel.'],
];
const still = [
  ['Light between parts', 'Cycles bounces light between the frame, legs and floor. Three.js lights each surface from the studio alone.'],
  ['Blurred reflections of nearby objects', 'The Cycles floor shows a soft reflection that fades with distance. The Three.js mirror is sharp and even.'],
  ['Depth of field and fine grain', 'Cycles has lens blur and sub-pixel brushing. Three.js is sharp everywhere and its grain is a texture.'],
];
const refs = [
  'Three-quarter, side-on, end-on and plan photographs of one complete conveyor, taken from the same distance',
  'Close-ups of the drive end, tail end, a leg foot, a frame joint and a finished weld',
  'The drive side: motor, gearbox and how they mount. No current photograph shows it clearly, so none is modelled',
  'Underside and belt return, including any support rollers',
  'Belt type per conveyor: flat PU belt or modular plastic belt, colour and pitch',
  'Overall length, width and belt height, sheet thickness, leg section size, fastener sizes',
  'A general arrangement drawing or CAD export (STEP) if one exists. This replaces most of the list above',
  'The steel finish specified (for example 2B, or brushed to 240 grit) and a straight-on photograph of a clean panel in daylight',
  'Which conveyor Marpet wants shown, and confirmation it may be shown',
];
page({ file: 'material-test.html', title: 'Realism test', desc: 'Interactive conveyor test against a Blender Cycles benchmark.', section: 'review', page: 'test', main: `
<main id="main">
<section class="page-head"><div class="wrap">
  <p class="crumbs"><a href="dev-notes.html">Development notes</a><span>/</span><span>Realism test</span></p>
  <h1>Realism test</h1>
  <p class="lead">One Blender master model, shown two ways: rendered offline as the benchmark, and running live in Three.js. The homepage, its layout and its copy are unchanged.</p>
</div></section>
<section class="section on-deep"><div class="wrap">
  <p class="eyebrow">Interactive</p><div class="section-head"><h2>Turn it, zoom it, build it</h2></div>
  <div class="stage3d">
    <div class="viewer viewer--big" data-viewer data-interactive data-view="hero" ${V}><canvas aria-label="Interactive 3D conveyor. Drag to rotate, scroll or pinch to zoom."></canvas></div>
    <div class="stage3d__bar">
      <button type="button" class="chip" data-play>Play assembly</button>
      <label class="chip chip--range">Assembly <input type="range" min="0" max="1000" value="1000" data-assembly aria-label="Assembly progress"></label>
      <button type="button" class="chip" data-run aria-pressed="false">Run belt</button>
      <span class="chip-gap"></span>
      <button type="button" class="chip" data-goto="hero">Whole</button>
      <button type="button" class="chip" data-goto="drive">Drive end</button>
      <button type="button" class="chip" data-goto="weld">Leg weld</button>
    </div>
    <p class="fps" data-hud aria-live="off">Loading model</p>
  </div>
  <p style="margin-top:1rem"><a class="text-link" href="phone-test.html" data-no-nav>Open the phone test page</a></p>
  <p>Drag to rotate. Scroll or pinch to zoom. The slider scrubs the assembly in either direction.</p>
</div></section>
<section class="section on-dark"><div class="wrap">
  <p class="eyebrow">Side by side</p><div class="section-head"><h2>Blender Cycles against Three.js, same camera</h2></div>
  <p>Each pair uses the same model, camera position, aim, lens, HDRI and lamp positions. Left is rendered offline. Right is drawn live by your browser.</p>
  ${[['hero', 'Whole conveyor', 'reflections and overall light'], ['drive', 'Drive end', 'surface texture, bends, fasteners and take-up'], ['weld', 'Leg joint', 'welds, gussets and shadow under the frame']].map(([v, t, d]) => `
  <h3 style="margin-top:2.2rem">${t}: ${d}</h3>
  <div class="cmp">
    <figure><img src="assets/render/${v}.jpg" alt="Blender Cycles render, ${t.toLowerCase()}" width="1600" height="1000" loading="lazy"><figcaption><b>Blender Cycles (benchmark)</b>Path traced offline.</figcaption></figure>
    <figure><div class="viewer" data-viewer data-view="${v}" ${V}><canvas aria-label="Three.js render, ${t.toLowerCase()}"></canvas></div><figcaption><b>Three.js (live)</b>Real time in your browser.</figcaption></figure>
  </div>`).join('')}
</div></section>
<section class="section on-white"><div class="wrap">
  <p class="eyebrow">Diagnosis</p><div class="section-head"><h2>Why the first Three.js version looked flat</h2></div>
  <div class="table-wrap"><table><thead><tr><th scope="col">Cause</th><th scope="col">What was wrong</th><th scope="col">What changed</th></tr></thead><tbody>${why.map((r) => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div>
  <h3 style="margin-top:2rem">What real time still cannot match</h3>
  <div class="table-wrap"><table><tbody>${still.map((r) => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td></tr>`).join('')}</tbody></table></div>
</div></section>
<section class="section on-steel"><div class="wrap">
  <p class="eyebrow">Navigation plate</p><div class="section-head"><h2>Plate test</h2></div>
  <p>The new plate is a Cycles render of a 4 mm brushed plate with four socket screws, sliced so one 18 KB image fits any size. Lettering is dark, like laser marking. Hover or tab to it.</p>
  <h3>Before</h3>
  <div class="swatch on-deep"><div class="plate-row">${['Services', 'Our work', 'About'].map((n) => `<span class="plate" style="padding:.8rem 1.4rem;font:700 1.05rem/1 var(--head);letter-spacing:.12em;text-transform:uppercase">${n}</span>`).join('')}</div></div>
  <h3 style="margin-top:2rem">After</h3>
  <div class="swatch on-deep"><div class="plate-row">${[['Services', 'services.html'], ['Our work', 'work.html'], ['About', 'about.html'], ['Team', 'team.html'], ['Contact', 'contact.html']].map(([n, h]) => `<a class="rplate" href="${h}"><span>${n}</span></a>`).join('')}</div></div>
  <div class="swatch" style="padding-inline:0"><a class="rplate rplate--lg" href="service-conveyor-systems.html" data-plate data-name="Conveyor systems"><span class="sm">01</span><span>Conveyor systems</span><span class="sm">View</span></a></div>
</div></section>
<section class="section on-white"><div class="wrap">
  <p class="eyebrow">Reference</p><div class="section-head"><h2>Material needed from Marpet</h2></div>
  <ul class="ticks" style="grid-template-columns:1fr">${refs.map((r) => `<li>${r}</li>`).join('')}</ul>
</div></section>
</main>` });

/* ---------------- Phone test (isolated) ---------------- */
page({ file: 'phone-test.html', title: 'Phone test', desc: 'Measure the interactive conveyor on this device.', section: 'review', page: 'phone', main: `
<main id="main">
<section class="section on-deep" style="padding-top:1.5rem"><div class="wrap">
  <h1 style="font-size:clamp(2rem,6vw,3.2rem);color:#fff">Phone test</h1>
  <p>Wait for the model, try rotating and pinching, then press the button. It takes about 12 seconds and measures this device, not a simulation.</p>
  <div class="stage3d">
    <div class="viewer viewer--big" data-viewer data-interactive data-view="hero" ${V}><canvas aria-label="Interactive 3D conveyor. Drag to rotate, pinch to zoom."></canvas></div>
    <div class="stage3d__bar">
      <button type="button" class="chip" data-bench>Run phone test</button>
      <button type="button" class="chip" data-play>Play assembly</button>
      <button type="button" class="chip" data-run aria-pressed="false">Run belt</button>
      <label class="chip chip--range">Assembly <input type="range" min="0" max="1000" value="1000" data-assembly aria-label="Assembly progress"></label>
    </div>
    <p class="fps" data-hud aria-live="off">Loading model</p>
  </div>
  <h2 style="margin-top:2rem;font-size:1.6rem;color:#fff">Results</h2>
  <p data-bench-status role="status">Not run yet.</p>
  <textarea data-bench-out readonly rows="14" aria-label="Test results" style="width:100%;font:13px/1.4 ui-monospace,monospace;background:#0b1226;color:#dbe2f2;border:1px solid rgba(255,255,255,.25);padding:.8rem;border-radius:3px"></textarea>
  <div class="btn-row"><button type="button" class="btn btn--primary" data-bench-copy>Copy results</button></div>
  <p style="margin-top:1rem">Paste the results back to me. Add <code>?tier=desktop</code> to the address to try the full-quality version on this device.</p>
</div></section>
</main>` });

writeFileSync(new URL('./site/redirects.json', import.meta.url), JSON.stringify(redirects, null, 2) + String.fromCharCode(10));
console.log('built', built.length, 'pages');
