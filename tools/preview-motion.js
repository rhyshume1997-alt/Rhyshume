'use strict';

// Motion pack for engineering previews. Plain CSS and a little vanilla JS, written into the page itself.
// No libraries, no build step, no extra files and no extra requests.
//
// Safety rules built in:
// - Nothing is hidden unless the page JS has set class "mo" on <html>, and that class is only set when the
//   visitor has NOT asked for reduced motion. With JS off, or reduced motion on, the plain page shows.
// - If the page JS does not start within 4 seconds the "mo" class is removed again, so nothing stays hidden.
// - Animations only use transform and opacity, so nothing moves the layout (no layout shift).
// - It adds no words. Counted numbers come from text already on the page, and years are never counted.

const MOTION_CSS = `
/* motion pack */
.mo-n { display: inline-block; font-variant-numeric: tabular-nums; text-align: right; }
.pv-list h3 a { color: inherit; text-decoration: none; }
.pv-list h3 a:focus-visible { outline: 3px solid var(--accent); outline-offset: 3px; }

/* before and after slider, built by the page JS only when both screenshots are there */
.pv-compare.mo-on { display: block; max-width: 22rem; margin-inline: auto; }
.mo-slider { --v: 0.5; --x: calc(1.375rem + (100% - 2.75rem) * var(--v)); position: relative; width: 100%; overflow: hidden; border: 1px solid var(--ink); background: #fff; touch-action: pan-y; }
.mo-slider .pv-shotbox { position: absolute; inset: 0; border: 0; }
.mo-slider .pv-shotbox img { display: block; width: 100%; height: 100%; object-fit: cover; }
.mo-slider .mo-top { clip-path: inset(0 calc(100% - var(--x)) 0 0); }
.mo-range { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: ew-resize; touch-action: pan-y; -webkit-appearance: none; appearance: none; background: transparent; }
.mo-range::-webkit-slider-thumb { -webkit-appearance: none; width: 2.75rem; height: 100%; }
.mo-range::-moz-range-thumb { width: 2.75rem; height: 100%; border: 0; background: transparent; }
.mo-handle { position: absolute; top: 0; bottom: 0; left: var(--x); width: 0; pointer-events: none; }
.mo-handle::before { content: ""; position: absolute; top: 0; bottom: 0; left: -1px; width: 2px; background: var(--ink); box-shadow: 0 0 0 1px #fff; }
.mo-knob { position: absolute; top: 50%; left: 0; width: 2.75rem; height: 2.75rem; margin: -1.375rem 0 0 -1.375rem; border-radius: 50%; background: var(--ink); box-shadow: 0 0 0 3px #fff; }
.mo-knob::before, .mo-knob::after { content: ""; position: absolute; top: 50%; margin-top: -6px; border: 6px solid transparent; }
.mo-knob::before { left: 7px; border-right-color: #fff; border-left-width: 0; }
.mo-knob::after { right: 7px; border-left-color: #fff; border-right-width: 0; }
.mo-range:focus-visible ~ .mo-handle .mo-knob { outline: 3px solid var(--accent); outline-offset: 3px; }
.mo-caps { display: flex; justify-content: space-between; gap: 1rem; margin-top: 0.5rem; font-size: 0.875rem; color: var(--ink-2); }

@media (prefers-reduced-motion: no-preference) {
  /* scroll reveal: sections and cards fade up once, 400ms, staggered 60ms by the page JS */
  .mo .mo-r { opacity: 0; transform: translateY(14px); }
  .mo .mo-r.in { opacity: 1; transform: none; transition: opacity 400ms ease-out, transform 400ms ease-out, translate 200ms ease; }
  .mo .mo-r.mo-now { transition: none; }

  /* header: stays put, shrinks a little and gains a shadow after the first scroll (transform only, so no layout shift) */
  html.mo { scroll-padding-top: 5rem; }
  .mo .masthead { position: sticky; top: 0; z-index: 30; background: var(--paper); }
  .mo .masthead::after { content: ""; position: absolute; inset: 0; box-shadow: 0 8px 18px -10px rgba(11, 42, 91, 0.5); opacity: 0; transition: opacity 200ms ease; pointer-events: none; }
  .mo .masthead.is-stuck::after { opacity: 1; }
  .mo .masthead .sheet { transform-origin: left center; transition: transform 220ms ease; }
  .mo .masthead.is-stuck .sheet { transform: scale(0.95); }

  /* service cards: gentle lift and a line that grows under the title, on hover and on keyboard focus */
  .pv-list li { transition: translate 200ms ease; }
  .pv-list li:hover, .pv-list li:focus-within { translate: 0 -3px; }
  .pv-list h3::after { content: ""; display: block; height: 2px; margin-top: 0.4rem; background: var(--accent); transform: scaleX(0); transform-origin: left; transition: transform 280ms ease; }
  .pv-list li:hover h3::after, .pv-list li:focus-within h3::after { transform: scaleX(1); }

  /* hero: a slow soft colour drift behind the headline, no video */
  .titleblock { position: relative; isolation: isolate; }
  .mo .titleblock::before { content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
    background: radial-gradient(28rem 16rem at 18% 30%, var(--accent-soft), transparent 70%), radial-gradient(24rem 14rem at 82% 72%, var(--paper-2), transparent 70%);
    animation: mo-drift 26s ease-in-out infinite alternate; }
  @keyframes mo-drift { from { transform: translate3d(-2%, 1%, 0) scale(1); } to { transform: translate3d(2%, -1%, 0) scale(1.04); } }

  /* Get a quote buttons: a soft ring pulses once every 8 seconds, until the visitor interacts */
  .mo a.btn[href="#quote"] { position: relative; }
  .mo a.btn[href="#quote"]::after { content: ""; position: absolute; inset: -1px; border: 2px solid var(--accent); opacity: 0; pointer-events: none; animation: mo-pulse 8s ease-out 2s infinite; }
  .mo.mo-calm a.btn[href="#quote"]::after { animation: none; }
  @keyframes mo-pulse { 0% { opacity: 0.6; transform: scale(1); } 9% { opacity: 0; transform: scale(1.14, 1.35); } 100% { opacity: 0; transform: scale(1.14, 1.35); } }
}
`;

