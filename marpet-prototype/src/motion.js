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
    if (h.closest('[data-scene]') || h.querySelector('a, span.confirm')) return;
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

// Our Work: each project is a scene. A soft enlarged copy of the photograph fills the background and
// drifts slowly; the sharp photograph and the title move at their own rates in front of it.
function work(root) {
  root.querySelectorAll('.wk').forEach((el) => {
    const st = { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true };
    gsap.fromTo(el.querySelector('.wk__bg img'), { yPercent: -12 }, { yPercent: 12, ease: 'none', scrollTrigger: st });
    gsap.fromTo(el.querySelector('.wk__frame img'), { yPercent: -6, scale: 1.2 }, { yPercent: 6, scale: 1.05, ease: 'none', scrollTrigger: st });
    gsap.fromTo(el.querySelector('.wk__cap'), { y: 70 }, { y: -70, ease: 'none', scrollTrigger: st });
    gsap.fromTo(el.querySelector('.wk__frame'), { clipPath: 'inset(22% 16% 22% 16%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 78%', once: true } });
  });
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) root.querySelectorAll('.wk a').forEach((a) => {
    const frame = a.querySelector('.wk__frame'), bg = a.querySelector('.wk__bg');
    const rx = gsap.quickTo(frame, 'rotateX', { duration: 0.6, ease: 'power3.out' }), ry = gsap.quickTo(frame, 'rotateY', { duration: 0.6, ease: 'power3.out' });
    const bx = gsap.quickTo(bg, 'xPercent', { duration: 0.9, ease: 'power3.out' });
    a.addEventListener('pointermove', (e) => { const r = a.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5; rx(-y * 5); ry(x * 7); bx(-x * 3); });
    a.addEventListener('pointerleave', () => { rx(0); ry(0); bx(0); });
  });
}

export function init(root = document) {
  kill();
  if (reduce.matches) return;
  document.documentElement.classList.add('has-motion');
  ctx = gsap.context(() => { headings(root); sheets(root); photos(root); work(root); });
  ScrollTrigger.refresh();
}
export function kill() {
  if (ctx) { ctx.revert(); ctx = null; }
  document.querySelectorAll('.sheets').forEach((el) => el.remove());
}
// For frame-by-frame capture: stop GSAP's own clock and step it by hand.
export function manualClock() { gsap.ticker.remove(gsap.updateRoot); let t = gsap.ticker.time; return (dt) => { t += dt; gsap.updateRoot(t); ScrollTrigger.update(); }; }

window.MP = { init, kill, manualClock, gsap, ScrollTrigger };
