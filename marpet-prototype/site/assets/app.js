// Marpet prototype: progressive enhancement only. Every page is a real HTML file,
// so links, direct URLs and back/forward work with this script switched off.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const EASE_HEAVY = 'cubic-bezier(.6,.02,.2,1)';   // slow start, firm settle
  const EASE_SETTLE = 'cubic-bezier(.16,.84,.3,1)'; // decelerate to rest, no bounce
  let busy = false, cleanup = [];

  /* ---------- transition panel ---------- */
  const panel = document.createElement('div');
  panel.className = 'mp-panel';
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = '<div class="mp-panel__face plate"><i class="bolt tl"></i><i class="bolt tr"></i><i class="bolt bl"></i><i class="bolt br"></i><span class="mp-panel__label"></span><span class="mp-panel__hinge"></span></div>';
  const shutter = document.createElement('div');
  shutter.className = 'mp-shutter';
  shutter.setAttribute('aria-hidden', 'true');
  shutter.innerHTML = '<div class="mp-shutter__slats"></div><div class="mp-shutter__bar"></div>';
  const live = document.createElement('div');
  live.className = 'visually-hidden';
  live.setAttribute('aria-live', 'polite');
  document.body.append(panel, shutter, live);
  const face = panel.firstElementChild;
  const label = $('.mp-panel__label', panel);

  const anim = (el, frames, o) => el.animate(frames, { fill: 'forwards', ...o }).finished;

  // matrix that maps the full-viewport panel onto a source rectangle
  function rectTransform(r, extra = '') {
    const sx = r.width / innerWidth, sy = r.height / innerHeight;
    return `translate(${r.left}px, ${r.top}px) scale(${sx}, ${sy}) ${extra}`;
  }

  const transitions = {
    // Plate: lifts from the selected item, swings up to face the viewer, then opens on its hinge.
    async plate(src, name, swap, back) {
      label.textContent = name;
      panel.style.display = 'block';
      const r = src ? src.getBoundingClientRect() : { left: innerWidth * 0.3, top: innerHeight - 8, width: innerWidth * 0.4, height: 8 };
      face.style.transformOrigin = '0 0';
      if (!back) {
        await anim(face, [
          { transform: rectTransform(r, 'rotateX(0deg)'), boxShadow: '0 2px 6px rgba(0,0,0,.4)', opacity: src ? 1 : 0 },
          { transform: rectTransform({ left: r.left, top: r.top - 14, width: r.width, height: r.height }, 'rotateX(-14deg)'), boxShadow: '0 30px 40px rgba(0,0,0,.5)', opacity: 1, offset: 0.22, easing: EASE_HEAVY },
          { transform: 'translate(0,0) scale(1,1) rotateX(0deg)', boxShadow: '0 0 0 rgba(0,0,0,0)', opacity: 1 },
        ], { duration: 520, easing: 'ease-out' });
        await swap();
        face.style.transformOrigin = '0 50%';
        await anim(face, [
          { transform: 'rotateY(0deg)', filter: 'brightness(1)' },
          { transform: 'rotateY(-97deg)', filter: 'brightness(.55)' },
        ], { duration: 470, easing: EASE_HEAVY });
      } else {
        // going back: the hinged plate closes, then lowers away
        face.style.transformOrigin = '0 50%';
        await anim(face, [
          { transform: 'rotateY(-97deg)', filter: 'brightness(.55)' },
          { transform: 'rotateY(0deg)', filter: 'brightness(1)' },
        ], { duration: 480, easing: EASE_SETTLE });
        await swap();
        face.style.transformOrigin = '50% 100%';
        await anim(face, [
          { transform: 'translateY(0) rotateX(0deg)' },
          { transform: 'translateY(6%) rotateX(-18deg)', offset: 0.3, easing: EASE_HEAVY },
          { transform: 'translateY(104%) rotateX(-62deg)' },
        ], { duration: 560, easing: 'ease-in' });
      }
      panel.style.display = 'none';
      face.getAnimations().forEach((a) => a.cancel());
    },
    // Shutter: a workshop roller shutter comes down, then lifts on the new page.
    async shutter(src, name, swap) {
      shutter.style.display = 'block';
      await anim(shutter, [{ transform: 'translateY(-101%)' }, { transform: 'translateY(0)' }], { duration: 520, easing: EASE_SETTLE });
      await swap();
      await anim(shutter, [{ transform: 'translateY(0)' }, { transform: 'translateY(-101%)' }], { duration: 620, easing: EASE_HEAVY, delay: 80 });
      shutter.style.display = 'none';
      shutter.getAnimations().forEach((a) => a.cancel());
    },
    // Frame: a framed photograph lifts off the wall and expands into the project page.
    async frame(src, name, swap) {
      const img = src && $('img', src);
      if (!img) return transitions.plate(src, name, swap);
      const r = img.getBoundingClientRect();
      const fly = document.createElement('div');
      fly.className = 'mp-fly';
      fly.style.backgroundImage = `url("${img.currentSrc || img.src}")`;
      document.body.append(fly);
      const from = { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' };
      await anim(fly, [
        { ...from, transform: 'perspective(1400px) rotateY(0deg)', boxShadow: '0 4px 10px rgba(0,0,0,.4)' },
        { left: (r.left - 6) + 'px', top: (r.top - 16) + 'px', width: r.width + 12 + 'px', height: r.height + 8 + 'px', transform: 'perspective(1400px) rotateY(-9deg)', boxShadow: '0 40px 60px rgba(0,0,0,.55)', offset: 0.25, easing: EASE_HEAVY },
        { left: '0px', top: '0px', width: innerWidth + 'px', height: innerHeight + 'px', transform: 'perspective(1400px) rotateY(0deg)', boxShadow: '0 0 0 rgba(0,0,0,0)' },
      ], { duration: 640, easing: 'ease-out' });
      await swap();
      const dest = $('[data-frame-target] img');
      if (dest) {
        const d = dest.getBoundingClientRect();
        await anim(fly, [
          { left: '0px', top: '0px', width: innerWidth + 'px', height: innerHeight + 'px', opacity: 1 },
          { left: d.left + 'px', top: d.top + 'px', width: d.width + 'px', height: d.height + 'px', opacity: 1, offset: 0.85 },
          { left: d.left + 'px', top: d.top + 'px', width: d.width + 'px', height: d.height + 'px', opacity: 0 },
        ], { duration: 620, easing: EASE_HEAVY });
      } else {
        await anim(fly, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 });
      }
      fly.remove();
    },
  };

  /* ---------- navigation ---------- */
  function sameSitePage(a) {
    if (!a || a.target || a.hasAttribute('download') || a.hasAttribute('data-no-nav') || a.origin !== location.origin) return false;
    if (!/\.html$|\/$/.test(a.pathname)) return false;
    if (a.pathname === location.pathname && a.hash) return false;
    return a.hasAttribute('data-nav') || !!a.closest('[data-nav-scope]');
  }

  async function load(url) {
    const res = await fetch(url, { headers: { 'X-Requested-With': 'mp-nav' } });
    if (!res.ok) throw new Error(res.status);
    return new DOMParser().parseFromString(await res.text(), 'text/html');
  }

  function applyPage(doc, url, push) {
    teardown();
    document.title = doc.title;
    $('main').replaceWith(doc.querySelector('main'));
    document.body.dataset.page = doc.body.dataset.page;
    const cur = doc.body.dataset.section;
    $$('.nav a').forEach((a) => {
      if (a.dataset.section === cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    if (push) history.pushState({ mp: 1 }, '', url);
    const hash = new URL(url, location.href).hash;
    const target = hash && document.getElementById(hash.slice(1));
    if (target) target.scrollIntoView(); else scrollTo(0, 0);
    closeMenu();
    const main = $('main');
    main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
    live.textContent = document.title;
    init();
  }

  async function navigate(url, { src = null, type = 'plate', name = '', push = true, back = false } = {}) {
    if (busy) return;
    busy = true;
    document.documentElement.classList.add('is-navigating');
    const pending = load(url);
    pending.catch(() => {});
    try {
      const swap = async () => applyPage(await pending, url, push);
      if (reduce.matches) await swap();
      else await (transitions[type] || transitions.plate)(src, name, swap, back);
    } catch (e) {
      location.href = url; // anything goes wrong: ordinary navigation
      return;
    } finally {
      busy = false;
      document.documentElement.classList.remove('is-navigating');
      panel.style.display = 'none'; shutter.style.display = 'none';
    }
  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!sameSitePage(a)) return;
    e.preventDefault();
    if (a.href === location.href) { scrollTo({ top: 0, behavior: reduce.matches ? 'auto' : 'smooth' }); return; }
    const src = a.querySelector('[data-plate]') || a.closest('[data-plate]') || a;
    navigate(a.href, { src, type: a.dataset.transition || 'plate', name: a.dataset.name || a.textContent.trim().slice(0, 40) });
  });
  history.replaceState({ mp: 1 }, '');
  let lastPath = location.pathname;
  addEventListener('popstate', () => {
    if (location.pathname === lastPath) return; // hash change only
    navigate(location.href, { push: false, back: true, name: '' }).then(() => { lastPath = location.pathname; });
  });
  const _push = history.pushState.bind(history);
  history.pushState = (...a) => { _push(...a); lastPath = location.pathname; };

  /* ---------- menu ---------- */
  const menuBtn = $('.menu-btn');
  function closeMenu() { document.body.classList.remove('menu-open'); menuBtn && menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn && menuBtn.addEventListener('click', () => {
    const open = document.body.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- per-page behaviour ---------- */
  function teardown() {
    cleanup.forEach((f) => f()); cleanup = [];
  }
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); cleanup.push(() => el.removeEventListener(ev, fn, o)); };

  // Homepage hero: the Blender conveyor model, live. The header and quote button never wait for it.
  function initHero() {
    const root = $('[data-hero]');
    if (!root) return;
    const section = root.closest('.hero');
    const skip = $('[data-hero-skip]', section), replay = $('[data-hero-replay]', section);
    const q = new URLSearchParams(location.search);
    const ready = () => section.classList.add('is-ready');
    const fallback = () => { section.classList.add('is-static'); ready(); };
    let webgl = false;
    try { webgl = !!document.createElement('canvas').getContext('webgl2'); } catch (e) {}
    if (!webgl || q.has('static')) { fallback(); return; }
    const giveUp = setTimeout(ready, 6000);   // slow connection: show the copy over the still image; the model joins when it arrives
    cleanup.push(() => clearTimeout(giveUp));
    on(root, 'viewer:reveal', ready);
    on(root, 'viewer:done', () => {
      section.classList.add('is-done'); skip.hidden = true; replay.hidden = reduce.matches;
      if (!reduce.matches) root.viewer.run(true);
      try { localStorage.setItem('mp-intro', '1'); } catch (e) {}
    });
    on(root, 'viewer:ready', () => {
      clearTimeout(giveUp); section.classList.add('is-live'); initScene(section, root);
      let seen = false;
      try { seen = localStorage.getItem('mp-intro') === '1'; } catch (e) {}
      if (reduce.matches || (seen && !q.has('intro')) || q.has('assembled')) { root.viewer.finish(); return; }
      skip.hidden = false; root.viewer.play();
      const end = () => { if (root.viewer.playing) root.viewer.finish(); };
      on(skip, 'click', end);
      on(window, 'keydown', (e) => { if (e.key === 'Escape') end(); });
      on(window, 'wheel', end, { passive: true });
      on(window, 'touchmove', end, { passive: true });
    });
    on(replay, 'click', () => { section.classList.remove('is-ready', 'is-done'); replay.hidden = true; skip.hidden = false; root.viewer.run(false); root.viewer.play(); });
    import('./viewer.min.js').then((m) => root.isConnected && m.initViewer(root)).catch(fallback);
  }

  // ---- Homepage scene: one pinned 3D stage. Scroll moves the camera and swaps the chapters of copy. ----
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  function initScene(section, root) {
    if (reduce.matches) return;
    section.classList.add('is-scrolly');
    const chapters = $$('[data-ch]', section).map((el) => ({ el, from: +el.dataset.from, to: +el.dataset.to }));
    const rail = $$('.scene__rail i', section), stage = $('.hero__stage', section);
    let ticking = false, lastOn = -1;
    const update = () => {
      ticking = false;
      const r = section.getBoundingClientRect(), span = r.height - innerHeight;
      const p = span > 0 ? clamp01(-r.top / span) : 0;
      if (root.viewer) root.viewer.setScroll(Math.min(1, p / 0.9));   // camera reaches its last position at 90% and holds
      let on = -1;
      chapters.forEach((c, i) => { const live = p >= c.from && p < c.to; c.el.classList.toggle('is-on', live); c.el.inert = !live; if (live) on = i; });
      if (on !== lastOn) { lastOn = on; rail.forEach((d, i) => d.classList.toggle('is-on', i === on)); }
      stage.style.opacity = String(1 - clamp01((p - 0.93) / 0.07) * 0.85);
      section.classList.toggle('is-scrolled', p > 0.02);
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    on(window, 'scroll', onScroll, { passive: true }); on(window, 'resize', onScroll);
    update();
  }

  // ---- Services: the selected plate brings its photographs into the viewing frame with a directional wipe ----
  function initSvc() {
    const box = $('[data-svc]');
    if (!box) return;
    const items = $$('[data-svc-item]', box), slides = $$('[data-svc-slide]', box);
    let current = 0, running = false, queued = null;
    items[0].classList.add('is-current');
    const FACTOR = { svc__bg: 0.12, svc__fg: 0.5, svc__cap: 0.3 };   // how far each layer travels, as a share of the frame height
    const show = async (i) => {
      if (i === current) return;
      if (running) { queued = i; return; }
      running = true;
      const dir = i > current ? 1 : -1, A = slides[current], Bn = slides[i], H = A.offsetHeight;
      items.forEach((el, k) => el.classList.toggle('is-current', k === i));
      Bn.classList.add('is-on'); A.style.zIndex = '2'; Bn.style.zIndex = '1';
      if (reduce.matches) { A.classList.remove('is-on'); A.style.zIndex = Bn.style.zIndex = ''; current = i; running = false; return; }
      const wipe = dir > 0 ? ['inset(0 0 0 0)', 'inset(0 0 100% 0)'] : ['inset(0 0 0 0)', 'inset(100% 0 0 0)'];
      const jobs = [A.animate({ clipPath: wipe }, { duration: 720, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }).finished];
      for (const layer of A.children) layer.animate({ transform: ['none', `translateY(${-dir * 0.14 * H}px)`] }, { duration: 720, easing: 'cubic-bezier(.65,0,.35,1)' });
      for (const layer of Bn.children) {
        const f = FACTOR[layer.className] || 0.2;
        jobs.push(layer.animate({ transform: [`translateY(${dir * f * H}px)`, 'none'] }, { duration: 760, delay: 140, easing: 'cubic-bezier(.22,.8,.3,1)', fill: 'backwards' }).finished);
      }
      await Promise.all(jobs).catch(() => {});
      A.classList.remove('is-on'); A.getAnimations().forEach((a) => a.cancel()); A.style.zIndex = Bn.style.zIndex = '';
      current = i; running = false;
      if (queued !== null && queued !== current) { const q = queued; queued = null; show(q); } else queued = null;
    };
    items.forEach((el, i) => { on(el, 'pointerenter', () => show(i)); on(el, 'focus', () => show(i)); });
  }

  // ---- Our Work: photographs drift at different rates as the page scrolls and lean toward the pointer ----
  function initWork() {
    const list = $('[data-work]');
    if (!list || reduce.matches) return;
    const cards = $$('.wk', list).map((el, i) => ({ el, img: $('img', el), speed: [0.05, -0.03, 0.02, -0.05][i % 4] }));
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = innerHeight;
      for (const c of cards) {
        if (c.el.hidden) continue;
        const r = c.el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        const d = (r.top + r.height / 2 - vh / 2) / vh;                // -0.5 .. 0.5 across the screen
        c.el.style.setProperty('--drift', (d * c.speed * vh).toFixed(1) + 'px');
        c.el.style.setProperty('--pan', (d * -9).toFixed(2) + '%');   // the photograph slides inside its frame
        if (r.top < vh * 0.9) c.el.classList.add('is-in');
      }
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    on(window, 'scroll', onScroll, { passive: true }); on(window, 'resize', onScroll);
    update();
    if (fine) cards.forEach((c) => {
      on(c.el, 'pointermove', (e) => {
        const r = c.el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        c.el.style.setProperty('--rx', (-y * 4).toFixed(2) + 'deg'); c.el.style.setProperty('--ry', (x * 5).toFixed(2) + 'deg');
        c.el.style.setProperty('--px', (-x * 2.4).toFixed(2) + '%'); c.el.style.setProperty('--py', (-y * 2.4).toFixed(2) + '%');
      });
      on(c.el, 'pointerleave', () => { for (const v of ['--rx', '--ry', '--px', '--py']) c.el.style.removeProperty(v); });
    });
  }

  function initFilter() {
    const bar = $('[data-filter]');
    if (!bar) return;
    const cards = $$('[data-service]', $('[data-filter-list]'));
    const count = $('[data-filter-count]');
    const apply = (val) => {
      let n = 0;
      cards.forEach((c) => { const show = val === 'all' || c.dataset.service === val; c.hidden = !show; if (show) n++; });
      $$('button', bar).forEach((b) => b.setAttribute('aria-pressed', String(b.value === val)));
      $('[data-filter-list]').classList.toggle('is-filtered', val !== 'all');
      dispatchEvent(new Event('scroll'));
      if (count) count.textContent = `${n} ${n === 1 ? 'project' : 'projects'} shown`;
    };
    on(bar, 'click', (e) => { const b = e.target.closest('button'); if (b) apply(b.value); });
    const pre = new URLSearchParams(location.search).get('service');
    apply(pre && $$('button', bar).some((b) => b.value === pre) ? pre : 'all');
  }

  function initReveal() {
    const els = $$('[data-reveal]');
    if (!els.length) return;
    if (reduce.matches || !('IntersectionObserver' in window)) { els.forEach((el) => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });
    els.forEach((el) => io.observe(el));
    cleanup.push(() => io.disconnect());
  }

  // Enquiry form. Works without this script as an ordinary form post when an endpoint is set.
  // With it: inline validation, an error summary that takes focus, and an honest status message.
  function initForm() {
    const form = $('[data-enquiry]');
    if (!form) return;
    const status = $('[data-form-status]', form), summary = $('[data-error-summary]', form), list = $('ul', summary);
    const rules = {
      name: (v) => (v.trim().length < 2 ? 'Enter your name.' : ''),
      email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Enter an email address, like name@example.co.uk.'),
      tel: (v) => (v.trim() && !/^[0-9 +()\-]{6,40}$/.test(v.trim()) ? 'Enter a phone number using digits only, or leave it empty.' : ''),
      message: (v) => (v.trim().length < 10 ? 'Tell us a little about the job (at least 10 characters).' : ''),
    };
    form.elements.ts.value = String(Date.now());
    const say = (kind, html) => { status.className = 'full form-status form-status--' + kind; status.innerHTML = html; status.hidden = false; status.focus(); };
    const check = (name) => {
      const el = form.elements[name], err = $('#' + el.id + '-err', form), msg = rules[name](el.value);
      err.textContent = msg; err.hidden = !msg;
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      return msg;
    };
    // errors clear while typing, never on blur: hiding a message as the pointer goes down would move the Send button from under it
    Object.keys(rules).forEach((n) => on(form.elements[n], 'input', () => { if (form.elements[n].hasAttribute('aria-invalid')) check(n); }));

    const q = new URLSearchParams(location.search);
    if (q.has('sent')) say('ok', '<b>Enquiry sent.</b> Marpet will come back to you.');
    else if (q.has('error')) say('bad', `<b>Your enquiry was not sent.</b> Please call ${$('.contact-card .big') ? $('.contact-card .big').textContent : 'us'} or email ${form.dataset.email}.`);

    on(form, 'submit', async (e) => {
      const errors = Object.keys(rules).map((n) => [n, check(n)]).filter((x) => x[1]);
      if (errors.length) {
        e.preventDefault();
        list.innerHTML = errors.map(([n, m]) => `<li><a href="#${form.elements[n].id}">${m}</a></li>`).join('');
        summary.hidden = false; summary.focus(); status.hidden = true;
        return;
      }
      summary.hidden = true;
      const f = form.elements;
      if (!form.getAttribute('action')) {
        // No sending service yet: hand the enquiry to the visitor's own email program rather than pretend.
        e.preventDefault();
        const line = (label, v) => (v.trim() ? [`${label}: ${v.trim()}`] : []);
        const body = [...line('Name', f.name.value), ...line('Company', f.company.value), ...line('Email', f.email.value), ...line('Phone', f.tel.value), ...line('Work', f.service.value), '', f.message.value.trim()].join('\n');
        const href = `mailto:${form.dataset.email}?subject=${encodeURIComponent('Website enquiry from ' + f.name.value)}&body=${encodeURIComponent(body)}`;
        say('info', `<b>Nothing has been sent yet.</b> This build has no sending service. <a href="${href}">Open your email program with this enquiry</a>, or call us.`);
        return;
      }
      e.preventDefault();
      const btn = $('button[type=submit]', form); btn.disabled = true;
      try {
        const res = await fetch(form.action, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(new FormData(form)) });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) { form.reset(); f.ts.value = String(Date.now()); say('ok', '<b>Enquiry sent.</b> Marpet will come back to you.'); }
        else if (res.status === 400 && data.errors) {
          list.innerHTML = Object.entries(data.errors).map(([n, m]) => `<li><a href="#${f[n] ? f[n].id : 'enquiry'}">${String(m).replace(/[<>&]/g, '')}</a></li>`).join('');
          summary.hidden = false; summary.focus();
        } else say('bad', `<b>Your enquiry was not sent.</b> Please call us or email ${form.dataset.email}.`);
      } catch (err) {
        say('bad', `<b>Your enquiry was not sent.</b> Check your connection and try again, or email ${form.dataset.email}.`);
      }
      btn.disabled = false;
    });
  }

  function initTest() {
    const viewers = $$('[data-viewer]:not([data-hero])');
    if (viewers.length) {
      // the 3D bundle and model load only when a viewer is close to the screen
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          io.unobserve(e.target);
          import('./viewer.min.js').then((m) => e.target.isConnected && m.initViewer(e.target)).catch((err) => { e.target.dataset.error = String(err); });
        });
      }, { rootMargin: '300px' });
      viewers.forEach((v) => io.observe(v));
      cleanup.push(() => io.disconnect());
    }
    const bench = $('[data-bench]');
    if (bench) {
      const out = $('[data-bench-out]'), status = $('[data-bench-status]'), v = $('[data-interactive]');
      on(bench, 'click', async () => {
        if (!v.viewer || !v.classList.contains('is-loaded')) { status.textContent = 'Still loading the model. Try again in a moment.'; return; }
        bench.disabled = true;
        const r = await v.viewer.benchmark((s) => { status.textContent = 'Running: ' + s; });
        out.value = JSON.stringify(r, null, 1);
        status.textContent = `Done. ${r.rotate.fps} frames a second rotating, ${r.assembly.fps} assembling.`;
        bench.disabled = false;
      });
      on($('[data-bench-copy]'), 'click', async () => {
        out.select();
        try { await navigator.clipboard.writeText(out.value); status.textContent = 'Copied.'; } catch (e) { status.textContent = 'Select the text and copy it by hand.'; }
      });
    }
    $$('a.rplate').forEach((el) => on(el, 'pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    }));
  }

  function init() {
    document.documentElement.classList.add('js');
    initHero(); initSvc(); initWork(); initFilter(); initReveal(); initForm(); initTest();
  }
  init();
})();
