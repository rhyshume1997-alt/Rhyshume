// Builds the static prototype into ./site from ./content/*.json.
// Run: node build.mjs   Then serve ./site with any static server.
import { readFileSync, writeFileSync } from 'node:fs';
const J = (f) => JSON.parse(readFileSync(new URL(`./content/${f}.json`, import.meta.url)));
const co = J('company'), services = J('services'), projects = J('projects'), team = J('team'), li = J('linkedin'), dims = J('image-dims');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const svc = (slug) => services.find((s) => s.slug === slug);
const img = (file, alt, attrs = '') => { const [w, h] = dims[file] || [0, 0]; return `<img src="assets/img/${file}" alt="${esc(alt)}" width="${w}" height="${h}" decoding="async" ${attrs}>`; };
const lowres = (file) => (dims[file] && dims[file][0] < 600 ? `<span class="res">Source ${dims[file][0]}px wide</span>` : '');
const ph = (title, body) => `<div class="ph"><b>Placeholder: ${title}</b><p>${body}</p></div>`;
const bolts = '<i class="bolt tl"></i><i class="bolt tr"></i><i class="bolt bl"></i><i class="bolt br"></i>';

const NAV = [['services', 'Services', 'services.html'], ['work', 'Our Work', 'work.html'], ['about', 'About', 'about.html'], ['team', 'Team', 'team.html'], ['contact', 'Contact', 'contact.html']];

function page({ file, title, desc, section, page, main }) {
  const html = `<!DOCTYPE html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>${esc(title)} | Marpet Fabrications (prototype)</title>
<meta name="description" content="${esc(desc)}">
<link rel="icon" href="data:,">
<link rel="preload" href="assets/fonts/barlow-condensed-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="assets/styles.css">
<script type="importmap">{"imports":{"three":"./assets/vendor/three.module.js"}}</script>
</head>
<body data-page="${page}" data-section="${section}" data-nav-scope>
<a class="skip" href="#main">Skip to content</a>
<p class="proto-bar">Design prototype for review. Not the live Marpet site. <a href="storyboard.html">Storyboard, concepts and open items</a> · <a href="material-test.html">Realism test</a></p>
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="index.html" data-name="Home"><img src="assets/img/logo.jpg" alt="Marpet Fabrications 1997 Limited, home" width="293" height="107"></a>
    <button class="menu-btn" aria-expanded="false" aria-controls="nav">Menu</button>
    <nav class="nav" id="nav" aria-label="Main">
      <ul>${NAV.map(([s, n, h]) => `<li><a href="${h}" data-section="${s}"${s === section ? ' aria-current="page"' : ''}${s === 'contact' ? ' data-transition="shutter"' : ''}>${n}</a></li>`).join('')}</ul>
    </nav>
    <a class="header-tel" href="tel:${co.phoneHref}">${co.phone}</a>
    <a class="btn btn--primary header-cta" href="contact.html#enquiry" data-transition="shutter" data-name="Request a quote">Request a quote</a>
  </div>
</header>
${main}
<footer class="site-footer">
  <div class="wrap">
    <div class="cols">
      <div><h2>Marpet Fabrications</h2><p>${co.strapline}</p><p>${co.address.join(', ')}</p></div>
      <div><h2>Services</h2><ul>${services.map((s) => `<li><a href="service-${s.slug}.html">${s.name}</a></li>`).join('')}</ul></div>
      <div><h2>Company</h2><ul><li><a href="work.html">Our work</a></li><li><a href="about.html">About Marpet</a></li><li><a href="team.html">Meet the team</a></li><li><a href="contact.html" data-transition="shutter">Contact</a></li></ul></div>
      <div><h2>Contact</h2><ul><li><a href="tel:${co.phoneHref}">${co.phone}</a></li><li><a href="mailto:${co.email}">${co.email}</a></li><li>LinkedIn <span class="confirm">URL to confirm</span></li><li>Family: <a href="https://jnrengineering.co.uk/" target="_blank" rel="noopener">JNR Engineering<span class="visually-hidden"> (opens in a new tab)</span></a></li></ul></div>
    </div>
    <p class="legal"><span>Registered in Scotland ${co.companyNumber}. VAT number ${co.vat}. <span class="confirm">Confirm before launch</span></span><span>Prototype. Photographs from marpet.co.uk.</span></p>
  </div>
</footer>
<script src="assets/vendor/gsap.min.js" defer></script>
<script src="assets/app.js" defer></script>
</body>
</html>
`;
  writeFileSync(new URL(`./site/${file}`, import.meta.url), html);
}

