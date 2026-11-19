/* Home page behaviour: the before and after slider and the scroll reveals.
   Without this file the page is complete: the slider sits at 50 percent and nothing is hidden. */
(function () {
  var root = document.documentElement;
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- scroll reveals: hidden only once this script is running, never for reduced motion ---- */
  var items = [].slice.call(document.querySelectorAll('.rv'));
  if (!calm && 'IntersectionObserver' in window && items.length) {
    root.classList.add('rv-on');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  }


  /* ---- the building example: pick how a visitor gets in touch and the page changes to match ---- */
  var build = document.getElementById('build');
  if (build) {
    build.setAttribute('data-mode', 'plan');
    var says = { plan: 'The example site is built for planning a week.', table: 'The example site is built for ordering for the table.', call: 'The example site is built for an urgent call or a quote.', shop: 'The example site is built for browsing and adding to a basket.' };
    var live = document.getElementById('build-live');
    [].slice.call(build.querySelectorAll('.bc button')).forEach(function (b) {
      b.addEventListener('click', function () {
        build.setAttribute('data-mode', b.getAttribute('data-mode'));
        [].slice.call(build.querySelectorAll('.bc button')).forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        if (live) live.textContent = says[b.getAttribute('data-mode')];
      });
    });
  }

  /* ---- before and after ---- */
  var ba = document.getElementById('ba');
  var input = ba && ba.querySelector('input[type="range"]');
  if (!input) return;
  var touched = false;

  function set(p) {
    ba.style.setProperty('--p', p);
    input.setAttribute('aria-valuetext', p >= 100 ? 'Current site only' : p <= 0 ? 'New build only' : 'Divider at ' + Math.round(p) + ' percent');
  }
  function settle() { ba.classList.remove('ba-tween'); }

  input.addEventListener('input', function () {
    touched = true;
    settle(); /* dragging tracks the finger one to one */
    set(Number(input.value));
  });

  if (calm || !('IntersectionObserver' in window)) { set(Number(input.value)); return; }

  /* One slow nudge from the current site to the middle when it first comes into view. */
  input.value = 100;
  set(100);
  var hint = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) return;
    hint.disconnect();
    if (touched) return;
    ba.classList.add('ba-tween');
    set(50);
    input.value = 50;
    setTimeout(settle, 1000);
  }, { threshold: 0.55 });
  hint.observe(ba);
})();
