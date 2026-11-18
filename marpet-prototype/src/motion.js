// Motion for the site, built on GSAP and ScrollTrigger. Deliberately restrained: one short opening on
// the homepage, then gentle reveals and slow photographic parallax. Nothing is pinned, nothing waits.
// Everything here is decoration over content that is already in the page: with reduced motion, or
// without this script, the pages read normally.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let ctx = null;

// Section headings, eyebrows and leads rise a little into place, once.
function reveals(root) {
  root.querySelectorAll('.section .eyebrow, .section h2:not(.visually-hidden), .page-head .lead, .cta h2').forEach((el) => {
    gsap.from(el, { y: 16, autoAlpha: 0, duration: 0.7, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
  });
  root.querySelectorAll('.gallery figure, .grid > li, .customers li, .team .member, .process__item').forEach((el, i) => {
    gsap.from(el, { y: 28, autoAlpha: 0, duration: 0.7, ease: 'power2.out', delay: (i % 3) * 0.06, scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
  });
}

// Photographs move a touch slower than the page.
function photos(root) {
  root.querySelectorAll('.beamed img, .page-head__media img, .process__media .m').forEach((img) => {
    gsap.fromTo(img, { yPercent: -4, scale: 1.08 }, { yPercent: 4, scale: 1.08, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

// Page headers: the photograph settles from a slight push-in, then drifts slower than the page.
function heads(root) {
  root.querySelectorAll('.ph-scene').forEach((sc) => {
    const img = sc.querySelector('.ph-scene__img');
    gsap.fromTo(img, { scale: 1.1 }, { scale: 1.02, duration: 2.2, ease: 'power3.out' });
    gsap.to(img, { yPercent: 12, ease: 'none', scrollTrigger: { trigger: sc.parentElement, start: 'top top', end: 'bottom top', scrub: true } });
  });
}

// Film bands: the picture drifts slowly behind the copy. Same for footage or a photograph.
function bands(root) {
  root.querySelectorAll('[data-film-band]').forEach((band) => {
    gsap.fromTo(band.querySelector('.film-band__media'), { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1.12, ease: 'none', scrollTrigger: { trigger: band, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

// Our Work: the soft backdrop drifts slowly; the photograph settles in once as it arrives.
function work(root) {
  root.querySelectorAll('.wk').forEach((el) => {
    gsap.fromTo(el.querySelector('.wk__bg img'), { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from(el.querySelector('.wk__frame'), { autoAlpha: 0, y: 30, duration: 0.9, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 80%', once: true } });
    gsap.from(el.querySelector('.wk__frame .m, .wk__frame img'), { scale: 1.08, duration: 1.4, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 80%', once: true } });
  });
}

// ---- Homepage opening, from Marpet photographs: about 4 seconds, on the first visit only ----
// Close on brushed steel, out of focus, pulling sharp as a light crosses it; dissolve to the Marpet plate;
// dissolve and pull back to the production hall. The headline is not held back for any of it.
export function opening(section) {
  const q = (s) => section.querySelector(s);
  const macro = q('[data-shot=macro]'), frame = q('[data-shot=frame]'), hall = q('[data-shot=hall]'), light = q('.fx__light');
  const mi = macro.querySelector('.m'), fi = frame.querySelector('.m'), hi = hall.querySelector('.shot__img .m'), hb = hall.querySelector('.shot__bg img');
  gsap.set(macro, { autoAlpha: 1 }); gsap.set([frame, hall], { autoAlpha: 0 });
  const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
  tl.fromTo(mi, { scale: 1.5, xPercent: 8, filter: 'blur(8px) brightness(0.5) contrast(1.25)' }, { scale: 1.32, xPercent: -8, duration: 1.9, ease: 'sine.inOut' }, 0)
    .to(mi, { filter: 'blur(0px) brightness(1.18) contrast(1.25)', duration: 0.9, ease: 'power2.out' }, 0.05)
    .fromTo(light, { xPercent: -120, autoAlpha: 0 }, { xPercent: 120, autoAlpha: 1, duration: 1.9, ease: 'sine.inOut' }, 0.1)
    .to(frame, { autoAlpha: 1, duration: 0.55, ease: 'power1.inOut' }, 1.45)
    .fromTo(fi, { scale: 1.4, xPercent: 5, filter: 'contrast(1.2) brightness(1.1)' }, { scale: 1.12, xPercent: 0, filter: 'contrast(1.2) brightness(1.1)', duration: 1.4, ease: 'power2.inOut' }, 1.45)
    .to(hall, { autoAlpha: 1, duration: 0.7, ease: 'power1.inOut' }, 2.55)
    .fromTo(hi, { scale: 1.5 }, { scale: 1.04, duration: 1.6, ease: 'power3.out' }, 2.55)
    .fromTo(hb, { scale: 1.8 }, { scale: 1.2, duration: 1.6, ease: 'power3.out' }, 2.55)
    .to(light, { autoAlpha: 0.35, duration: 0.8 }, 2.7);
  return tl;
}

export function init(root = document) {
  kill();
  if (reduce.matches) return;
  document.documentElement.classList.add('has-motion');
  ctx = gsap.context(() => { reveals(root); photos(root); work(root); heads(root); bands(root); });
  ScrollTrigger.refresh();
}
export function kill() {
  if (ctx) { ctx.revert(); ctx = null; }
}
// For frame-by-frame capture: stop GSAP's own clock and step it by hand.
export function manualClock() { gsap.ticker.remove(gsap.updateRoot); let t = gsap.ticker.time; return (dt) => { t += dt; gsap.updateRoot(t); ScrollTrigger.update(); }; }

window.MP = { init, kill, manualClock, opening, gsap, ScrollTrigger };