const cta = (h = 'Have a drawing or a line to fit out?', p = 'Tell us what you need made and where it is going. Marpet will come back to you.') => `
<section class="cta"><div class="wrap"><div><h2>${h}</h2><p>${p}</p></div><div class="btn-row" style="margin:0"><a class="btn btn--primary" href="contact.html#enquiry" data-transition="shutter" data-name="Request a quote">Request a quote</a><a class="btn btn--steel" href="tel:${co.phoneHref}">Call ${co.phone}</a></div></div></section>`;

const frameCard = (p) => `<li data-service="${p.service}"><a class="frame plate" href="project-${p.slug}.html" data-transition="frame" data-plate data-name="${esc(p.title)}">${bolts}<div class="frame__img">${img(p.hero, p.title + ', Marpet photograph', 'loading="lazy"')}</div><div class="frame__cap"><b>${p.title}</b><span>${svc(p.service).short}</span></div></a></li>`;

const stack = (list) => `<div class="stack-scene"><ol class="stack">${list.map((s, i) => `<li><a href="service-${s.slug}.html" data-name="${esc(s.name)}"><span class="plate" data-plate>${bolts}<span class="no">${String(i + 1).padStart(2, '0')}</span><span class="name">${s.name}</span>${img(s.hero, '', 'class="thumb" loading="lazy"')}<span class="go">View</span></span></a></li>`).join('')}</ol></div>`;

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
        <p>CNC milling, CNC turning and water jet profiling. JNR is a separate company with its own quotes and its own contact details.</p>
        <p><span class="confirm">To confirm</span> The exact relationship wording. JNR's own site lists Marpet under "Family". Nothing about ownership or a group is stated here until it is approved.</p>
        <div class="btn-row"><a class="btn btn--ghost" href="https://jnrengineering.co.uk/" target="_blank" rel="noopener">Visit JNR Engineering<span class="visually-hidden"> (opens in a new tab)</span></a></div>
      </div>
    </div>
  </div>
</div></section>`;

const linkedin = `
<section class="section on-steel" id="linkedin"><div class="wrap">
  <p class="eyebrow">Current work</p>
  <div class="section-head"><h2>Connect with Marpet on LinkedIn</h2></div>
  <details class="li-panel" open>
    <summary class="plate">${bolts}<b>Latest from the workshop</b><span>Panel</span></summary>
    <div class="li-body">
      ${li.posts.map((p, i) => ph(`LinkedIn post ${i + 1}`, 'A real Marpet post: photograph, one line of text, date and a link to the post on LinkedIn. Added by hand in the content file. No likes or follower counts are shown.')).join('')}
    </div>
  </details>
  <div class="btn-row">${li.profileUrl ? `<a class="btn btn--primary" href="${li.profileUrl}">Follow Marpet on LinkedIn</a>` : `<span class="btn btn--steel" aria-disabled="true">Follow Marpet on LinkedIn</span> <span class="confirm">Company page URL to confirm. None is linked from the existing site.</span>`}</div>
