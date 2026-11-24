/* Jack O'Beers: motion. Cinematic opening, reveals, and the draining-glass background. Everything respects prefers-reduced-motion and works without GSAP. */
(function () {
  'use strict';
  var JO = window.JO, $ = JO.$, $$ = JO.$$, reduced = JO.reduced;
  var hasG = !!(window.gsap && window.ScrollTrigger);
  if (hasG) gsap.registerPlugin(ScrollTrigger);

  /* reveals */
  var rv = $$('.rv');
  if (reduced || !('IntersectionObserver' in window)) rv.forEach(function (n) { n.classList.add('in'); });
  else { var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' }); rv.forEach(function (n) { io.observe(n); }); }

  /* hero */
  var hero = $('.hero');
  if (hero) {
    var vid = $('video', hero);
    if (vid) { if (reduced) { vid.removeAttribute('autoplay'); vid.pause(); } else { var pr = vid.play(); if (pr && pr.catch) pr.catch(function () {}); } }
    var h1 = $('[data-lit]', hero), sign = $('.sign', hero);
    if (h1) {
      var text = h1.textContent; h1.setAttribute('aria-label', text); h1.textContent = '';
      var chars = [];
      text.split(' ').forEach(function (w, wi, arr) { var s = document.createElement('span'); s.style.display = 'inline-block'; s.setAttribute('aria-hidden', 'true'); w.split('').forEach(function (c) { var k = document.createElement('span'); k.className = 'ch'; k.textContent = c; s.appendChild(k); chars.push(k); }); h1.appendChild(s); if (wi < arr.length - 1) h1.appendChild(document.createTextNode(' ')); });
      if (hasG && !reduced) {
        gsap.set(chars, { opacity: .12, yPercent: 40 });
        if (sign) gsap.set(sign, { rotationX: 78, y: 40, opacity: 0 });
        var tl = gsap.timeline({ delay: .25 });
        if (sign) tl.to(sign, { rotationX: 0, y: 0, opacity: 1, duration: 1.3, ease: 'power3.out' });
        tl.to(chars, { opacity: 1, yPercent: 0, duration: .8, stagger: .035, ease: 'power3.out' }, sign ? '-=.7' : 0)
          .from($$('.hero-in > :not(h1):not(.sign)', hero), { opacity: 0, y: 18, duration: .7, stagger: .1, ease: 'power2.out' }, '-=.5');
        /* the dark stage eases away as the shop comes up */
        gsap.to($('.poster, video', hero), { yPercent: 12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      }
    }
  }

  /* draining glass: the full glass is clipped away from the top as the page scrolls, so the beer level falls to the empty glass */
  var drain = $('.drain');
  if (drain) {
    var full = $('.full', drain), meter = $('.drain-level i'), top0 = 0.0, FOAM = 12, END = 88;
    function set(p) { var t = p * END; full.style.clipPath = 'inset(' + t + '% 0 0 0)'; if (meter) meter.style.transform = 'scaleY(' + (1 - p) + ')'; }
    if (reduced) { set(0); }
    else if (hasG) { var o = { p: 0 }; ScrollTrigger.create({ trigger: document.documentElement, start: 'top top', end: 'max', scrub: .6, onUpdate: function (s) { set(s.progress); } }); set(0); }
    else { var tick = function () { var m = document.documentElement.scrollHeight - innerHeight; set(m > 0 ? Math.min(1, scrollY / m) : 0); }; addEventListener('scroll', tick, { passive: true }); tick(); }
    window.addEventListener('jo:layout', function () { if (hasG) ScrollTrigger.refresh(); });
  }
})();
