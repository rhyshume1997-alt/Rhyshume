/* The phone menu. Without this file the nav simply stays visible. */
(function () {
  var btn = document.querySelector('.menu-btn');
  var nav = btn && document.getElementById(btn.getAttribute('aria-controls'));
  if (!nav) return;
  function isOpen() { return btn.getAttribute('aria-expanded') === 'true'; }
  btn.addEventListener('click', function () {
    btn.setAttribute('aria-expanded', String(!isOpen()));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) {
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }
  });
})();