</div></section>`;

/* ---------------- Home ---------------- */
const featured = projects.filter((p) => p.featured);
page({ file: 'index.html', title: 'Stainless steel fabrication, Glasgow', desc: 'Marpet Fabrications design, manufacture and install stainless steel, mild steel and aluminium fabrication.', section: 'home', page: 'home', main: `
<main id="main">
<section class="hero">
  <div class="hero__stage" data-hero>
    <img class="hero__poster" src="assets/hero-poster.jpg" alt="Illustrative model of a stainless steel belt conveyor carrying the Marpet Fabrications logo plate" width="1600" height="900" fetchpriority="high">
    <canvas aria-hidden="true"></canvas>
    <div class="callout" data-anchor="0.1,0.92,0"><a href="service-conveyor-systems.html" data-name="Conveyor systems">Conveyor systems</a></div>
    <div class="callout" data-anchor="-1.15,0.3,0.33"><a href="service-general-fabrication.html" data-name="General fabrication">Frames and general fabrication</a></div>
  </div>
  <div class="hero__copy">
    <p class="eyebrow">Sheet metal fabricators, Glasgow</p>
    <h1>Fabricated <span>into place.</span></h1>
    <p class="lead">Marpet design, manufacture and install stainless steel, mild steel and aluminium fabrication, in the workshop or on site.</p>
    <div class="btn-row"><a class="btn btn--primary" href="contact.html#enquiry" data-transition="shutter" data-name="Request a quote">Request a quote</a><a class="btn btn--ghost" href="services.html">Our services</a></div>
  </div>
  <p class="hero__note">Illustrative 3D model based on Marpet belt conveyor photographs. Not a specific delivered machine.</p>
  <div class="hero__ctrl"><button type="button" data-hero-skip hidden>Skip intro</button><button type="button" data-hero-replay hidden>Replay assembly</button></div>
</section>
<div class="facts">
  <div><b>Design, manufacture, install</b>One firm from drawing to fitted on site.</div>
  <div><b>Stainless, mild steel, aluminium</b>Sheet metal and fabricated steelwork.</div>
  <div><b>Food and drink</b>Food processing, packaging and catering sectors.</div>
  <div><b>East of Glasgow</b>Scotland and the North of England by the M74.</div>
</div>
<section class="section on-white"><div class="wrap split">
  <div data-reveal>
    <p class="eyebrow">About Marpet</p>
    <h2>Stainless steel work for production floors</h2>
    <p class="lead">Marpet Fabrications has built a reputation for quality across sheet metal, engineering and fabrication, with a client base across Scotland and the North of England.</p>
    <p>The work is made by skilled, time served tradesmen, either in the fabrication workshop or on site at client premises.</p>
    <p><span class="confirm">To confirm</span> Founding date. The existing site says "early 80's", the logo says "1997 Limited".</p>
    <a class="text-link" href="about.html">About Marpet</a>
  </div>
  <div class="beamed" data-reveal>${img('IMG_0276.jpg', 'Stainless steel side table beside a blue belt conveyor with the MF mark on its side panel', 'loading="lazy"')}</div>
</div></section>
<section class="section on-steel"><div class="wrap">
  <p class="eyebrow">What we make</p>
  <div class="section-head"><h2>Services</h2><a class="text-link" href="services.html">All services</a></div>
  ${stack(services.slice(0, 5))}
</div></section>
<section class="section on-dark"><div class="wrap">
  <p class="eyebrow">Completed work</p>
  <div class="section-head"><h2>Featured work</h2><a class="text-link" href="work.html">All work</a></div>
  <ul class="grid">${featured.map(frameCard).join('')}</ul>
</div></section>
<section class="section on-white"><div class="wrap">
  <p class="eyebrow">Who we work for</p>
  <div class="section-head"><h2>Customers</h2></div>
  <p>As listed on the existing Marpet website. <span class="confirm">Confirm each name is still approved for publication</span></p>
  <ul class="customers">${co.customers.map((c) => `<li class="plate">${c}</li>`).join('')}</ul>
</div></section>
${jnr}
${linkedin}
${cta()}
</main>` });

/* ---------------- Services ---------------- */
page({ file: 'services.html', title: 'Services', desc: 'Conveyor systems, production lines, pipework, access platforms, catering, dentistry and general fabrication.', section: 'services', page: 'services', main: `
<main id="main">
<section class="page-head"><div class="wrap">
  <p class="crumbs"><a href="index.html">Home</a><span>/</span><span>Services</span></p>
  <h1>Services</h1>
  <p class="lead">Seven kinds of work, all taken from the existing Marpet website. Pick a plate.</p>
