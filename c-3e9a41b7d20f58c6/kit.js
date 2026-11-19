/* Concept kit behaviour. Without it every page is complete and readable. */
(function () {
  var root = document.documentElement;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* split text into words for the rise and the scroll firm up. Real spaces stay, so it reads the same without styles */
  function words(el, cls) {
    var t = el.textContent.replace(/\s+/g, ' ').trim().split(' ');
    el.setAttribute('aria-label', t.join(' '));
    el.textContent = '';
    t.forEach(function (w, i) {
      var o = document.createElement('span'); o.setAttribute('aria-hidden', 'true');
      if (cls === 'split') { o.className = 'w'; var n = document.createElement('span'); n.style.setProperty('--i', i); n.textContent = w; o.appendChild(n); }
      else { o.style.setProperty('--i', i); o.textContent = w; }
      el.appendChild(o); if (i < t.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }
  [].forEach.call(document.querySelectorAll('.split'), function (e) { words(e, 'split'); });
  [].forEach.call(document.querySelectorAll('.scrub'), function (e) { words(e, 'scrub'); });

  /* scroll reveals */
  var rv = [].slice.call(document.querySelectorAll('.rv, .ruleg'));
  if (!calm && 'IntersectionObserver' in window && rv.length) {
    root.classList.add('rv-on');
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    rv.forEach(function (e) { io.observe(e); });
  }

  /* demo forms: show a card, send nothing */
  [].forEach.call(document.querySelectorAll('form.demo-form'), function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var c = f.querySelector('.demo-card'); if (c) { c.classList.add('on'); c.setAttribute('tabindex', '-1'); c.focus(); }
    });
  });

  if (calm || !fine) return;

  /* buttons lean toward a mouse */
  [].forEach.call(document.querySelectorAll('.btn.magnet'), function (b) {
    b.addEventListener('pointermove', function (e) {
      var r = b.getBoundingClientRect();
      b.style.setProperty('--mx', (((e.clientX - r.left - r.width / 2) / r.width) * 10).toFixed(1) + 'px');
      b.style.setProperty('--my', (((e.clientY - r.top - r.height / 2) / r.height) * 8).toFixed(1) + 'px');
    });
    b.addEventListener('pointerleave', function () { b.style.removeProperty('--mx'); b.style.removeProperty('--my'); });
  });

  /* a picture that follows the pointer over a list: <ul data-follow="#el"> with <li data-ph="label"> */
  [].forEach.call(document.querySelectorAll('[data-follow]'), function (list) {
    var box = document.querySelector(list.getAttribute('data-follow')); if (!box) return;
    var cap = box.querySelector('[data-cap]');
    list.addEventListener('pointermove', function (e) {
      box.style.setProperty('--fx', (e.clientX + 24) + 'px'); box.style.setProperty('--fy', (e.clientY - 90) + 'px');
      box.style.setProperty('--fr', (((e.clientX / window.innerWidth) - 0.5) * 6).toFixed(1) + 'deg');
      var li = e.target.closest('[data-ph]'); if (li) { if (cap) cap.textContent = li.getAttribute('data-ph'); box.classList.add('on'); }
    });
    list.addEventListener('pointerleave', function () { box.classList.remove('on'); });
  });

  /* flat shapes that pop along the pointer inside [data-trail]; shapes come from <template id="shapes"> */
  [].forEach.call(document.querySelectorAll('[data-trail]'), function (area) {
    var tpl = document.querySelector(area.getAttribute('data-trail')); if (!tpl) return;
    var shapes = [].slice.call(tpl.content.children), last = 0, lx = 0, ly = 0, n = 0;
    area.addEventListener('pointermove', function (e) {
      var d = Math.hypot(e.clientX - lx, e.clientY - ly), now = performance.now();
      if (d < 90 || now - last < 60) return; last = now; lx = e.clientX; ly = e.clientY;
      var el = document.createElement('div'); el.className = 'trail-dot'; el.setAttribute('aria-hidden', 'true');
      el.appendChild(shapes[n++ % shapes.length].cloneNode(true));
      el.style.setProperty('--s', (2.4 + (n % 3) * 0.7) + 'rem');
      el.style.setProperty('--tx', (e.clientX - 24) + 'px'); el.style.setProperty('--ty', (e.clientY - 24) + 'px');
      el.style.setProperty('--tr', ((n % 5) * 14 - 28) + 'deg'); el.style.setProperty('--tr2', ((n % 5) * 14 - 8) + 'deg');
      document.body.appendChild(el); setTimeout(function () { el.remove(); }, 1200);
    });
  });
})();
