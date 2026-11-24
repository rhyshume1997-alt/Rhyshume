/* Jack O'Beers: the gimmick. Jack the bull lies down in the footer. When you click a link he gets up and headbutts the current page out of the way,
   and the next page is revealed underneath. Built on cross-document view transitions (Chrome, Edge, Safari 18.2+). Elsewhere, and with reduced motion,
   links just work normally. TEMPORARY STAND-IN: the supplied logo is rotated and slid around. Supplied logo animations plug in here (see docs/concepts/jack-obeers/logo-animation-spec.md). */
(function () {
  'use strict';
  if (!('onpagereveal' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var busy = false;
  function sameSite(a) { return a.origin === location.origin && a.pathname !== location.pathname && !a.hash.length || (a.origin === location.origin && a.pathname !== location.pathname); }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || busy) return;
    var a = e.target.closest('a[href]'); if (!a || a.target === '_blank' || a.hasAttribute('download') || a.hasAttribute('data-placeholder')) return;
    var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (!/^https?:$/.test(u.protocol) || !sameSite(u)) return;
    e.preventDefault(); busy = true;
    var bull = document.createElement('div'); bull.className = 'bull'; bull.setAttribute('aria-hidden', 'true');
    bull.innerHTML = '<img src="assets/media/jack-logo.png" alt="" width="96" height="96">';
    document.body.appendChild(bull);
    requestAnimationFrame(function () { requestAnimationFrame(function () { bull.classList.add('up'); }); });
    setTimeout(function () { bull.style.viewTransitionName = 'bull'; location.href = u.href; }, 280); /* he gets up first, then charges */
  });
  /* back/forward and reloads never get the headbutt */
  window.addEventListener('pageswap', function (e) { if (e.viewTransition && e.activation && e.activation.navigationType !== 'push') e.viewTransition.skipTransition(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) { busy = false; var b = document.querySelector('.bull'); if (b) b.remove(); } });
})();