</div></section>
<section class="section on-steel"><div class="wrap">
  <h2 class="visually-hidden">All services</h2>
  ${stack(services)}
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
<section class="page-head"><div class="wrap split">
  <div>
    <p class="crumbs"><a href="index.html">Home</a><span>/</span><a href="services.html">Services</a><span>/</span><span>${s.name}</span></p>
    <h1>${s.name}</h1>
    <p class="lead">${s.lead}</p>
    ${s.confirm ? `<p><span class="confirm">To confirm</span> ${s.confirm}</p>` : ''}
    <div class="btn-row"><a class="btn btn--primary" href="contact.html#enquiry" data-transition="shutter" data-name="Request a quote">Ask about ${s.short.toLowerCase()}</a></div>
    ${motion(s.motion)}
  </div>
  <div class="page-head__media plate" data-frame-target>${bolts}<div class="frame__img">${img(s.hero, s.name + ', Marpet photograph')}${lowres(s.hero)}</div></div>
</div></section>
<section class="section on-white"><div class="wrap split" style="align-items:start">
  <div>
    <p class="eyebrow">The work</p>
    <h2>What Marpet does</h2>
    ${s.body.map((b) => `<p>${b}</p>`).join('')}
    ${s.list ? `<ul class="ticks">${s.list.map((t) => `<li>${t}</li>`).join('')}</ul>` : ''}
  </div>
  <div>${ph('technical capability', 'Materials and grades, maximum sizes, finishes, hygiene standards worked to, welding processes, and whether design drawings are produced in house. Nothing is stated here until Marpet supplies it.')}</div>
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
<section class="page-head"><div class="wrap">
  <p class="crumbs"><a href="index.html">Home</a><span>/</span><span>Our work</span></p>
  <h1>Our work</h1>
  <p class="lead">Marpet's own photographs, grouped into projects. Titles are working titles until Marpet confirms them.</p>
</div></section>
<section class="section on-steel"><div class="wrap">
  <h2 class="visually-hidden">Projects</h2>
  <div class="filter" data-filter role="group" aria-label="Filter projects by service"><button type="button" value="all" aria-pressed="true">All</button>${used.map((u) => `<button type="button" value="${u}" aria-pressed="false">${svc(u).short}</button>`).join('')}</div>
  <p class="filter-count" data-filter-count aria-live="polite">${projects.length} projects shown</p>
  <ul class="grid" data-filter-list>${projects.map(frameCard).join('')}</ul>
</div></section>
${cta()}
</main>` });

for (const p of projects) {
  const s = svc(p.service);
  const rel = projects.filter((x) => x.service === p.service && x.slug !== p.slug).slice(0, 3);
  page({ file: `project-${p.slug}.html`, title: p.title, desc: `${p.title}. ${s.name} by Marpet Fabrications.`, section: 'work', page: 'project', main: `
<main id="main">
<section class="page-head"><div class="wrap split">
  <div>
    <p class="crumbs"><a href="index.html">Home</a><span>/</span><a href="work.html">Our work</a><span>/</span><span>${p.title}</span></p>
    <h1>${p.title}</h1>
    <p><span class="confirm">Working title</span> Named from the photograph. ${p.note || ''}</p>
    <dl class="spec">
      <dt>Service</dt><dd><a href="service-${s.slug}.html">${s.name}</a></dd>
      <dt>Client</dt><dd>Not shown until approved</dd>
      <dt>Date</dt><dd>To be supplied</dd>
      <dt>Location</dt><dd>To be supplied</dd>
    </dl>
  </div>
  <div class="page-head__media plate" data-frame-target>${bolts}<div class="frame__img">${img(p.hero, p.title + ', Marpet photograph')}${lowres(p.hero)}</div></div>
</div></section>
<section class="section on-white"><div class="wrap split" style="align-items:start">
  <div><p class="eyebrow">Overview</p><h2>What was made</h2>${ph('overview', 'Two or three sentences from Marpet: what the customer needed and what was built.')}</div>
  <div><p class="eyebrow">Scope</p><h2>Scope and details</h2>${ph('scope of work and technical details', 'Design, manufacture, installation. Materials, sizes, finish. Measured outcomes only if verified and approved.')}</div>
