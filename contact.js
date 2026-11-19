/* The stair on /contact: one step at a time, with a bar that fills. Without JavaScript every step shows and the form still works. */
(function () {
  'use strict';
  var form = document.getElementById('stair');
  if (!form) return;
  var steps = Array.prototype.slice.call(form.querySelectorAll('.step'));
  var bar = form.querySelector('.bar');
  var current = 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function show(n, focus) {
    current = Math.max(0, Math.min(steps.length - 1, n));
    steps.forEach(function (s, i) { s.hidden = i !== current; s.classList.toggle('is-here', i === current); });
    if (bar) bar.style.transform = 'scaleX(' + ((current + 1) / steps.length) + ')';
    if (focus) {
      var first = steps[current].querySelector('input:not([type="hidden"]):not([tabindex="-1"]), textarea');
      var legend = steps[current].querySelector('.q');
      try { (current === 0 ? legend : first || legend).setAttribute('tabindex', '-1'); (current === 0 ? legend : first || legend).focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      var top = form.getBoundingClientRect().top + window.pageYOffset - 24;
      window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
    }
  }
  function stepOk(i) {
    var fields = steps[i].querySelectorAll('input, textarea');
    for (var k = 0; k < fields.length; k++) {
      if (fields[k].type === 'hidden') continue;
      if (!fields[k].checkValidity()) { fields[k].reportValidity(); return false; }
    }
    return true;
  }

  steps.forEach(function (s) { s.classList.add('stairs'); });
  show(0, false);

  // Step 1: choosing a trade is the click that moves you on.
  form.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'trade') show(1, true);
  });
  form.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest('.next') || t.classList.contains('next')) { if (stepOk(current)) show(current + 1, true); }
    else if (t.classList.contains('back')) { show(current - 1, true); }
  });
  // Enter on a step moves on instead of sending early.
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && current < steps.length - 1 && e.target && e.target.tagName === 'INPUT' && e.target.type !== 'radio') {
      e.preventDefault();
      if (stepOk(current)) show(current + 1, true);
    }
  });
  // A failed send, or a field on an earlier step that is wrong, takes you back to it.
  form.addEventListener('invalid', function (e) {
    for (var i = 0; i < steps.length; i++) { if (steps[i].contains(e.target)) { show(i, false); break; } }
  }, true);
})();
