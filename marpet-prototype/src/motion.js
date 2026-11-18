// Scroll-driven motion for the whole site, built on GSAP and ScrollTrigger.
// Everything here is decoration over content that is already in the page:
// with reduced motion, or without this script, the pages read normally.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let ctx = null;

// Headings come in word by word from behind a mask.
function splitWords(el) {
  if (el.dataset.split) return [...el.querySelectorAll('.w > span')];
  el.dataset.split = '1';
  const words = el.textContent.trim().split(/\s+/);
  el.setAttribute('aria-label', el.textContent.trim());
  el.innerHTML = words.map((w) => `<span class="w" aria-hidden="true"><span>${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span></span>`).join(' ');
  return [...el.querySelectorAll('.w > span')];
}

function headings(root) {
  root.querySelectorAll('.section h2:not(.visually-hidden), .page-head h1, .cta h2').forEach((h) => {
    if (h.closest('[data-scene], [data-film-band]') || h.querySelector('a, span.confirm')) return;
    const parts = splitWords(h);
    gsap.from(parts, { yPercent: 108, duration: 0.95, ease: 'power3.out', stagger: 0.045, scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
  });
  root.querySelectorAll('.section .eyebrow, .page-head .lead').forEach((el) => {
    if (el.closest('[data-scene]')) return;
    gsap.from(el, { y: 18, autoAlpha: 0, duration: 0.8, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
}

// Steel sheets cover a section and move away as it scrolls into view.
function sheets(root) {
  root.querySelectorAll('[data-sheets]').forEach((sec) => {
    const kind = sec.dataset.sheets;   // split | lift | fold
    const wrap = document.createElement('div'); wrap.className = 'sheets sheets--' + kind; wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = kind === 'split' ? '<i class="sheet sheet--l"></i><i class="sheet sheet--r"></i>' : '<i class="sheet"></i>';
    sec.classList.add('has-sheets'); sec.append(wrap);
    const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top 82%', end: 'top 18%', scrub: 0.6 } });
    const s = wrap.querySelectorAll('.sheet');
    if (kind === 'split') {
      tl.to(s[0], { xPercent: -102, rotateY: 14, ease: 'power2.inOut' }, 0).to(s[1], { xPercent: 102, rotateY: -14, ease: 'power2.inOut' }, 0.06);
    } else if (kind === 'fold') {
      tl.to(s[0], { rotateX: -96, yPercent: -6, ease: 'power2.in' }, 0);
    } else {
      tl.to(s[0], { yPercent: -104, rotateX: 9, ease: 'power2.inOut' }, 0);
    }
    tl.fromTo(sec.querySelector('.wrap'), { y: 60, scale: 0.97 }, { y: 0, scale: 1, ease: 'power2.out' }, 0.15);
  });
}

// Photographs move a little slower than the page and settle from a slight zoom.
function photos(root) {
  root.querySelectorAll('.beamed img, .page-head__media img, .gallery .frame__img img').forEach((img) => {
    const big = !img.closest('.gallery');
    gsap.fromTo(img, { yPercent: big ? -7 : -4, scale: big ? 1.16 : 1.1 }, { yPercent: big ? 7 : 4, scale: 1.04, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  root.querySelectorAll('.gallery figure, .grid > li, .customers li, .ticks li, .team .member').forEach((el, i) => {
    gsap.from(el, { y: 46, autoAlpha: 0, duration: 0.8, ease: 'power3.out', delay: (i % 4) * 0.07, scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });
}

// Page headers: full-bleed graded photograph. The camera settles from a slight push-in when the page
// opens, and the picture then moves more slowly than the page as it scrolls away.
function heads(root) {
  root.querySelectorAll('.ph-scene').forEach((sc) => {
    const img = sc.querySelector('.ph-scene__img');
    gsap.fromTo(img, { scale: 1.16 }, { scale: 1.02, duration: 2.6, ease: 'power3.out' });
    gsap.to(img, { yPercent: 16, ease: 'none', scrollTrigger: { trigger: sc.parentElement, start: 'top top', end: 'bottom top', scrub: true } });
    const light = sc.querySelector('.fx__light');
    if (light) gsap.fromTo(light, { xPercent: -110 }, { xPercent: 110, duration: 3.2, ease: 'sine.inOut', delay: 0.2 });
  });
}

// Film bands: the media is pinned while the section passes; it settles from a push-in and the copy rises
// through it, word by word. Works the same whether the slot holds footage or a photograph.
function bands(root) {
  root.querySelectorAll('[data-film-band]').forEach((band) => {
    const media = band.querySelector('.film-band__media'), copy = band.querySelector('.film-band__copy');
    const tl = gsap.timeline({ scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom bottom', scrub: 0.5 } });
    tl.fromTo(media, { scale: 1.22, yPercent: -4 }, { scale: 1.02, yPercent: 3, ease: 'none', duration: 1 }, 0)
      .fromTo(copy, { yPercent: 40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, ease: 'power2.out', duration: 0.35 }, 0.25)
      .to(copy, { yPercent: -30, autoAlpha: 0, ease: 'power2.in', duration: 0.2 }, 0.8);
    const light = band.querySelector('.fx__light');
    if (light) tl.fromTo(light, { xPercent: -110 }, { xPercent: 110, ease: 'none', duration: 1 }, 0);
  });
}

// Our Work: each project is a scene. A soft enlarged copy of the photograph fills the background and
// drifts slowly; the sharp photograph and the title move at their own rates in front of it.
function work(root) {
  root.querySelectorAll('.wk').forEach((el) => {
    const st = { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true };
    gsap.fromTo(el.querySelector('.wk__bg img'), { yPercent: -12 }, { yPercent: 12, ease: 'none', scrollTrigger: st });
    gsap.fromTo(el.querySelector('.wk__frame img'), { yPercent: -6, scale: 1.2 }, { yPercent: 6, scale: 1.05, ease: 'none', scrollTrigger: st });
    gsap.fromTo(el.querySelector('.wk__cap'), { y: 70 }, { y: -70, ease: 'none', scrollTrigger: st });
    const pa = el.querySelector('.wk__panel--a'), pb = el.querySelector('.wk__panel--b');
    if (pa) {   // two brushed steel panels cover the photograph and slide apart as the scene arrives
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 72%', once: true } });
      tl.fromTo(pa, { xPercent: 0 }, { xPercent: -102, duration: 1.15, ease: 'power3.inOut' }, 0)
        .fromTo(pb, { xPercent: 0 }, { xPercent: 102, duration: 1.15, ease: 'power3.inOut' }, 0.08)
        .fromTo(el.querySelector('.wk__cap'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, ease: 'power2.out' }, 0.5);
    }
  });
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) root.querySelectorAll('.wk a').forEach((a) => {
    const frame = a.querySelector('.wk__frame'), bg = a.querySelector('.wk__bg');
    const rx = gsap.quickTo(frame, 'rotateX', { duration: 0.6, ease: 'power3.out' }), ry = gsap.quickTo(frame, 'rotateY', { duration: 0.6, ease: 'power3.out' });
    const bx = gsap.quickTo(bg, 'xPercent', { duration: 0.9, ease: 'power3.out' });
    a.addEventListener('pointermove', (e) => { const r = a.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; rx(-y * 5); ry(x * 7); bx(-x * 3); });
    a.addEventListener('pointerleave', () => { rx(0); ry(0); bx(0); });
  });
}

// ---- Homepage opening, from Marpet photographs (about 6.4 seconds) ----
export function opening(section) {
  const q = (s) => section.querySelector(s);
  const macro = q('[data-shot=macro]'), frame = q('[data-shot=frame]'), hall = q('[data-shot=hall]'), light = q('.fx__light');
  const mi = macro.querySelector('.m'), fi = frame.querySelector('.m'), hi = hall.querySelector('.shot__img .m'), hb = hall.querySelector('.shot__bg img');
  gsap.set([macro], { autoAlpha: 1 }); gsap.set([frame, hall], { autoAlpha: 0 });
  section.classList.add('is-opening');
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onComplete: () => section.classList.remove('is-opening') });
  // 1. close on the brushed side panel, out of focus, pulling into focus while a light travels along it
  tl.fromTo(mi, { scale: 1.55, xPercent: 9, yPercent: 2, filter: 'blur(9px) brightness(0.45) contrast(1.25)' }, { scale: 1.3, xPercent: -11, yPercent: -1, duration: 3.1, ease: 'sine.inOut' }, 0)
    .to(mi, { filter: 'blur(0px) brightness(1.18) contrast(1.25)', duration: 1.3, ease: 'power2.out' }, 0.1)
    .fromTo(light, { xPercent: -120, autoAlpha: 0 }, { xPercent: 125, autoAlpha: 1, duration: 2.9, ease: 'sine.inOut' }, 0.25)
  // 2. dissolve to the side frame with the Marpet logo plate, still close, drifting back
    .to(frame, { autoAlpha: 1, duration: 0.8, ease: 'power1.inOut' }, 2.55)
    .fromTo(fi, { scale: 1.5, xPercent: 7, filter: 'blur(4px) contrast(1.2) brightness(1.1)' }, { scale: 1.1, xPercent: 0, filter: 'blur(0px) contrast(1.2) brightness(1.1)', duration: 2.2, ease: 'power2.inOut' }, 2.55)
  // 3. pull back into the production hall; the headline arrives as the camera settles
    .to(hall, { autoAlpha: 1, duration: 1.0, ease: 'power1.inOut' }, 4.05)
    .fromTo(hi, { scale: 1.75 }, { scale: 1.06, duration: 2.5, ease: 'power3.out' }, 4.05)
    .fromTo(hb, { scale: 2.0 }, { scale: 1.25, duration: 2.5, ease: 'power3.out' }, 4.05)
    .to(light, { autoAlpha: 0.4, duration: 1.2 }, 4.3)
    .call(() => section.classList.add('is-ready'), null, 4.75)
    .to({}, { duration: 0.2 }, 6.35);
  return tl;
}

// ---- Homepage scenes, scrubbed by scroll: hall, then one scene per service. A brushed steel sheet
// crosses the frame between scenes (left, up, right), and the photograph changes behind it. ----
export function scene(section) {
  const shots = ['hall', 'ch1', 'ch2', 'ch3'].map((k) => section.querySelector(`[data-shot=${k}]`));
  const sheet = section.querySelector('.wipe__sheet');
  const seg = [[0, 0.2], [0.2, 0.48], [0.48, 0.76], [0.76, 1]];
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  gsap.set(sheet, { xPercent: 115, yPercent: 0 });
  shots.forEach((s, i) => {
    const [a, z] = seg[i], d = z - a + 0.04;
    const img = s.querySelector('.shot__img .m'), bg = s.querySelector('.shot__bg img'), fg = s.querySelector('.shot__fg img');
    if (i) {
      const from = [null, { xPercent: 115, yPercent: 0 }, { xPercent: 0, yPercent: 115 }, { xPercent: -115, yPercent: 0 }][i];
      const to = [null, { xPercent: -115, yPercent: 0 }, { xPercent: 0, yPercent: -115 }, { xPercent: 115, yPercent: 0 }][i];
      tl.fromTo(sheet, from, { ...to, duration: 0.075, ease: 'power1.inOut', immediateRender: false }, a - 0.04)
        .fromTo(s, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001, immediateRender: false }, a - 0.004);
    }
    tl.fromTo(img, { scale: i ? 1.24 : 1.06, xPercent: i % 2 ? 2.5 : -2.5 }, { scale: i ? 1.03 : 1.18, xPercent: i % 2 ? -2.5 : 2.5, duration: d, immediateRender: !i ? false : true }, a);
    if (bg) tl.fromTo(bg, { scale: 1.32, yPercent: -3 }, { scale: 1.2, yPercent: 3, duration: d }, a);
    if (fg) tl.fromTo(fg, { yPercent: 34, scale: 1.7 }, { yPercent: -44, scale: 1.85, duration: d }, a);
  });
  return tl;
}

export function init(root = document) {
  kill();
  if (reduce.matches) return;
  document.documentElement.classList.add('has-motion');
  ctx = gsap.context(() => { headings(root); sheets(root); photos(root); work(root); heads(root); bands(root); });
  ScrollTrigger.refresh();
}
export function kill() {
  if (ctx) { ctx.revert(); ctx = null; }
  document.querySelectorAll('.sheets').forEach((el) => el.remove());
}
// For frame-by-frame capture: stop GSAP's own clock and step it by hand.
export function manualClock() { gsap.ticker.remove(gsap.updateRoot); let t = gsap.ticker.time; return (dt) => { t += dt; gsap.updateRoot(t); ScrollTrigger.update(); }; }

window.MP = { init, kill, manualClock, opening, scene, gsap, ScrollTrigger };