</div></section>
${p.images.length ? `<section class="section on-steel"><div class="wrap"><p class="eyebrow">Photographs</p><div class="section-head"><h2>More images</h2></div><div class="gallery">${p.images.map((f) => `<figure class="plate">${bolts}<div class="frame__img">${img(f, p.title + ', Marpet photograph', 'loading="lazy"')}${lowres(f)}</div></figure>`).join('')}</div></div></section>` : ''}
${rel.length ? `<section class="section on-dark"><div class="wrap"><p class="eyebrow">Related</p><div class="section-head"><h2>More ${s.short.toLowerCase()} work</h2><a class="text-link" href="service-${s.slug}.html">${s.name}</a></div><ul class="grid">${rel.map(frameCard).join('')}</ul></div></section>` : ''}
${cta('Need something similar?')}
</main>` });
}

/* ---------------- About ---------------- */
page({ file: 'about.html', title: 'About Marpet', desc: 'Marpet Fabrications, sheet metal fabricators to the east of Glasgow.', section: 'about', page: 'about', main: `
<main id="main">
<section class="page-head"><div class="wrap">
  <p class="crumbs"><a href="index.html">Home</a><span>/</span><span>About</span></p>
  <h1>About Marpet</h1>
  <p class="lead">Sheet metal fabricators to the east of Glasgow, serving food processing, packaging and catering.</p>
</div></section>
<section class="section on-white"><div class="wrap split">
  <div data-reveal>
    <p class="eyebrow">The company</p>
    <h2>Where we are and who we work for</h2>
    <p>Marpet Fabrications is located to the east of Glasgow, placed to serve local customers and those further afield by the M74.</p>
    <p>Marpet is an established supplier to food processing, packaging and catering, working with companies locally and nationally.</p>
    <p><span class="confirm">To confirm</span> Founding date and company history. The existing site says "established in the early 80's"; the logo reads "1997 Limited".</p>
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
    ${ph('workshop photography and equipment', 'Photographs of the workshop and people at work, and a list of machinery. None exist on the current site, so none are claimed here.')}
  </div>
</div></section>
${jnr}
${cta()}
</main>` });

/* ---------------- Team ---------------- */
page({ file: 'team.html', title: 'Meet the team', desc: 'The people behind Marpet Fabrications.', section: 'team', page: 'team', main: `
<main id="main">
<section class="page-head"><div class="wrap">
  <p class="crumbs"><a href="index.html">Home</a><span>/</span><span>Team</span></p>
  <h1>Meet the team</h1>
  <p class="lead">Team content will be supplied by Marpet. Every plate below is an empty slot.</p>
</div></section>
<section class="section on-steel"><div class="wrap">
  <h2 class="visually-hidden">Team members</h2>
  <div class="team">${team.map((m, i) => `
    <details class="member"${i === 0 ? ' open' : ''}>
      <summary class="plate">${bolts}<b>${m.name || 'Name to be supplied'}</b><em>${m.role || 'Job title'}</em><span class="hint">Lift plate</span></summary>
      <div class="member__body"><div class="ph member__photo"><div><b>Placeholder: photograph</b><p>Approved portrait, 4:5.</p></div></div>${ph('biography', 'Two or three sentences and responsibilities, approved by the person before publication.')}</div>
    </details>`).join('')}</div>
</div></section>
${cta('Want to talk to the people who will make it?')}
</main>` });

/* ---------------- Contact ---------------- */
page({ file: 'contact.html', title: 'Contact', desc: 'Contact Marpet Fabrications to discuss your fabrication requirements.', section: 'contact', page: 'contact', main: `
<main id="main">
<section class="page-head"><div class="wrap">
  <p class="crumbs"><a href="index.html">Home</a><span>/</span><span>Contact</span></p>
  <h1>Contact Marpet</h1>
  <p class="lead">Call, email, or send the form. The form needs nothing but a name, a way to reach you and what you need.</p>