const HEAD_JS = "(function(){var d=document.documentElement;try{if(!window.matchMedia||!matchMedia('(prefers-reduced-motion: reduce)').matches){d.classList.add('mo');setTimeout(function(){if(!window.__moOK)d.classList.remove('mo')},4000)}}catch(e){}})();";

const MOTION_JS = `
(function () {
  var d = document.documentElement;
  window.__moOK = 1;
  var motion = d.classList.contains('mo');
  var vh = window.innerHeight || 800;
  var IO = 'IntersectionObserver' in window;

  /* before and after slider: only when both screenshots are on the page. The range input gives touch, mouse and arrow keys. */
  (function () {
    var wrap = document.querySelector('.pv-compare');
    if (!wrap) return;
    var shots = wrap.querySelectorAll('.pv-shot');
    if (shots.length !== 2) return;
    var boxes = [shots[0].querySelector('.pv-shotbox'), shots[1].querySelector('.pv-shotbox')];
    var imgs = [boxes[0] && boxes[0].querySelector('img'), boxes[1] && boxes[1].querySelector('img')];
    var caps = [shots[0].querySelector('figcaption'), shots[1].querySelector('figcaption')];
    if (!imgs[0] || !imgs[1] || !imgs[0].getAttribute('src') || !imgs[1].getAttribute('src') || !caps[0] || !caps[1]) return;
    var w = imgs[0].getAttribute('width'), h = imgs[0].getAttribute('height');
    if (!w || !h) return;
    var saved = wrap.innerHTML;
    var slider = document.createElement('div');
    slider.className = 'mo-slider';
    slider.style.aspectRatio = w + ' / ' + h;
    boxes[0].classList.add('mo-top');
    slider.appendChild(boxes[1]);
    slider.appendChild(boxes[0]);
    var range = document.createElement('input');
    range.type = 'range'; range.min = '0'; range.max = '100'; range.step = '1'; range.value = '50';
    range.className = 'mo-range';
    range.setAttribute('aria-label', 'Compare their site today with the concept. Use the left and right arrow keys.');
    var handle = document.createElement('div');
    handle.className = 'mo-handle'; handle.setAttribute('aria-hidden', 'true');
    var knob = document.createElement('div'); knob.className = 'mo-knob'; handle.appendChild(knob);
    slider.appendChild(range); slider.appendChild(handle);
    var row = document.createElement('div'); row.className = 'mo-caps';
    var a = document.createElement('span'); a.textContent = caps[0].textContent;
    var b = document.createElement('span'); b.textContent = caps[1].textContent;
    row.appendChild(a); row.appendChild(b);
    wrap.textContent = '';
    wrap.classList.add('mo-on');
    wrap.appendChild(slider); wrap.appendChild(row);
    range.addEventListener('input', function () { slider.style.setProperty('--v', String(range.value / 100)); });
    var undo = function () { wrap.innerHTML = saved; wrap.classList.remove('mo-on'); };
    imgs[0].addEventListener('error', undo, { once: true });
    imgs[1].addEventListener('error', undo, { once: true });
  })();

  if (!motion) return;

  /* header: shrink and shadow after the first scroll */
  (function () {
    var mh = document.querySelector('.masthead');
    if (!mh) return;
    var queued = false, on = false;
    function check() { queued = false; var s = (window.pageYOffset || d.scrollTop || 0) > 8; if (s !== on) { on = s; mh.classList.toggle('is-stuck', s); } }
    window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(check); } }, { passive: true });
    check();
  })();

  /* scroll reveal, once, staggered 60ms. Anything already in view when the page loads just shows. */
  (function () {
    var items = document.querySelectorAll('.mo-r');
    if (!IO) { items.forEach(function (el) { el.classList.add('in', 'mo-now'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.style.transitionDelay = (n * 60) + 'ms';
        n += 1;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) {
      if (el.getBoundingClientRect().top < vh * 0.92) el.classList.add('in', 'mo-now');
      else io.observe(el);
    });
  })();

  /* count up quantities found on their site, once. Years are never wrapped, so they never count. */
  (function () {
    var nums = document.querySelectorAll('.mo-n');
    if (!IO || !nums.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target, raw = el.getAttribute('data-n'), to = parseFloat(raw), dec = (raw.split('.')[1] || '').length, final = el.getAttribute('data-final'), t0 = performance.now();
        (function tick(now) {
          var p = Math.min(1, (now - t0) / 900), k = 1 - Math.pow(1 - p, 3);
          el.textContent = p < 1 ? (to * k).toFixed(dec) : final;
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (el) {
      el.setAttribute('data-final', el.textContent);
      el.textContent = (0).toFixed((el.getAttribute('data-n').split('.')[1] || '').length);
      io.observe(el);
    });
  })();

  /* the Get a quote pulse stops for good at the first touch, click or key press */
  (function () {
    function calm() { d.classList.add('mo-calm'); }
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { window.addEventListener(ev, calm, { once: true, passive: true }); });
  })();
})();
`;

