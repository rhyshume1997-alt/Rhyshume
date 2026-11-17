// Marpet prototype: progressive enhancement only. Every page is a real HTML file,
// so links, direct URLs and back/forward work with this script switched off.
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const EASE_HEAVY = 'cubic-bezier(.6,.02,.2,1)';   // slow start, firm settle
  const EASE_SETTLE = 'cubic-bezier(.16,.84,.3,1)'; // decelerate to rest, no bounce
  let busy = false, hero = null, cleanup = [];

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
        ], { duration: 620, easing: 'ease-out' });
        await swap();
        face.style.transformOrigin = '0 50%';
        await anim(face, [
          { transform: 'rotateY(0deg)', filter: 'brightness(1)' },
          { transform: 'rotateY(-97deg)', filter: 'brightness(.55)' },
        ], { duration: 560, easing: EASE_HEAVY });
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
    if (hero) { hero.destroy(); hero = null; }
    cleanup.forEach((f) => f()); cleanup = [];
  }
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); cleanup.push(() => el.removeEventListener(ev, fn, o)); };

  function initHero() {
    const root = $('[data-hero]');
    if (!root) return;
    const section = root.closest('.hero');
    const skip = $('[data-hero-skip]', section), replay = $('[data-hero-replay]', section);
    const q = new URLSearchParams(location.search);
    const ready = () => section.classList.add('is-ready');
    let webgl = false;
    try { webgl = !!document.createElement('canvas').getContext('webgl2'); } catch (e) {}
    if (!webgl || !window.gsap || q.has('static')) { section.classList.add('is-static'); ready(); return; }
    import('./hero.js').then(({ initHero }) => {
      if (!root.isConnected) return;
      const still = reduce.matches;
      hero = initHero(root, {
        still,
        onReveal: ready,
        onDone: () => { section.classList.add('is-done'); skip.hidden = true; replay.hidden = still; try { localStorage.setItem('mp-intro', '1'); } catch (e) {} },
      });
      if (!hero) { section.classList.add('is-static'); ready(); return; }
      section.classList.add('is-live');
      let seen = false;
      try { seen = localStorage.getItem('mp-intro') === '1'; } catch (e) {}
      if (q.has('frame')) { hero.seek(parseFloat(q.get('frame'))); if (q.has('ui')) ready(); return; }
      if (still || (seen && !q.has('intro'))) { hero.finish(); return; }
      skip.hidden = false;
      hero.play();
      const end = () => { if (hero && hero.running) hero.finish(); };
      on(skip, 'click', end);
      on(window, 'keydown', (e) => { if (e.key === 'Escape') end(); });
      on(window, 'wheel', end, { passive: true });
      on(window, 'touchmove', end, { passive: true });
      on(replay, 'click', () => { section.classList.remove('is-ready', 'is-done'); replay.hidden = true; skip.hidden = false; hero.play(); });
    }).catch(() => { section.classList.add('is-static'); ready(); });
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

  function initForm() {
    const form = $('[data-proto-form]');
    if (!form) return;
    on(form, 'submit', (e) => {
      e.preventDefault();
      const out = $('[data-form-status]', form);
      out.hidden = false;
      out.focus();
    });
  }

  // Exploration: the hero as a prerendered film. Same rules as the live hero: skippable, once per browser,
  // still frame for reduced motion, and the header and quote button never wait for it.
  function initFilm() {
    const v = $('[data-film]');
    if (!v) return;
    const section = v.closest('.hero'), skip = $('[data-hero-skip]', section), replay = $('[data-hero-replay]', section), out = $('[data-film-stats]');
    const q = new URLSearchParams(location.search);
    const done = () => { section.classList.add('is-ready', 'is-done'); skip.hidden = true; replay.hidden = reduce.matches; try { localStorage.setItem('mp-film', '1'); } catch (e) {} };
    const end = () => { v.pause(); if (v.duration) v.currentTime = v.duration; done(); };
    let seen = false; try { seen = localStorage.getItem('mp-film') === '1'; } catch (e) {}
    const report = () => {
      if (!out || !v.getVideoPlaybackQuality) return;
      const s = v.getVideoPlaybackQuality();
      out.textContent = `Played ${s.totalVideoFrames} frames, dropped ${s.droppedVideoFrames}. Video ${v.videoWidth}x${v.videoHeight}.`;
    };
    on(v, 'timeupdate', () => { if (v.duration && v.currentTime > v.duration * 0.82) section.classList.add('is-ready'); });
    on(v, 'ended', () => { done(); report(); });
    on(skip, 'click', end);
    on(replay, 'click', () => { section.classList.remove('is-ready', 'is-done'); replay.hidden = true; skip.hidden = false; v.currentTime = 0; v.play(); });
    on(window, 'keydown', (e) => { if (e.key === 'Escape' && !v.paused) end(); });
    if (reduce.matches || (seen && !q.has('intro'))) { v.removeAttribute('autoplay'); on(v, 'loadedmetadata', end); if (v.readyState > 0) end(); return; }
    skip.hidden = false;
    v.play().catch(done);   // autoplay refused: show the poster and the page
  }

  function initTest() {
    const viewers = $$('[data-viewer]');
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
    initHero(); initFilter(); initReveal(); initForm(); initTest(); initFilm();
  }
  init();
})();