</div></section>
<section class="section on-steel"><div class="wrap split" style="align-items:start">
  <div class="contact-card plate">${bolts}
    <h2>Direct</h2>
    <p><a class="big" href="tel:${co.phoneHref}">${co.phone}</a><a href="mailto:${co.email}">${co.email}</a></p>
    <p>${co.address.join('<br>')}</p>
    <p>Fax ${co.fax} <span class="confirm">Still in use?</span></p>
    <p><span class="confirm">To confirm</span> The existing site spells the road both "Fullarton" and "Fullerton".</p>
    ${ph('opening hours and map', 'Hours and a map link once Marpet confirms them.')}
  </div>
  <form class="form" id="enquiry" data-proto-form novalidate>
    <h2 class="full">Request a quote</h2>
    <div><label for="f-name">Name</label><input id="f-name" name="name" autocomplete="name" required></div>
    <div><label for="f-company">Company <span class="visually-hidden">(optional)</span></label><input id="f-company" name="company" autocomplete="organization"></div>
    <div><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" required></div>
    <div><label for="f-tel">Phone <span class="visually-hidden">(optional)</span></label><input id="f-tel" name="tel" type="tel" autocomplete="tel"></div>
    <div class="full"><label for="f-service">What do you need?</label><select id="f-service" name="service"><option value="">Choose one</option>${services.map((s) => `<option>${s.name}</option>`).join('')}<option>Something else</option></select></div>
    <div class="full"><label for="f-msg">Tell us about the job</label><textarea id="f-msg" name="message" required aria-describedby="f-msg-hint"></textarea><p class="hint" id="f-msg-hint">Sizes, material, where it is going and when you need it.</p></div>
    <div class="full"><label for="f-file">Drawing or photograph <span class="visually-hidden">(optional)</span></label><input id="f-file" name="file" type="file"></div>
    <div class="full"><button class="btn btn--primary" type="submit">Send enquiry</button></div>
    <div class="ph form-status" data-form-status hidden tabindex="-1"><b>Prototype</b><p>Nothing was sent. In production this posts to a server function that emails ${co.email}, with spam protection, and confirms on the page.</p></div>
  </form>
</div></section>
</main>` });

/* ---------------- Concept B ---------------- */
const foldSet = [['header13.jpg', 'Production lines', 'production-lines'], ['pipeheader.jpg', 'Pipework', 'pipework'], ['header11.jpg', 'Access platforms', 'access-platforms'], ['header7.jpg', 'Conveyors', 'conveyor-systems']];
page({ file: 'concept-b.html', title: 'Concept B: Architectural fabrication', desc: 'Alternative homepage concept built from folding sheet metal panels.', section: 'home', page: 'concept-b', main: `
<main id="main">
<section class="page-head"><div class="wrap">
  <p class="crumbs"><a href="storyboard.html">Review</a><span>/</span><span>Concept B</span></p>
  <h1>Built from sheet.</h1>
  <p class="lead">Concept B homepage. Four sheet metal panels fold open on their hinges to show Marpet's work. No 3D model, no WebGL.</p>
  <div class="btn-row"><a class="btn btn--primary" href="contact.html#enquiry" data-transition="shutter" data-name="Request a quote">Request a quote</a><a class="btn btn--ghost" href="index.html">Compare with Concept A</a></div>
