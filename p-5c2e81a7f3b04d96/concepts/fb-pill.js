/* Floating "Feedback" and "All concepts" buttons shown on every concept page (added by the review kit, not part of the design). */
(function () {
  var m = location.pathname.match(/\/concepts\/([^\/]+)\//); if (!m) return;
  var id = m[1], css = 'position:fixed;z-index:2147483000;bottom:max(.8rem,env(safe-area-inset-bottom));min-height:44px;display:inline-flex;align-items:center;padding:0 1rem;border-radius:999px;font:700 15px/1 system-ui,sans-serif;text-decoration:none;box-shadow:0 6px 20px rgba(0,0,0,.35);';
  var bar = document.createElement('div'); bar.setAttribute('role', 'navigation'); bar.setAttribute('aria-label', 'Review');
  bar.innerHTML = '<a href="../index.html" style="' + css + 'right:.8rem;bottom:calc(max(.8rem,env(safe-area-inset-bottom)) + 52px);background:#fff;color:#1c1b19;border:2px solid #1c1b19">&larr; All concepts</a>' +
                  '<a href="../review.html?c=' + id + '" style="' + css + 'right:.8rem;background:#1f4fd8;color:#fff;border:2px solid #1f4fd8">Give feedback</a>';
  document.body.appendChild(bar);
})();