// A quantity is a number of up to 3 digits, with an optional decimal part, that is not part of a longer
// digit run or a word. Years (4 digits), phone numbers (long digit runs) and numbers written with a thousands
// comma are never matched.
const QTY = /(?<![\d.\w])(?<!\d,)(\d{1,3}(?:\.\d+)?)(?![\d.]*\d)(?!\w*\d)(?!,\d)/g;

function wrapNumbers(inner) {
  return inner.replace(QTY, function (m) {
    if (/^0\d/.test(m)) return m; // a leading zero is a code or phone piece, not a quantity
    return '<span class="mo-n" data-n="' + m + '" style="min-width:' + m.length + 'ch">' + m + '</span>';
  });
}

// Turns a rendered preview page into the motion version. Safe to run twice.
function applyMotion(html) {
  if (html.indexOf('id="pv-motion"') !== -1) return html;
  let out = html;

  // sections and service cards get the reveal class (the CSS only hides them when the "mo" class is on <html>)
  out = out.replace(/<section class="clause( [^"]*)?"/g, function (m, rest) { return '<section class="clause' + (rest || '') + ' mo-r"'; });
  out = out.replace(/<li><h3>([^<]*)<\/h3>/g, '<li class="mo-r"><h3><a href="#quote">$1</a></h3>');

  // numbers in the facts row and in the size lines
  out = out.replace(/(<ul class="pv-proof">)([\s\S]*?)(<\/ul>)/, function (m, a, body, c) {
    return a + body.replace(/<li>([^<]*)<\/li>/g, function (x, t) { return '<li>' + wrapNumbers(t) + '</li>'; }) + c;
  });
  out = out.replace(/<p class="pv-detail">([^<]*)<\/p>/g, function (m, t) { return '<p class="pv-detail">' + wrapNumbers(t) + '</p>'; });

  const head = '<style id="pv-motion">' + MOTION_CSS + '</style>\n<script>' + HEAD_JS + '</script>\n';
  out = out.replace('</head>', head + '</head>');
  out = out.replace('</body>', '<script>' + MOTION_JS + '</script>\n</body>');
  return out;
}

function motionNotes() {
  return [
    '## Motion (on by default, every niche)',
    '',
    'Plain CSS and a little vanilla JS, written into the page. No libraries, no build step, no extra requests. It adds no words.',
    '- Scroll reveal: sections and service cards fade up once, 400ms, staggered 60ms. Anything in view on load just shows.',
    '- Before and after: a drag slider with arrow keys, only when both screenshots are on the page.',
    '- Facts row: quantities on their site (not years) count up once when scrolled into view.',
    '- Header: stays at the top, shrinks slightly and gains a shadow after the first scroll.',
    '- Service cards: a small lift and a line that grows under the title on hover and keyboard focus. The titles link to the quote form so the cards can take keyboard focus.',
    '- Hero: a slow soft colour drift behind the headline, no video.',
    '- Get a quote buttons: a soft ring every 8 seconds, until the first touch, click or key press.',
    '- Everything above is off when the visitor asks for reduced motion (the slider still works), and with JavaScript off the page shows all content normally.',
    ''
  ].join('\n');
}

module.exports = { MOTION_CSS, MOTION_JS, HEAD_JS, applyMotion, wrapNumbers, motionNotes };