</div></section>
<div class="fold">${foldSet.map(([f, n, s], i) => `<div class="fold__p" style="--i:${i}">${img(f, n + ', Marpet photograph')}<div class="fold__back plate">${bolts}</div><a class="fold__tag" href="service-${s}.html" data-name="${n}">${n}</a></div>`).join('')}</div>
<section class="section on-steel"><div class="wrap"><p class="eyebrow">Same system below the fold</p><div class="section-head"><h2>Services</h2></div>${stack(services)}</div></section>
${cta()}
</main>` });

/* ---------------- Storyboard / review ---------------- */
const hb = [
  ['Arrival', '0.0 to 1.5 s', 'One brushed stainless side frame travels in along its length, close to camera. Folded lips and sheet thickness are visible. The header, navigation and quote button are already usable.'],
  ['Legs', '1.3 to 2.6 s', 'Three square-tube leg frames with adjustable feet roll in from the far side. Camera begins to pull back.'],
  ['Frame closes', '2.0 to 3.4 s', 'Far side frame slides in. Cross members and the slider bed lower into the frame, decelerating before contact.'],
  ['Running gear', '2.9 to 4.5 s', 'End rollers enter axially, flange bearings and drive seat, then the blue modular belt feeds across.'],
  ['Brand reveal', '4.5 to 6.0 s', 'The frame lowers onto its feet. The existing Marpet logo plate swings up, meets the side frame and four bolts turn in.'],
  ['Website reveal', '6.0 to 7.5 s', 'Camera pulls back to the hero composition. Headline, intro and buttons rise in. The belt keeps running.'],
];
const tb = [
  ['Select', 'The selected navigation item or plate is the source of the panel.'],
  ['Lift and rotate', 'The plate lifts 14 px, tips toward the viewer and grows to fill the screen. 620 ms.'],
  ['Swap', 'Behind the plate the new page is fetched and swapped in. The URL changes with history.pushState.'],
  ['Hinge open', 'The plate swings open on its left hinge and the new page is there. 560 ms. Back reverses it.'],
];
const rows = [
  ['Realism', 'High. A real-time PBR steel model with reflections, shadows and weight.', 'Medium. CSS steel reads as metal but is flat.'],
  ['Visual impact', 'High. One memorable moment that is about Marpet’s main product.', 'Medium to high. Strong first fold, less distinctive.'],
  ['Relevance to Marpet', 'High. Conveyors lead the existing site and photographs.', 'Medium. Sheet metal is accurate but generic.'],
  ['User experience', 'Good. Intro is 7.5 s, skippable, shown once.', 'Good. Nothing to wait for.'],
  ['Mobile', 'Good with care. Model sits above the copy, capped pixel ratio.', 'Very good. CSS only.'],
  ['Performance', 'About 2.1 MB of unminified 3D library in this prototype (roughly 180 KB gzipped once tree-shaken and minified), loaded after first paint.', 'Very light. No extra libraries.'],
  ['Build complexity', 'Higher. Model, lighting and fallbacks to maintain.', 'Low.'],
  ['Maintenance', 'Model changes need a developer. Content does not.', 'Anyone who can edit CSS.'],
];
page({ file: 'storyboard.html', title: 'Storyboard, concepts and review', desc: 'Motion storyboard and concept comparison for the Marpet prototype.', section: 'review', page: 'review', main: `
<main id="main">
<section class="page-head"><div class="wrap">
  <h1>Storyboard and concepts</h1>
  <p class="lead">Frames below are captured from the working prototype, not drawn.</p>
  <div class="btn-row"><a class="btn btn--primary" href="index.html?intro=1" data-no-nav>Play the intro</a><a class="btn btn--ghost" href="concept-b.html">Open Concept B</a><a class="btn btn--ghost" href="material-test.html">Realism test</a></div>
</div></section>
<section class="section on-dark"><div class="wrap">
  <p class="eyebrow">Phase 3</p><div class="section-head"><h2>Conveyor hero storyboard</h2></div>
  <ol class="board">${hb.map(([t, time, d], i) => `<li><img src="assets/board/hero-${i + 1}.jpg" alt="Storyboard frame ${i + 1}: ${t}" width="1280" height="800" loading="lazy"><div><b>${t}</b>${d}<small>${time}</small></div></li>`).join('')}</ol>
</div></section>
<section class="section on-deep"><div class="wrap">
  <p class="eyebrow">Phase 3</p><div class="section-head"><h2>Plate page transition</h2></div>
  <ol class="board">${tb.map(([t, d], i) => `<li><img src="assets/board/trans-${i + 1}.jpg" alt="Transition frame ${i + 1}: ${t}" width="1280" height="800" loading="lazy"><div><b>${t}</b>${d}</div></li>`).join('')}</ol>
  <p style="margin-top:1.5rem">Two variants share the same steel, bolts and easing: a roller shutter for Contact and quote links, and a photograph frame that expands into project pages.</p>
</div></section>
<section class="section on-white"><div class="wrap">
  <p class="eyebrow">Phase 2</p><div class="section-head"><h2>Concept A against Concept B</h2></div>
  <div class="table-wrap"><table><thead><tr><th scope="col">Criterion</th><th scope="col">A: Conveyor assembly</th><th scope="col">B: Architectural fabrication</th></tr></thead><tbody>${rows.map((r) => `<tr><th scope="row">${r[0]}</th><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div>
  <p style="margin-top:1.5rem"><b>Recommendation:</b> Concept A for the homepage hero, with Concept B's CSS panel system used for every page transition and component. That is what this prototype does.</p>
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
  <p class="crumbs"><a href="storyboard.html">Review</a><span>/</span><span>Realism test</span></p>
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

console.log('built', 6 + services.length + projects.length + 2, 'pages');
