/* Footage slots.
   A plate in the page holds a poster photograph and an empty <video> that names where its footage will live:
     <video data-desktop="se-hero-fire-4x5" data-mobile="se-hero-fire-4x5-mobile" ...></video>
   Drop se-hero-fire-4x5.webm and .mp4 into the video folder, set "available": true for that key in data/footage.json,
   and the page uses them, with no rebuild and no code change. With no file, with reduced motion, with data saver on, or if the file will not play,
   the poster photograph stays and nothing breaks.
   Footage.light(slot, fn) reads the average brightness of the playing footage about 8 times a second so the page can
   respond to it (the Salt & Ember name flickers with the fire). It does nothing without footage. */
(function () {
  'use strict';
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saver = !!(navigator.connection && navigator.connection.saveData);
  var narrow = window.matchMedia('(max-width: 55.99rem)');

  var manifest = null;
  function loadManifest() {
    if (manifest) return manifest;
    manifest = fetch('data/footage.json', { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
    return manifest;
  }

  function mount(plate) {
    var v = plate && plate.querySelector('video');
    var slot = { plate: plate, video: v || null, state: 'poster', listeners: [] };
    if (!v) return slot;
    plate.setAttribute('data-footage', 'poster');
    var id = (narrow.matches && v.getAttribute('data-mobile')) || v.getAttribute('data-desktop');
    if (!id || calm || saver) return slot;

    loadManifest().then(function (m) {
      if (!m[id] || m[id].available !== true) return;             /* no footage yet: stay on the poster, make no requests */
      var base = 'video/' + id;
      ['webm', 'mp4'].forEach(function (ext) {
        var s = document.createElement('source'); s.src = base + '.' + ext; s.type = 'video/' + ext; v.appendChild(s);
      });
      var last = v.querySelector('source:last-child');
      v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
      var visible = true;
      function play() { if (!visible || document.hidden || slot.state !== 'live') return; var p = v.play(); if (p && p.catch) p.catch(function () { slot.state = 'poster'; plate.classList.remove('has-footage'); plate.setAttribute('data-footage', 'poster'); }); }
      function pause() { v.pause(); }
      v.addEventListener('error', function (e) { if (e.target === last || e.target === v) { slot.state = 'poster'; plate.setAttribute('data-footage', 'poster'); plate.classList.remove('has-footage'); } }, true);
      v.addEventListener('canplay', function once() {
        v.removeEventListener('canplay', once); slot.state = 'live'; plate.classList.add('has-footage'); plate.setAttribute('data-footage', 'live');
        slot.listeners.forEach(function (f) { f('live'); }); play();
      });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? play() : pause(); }, { threshold: 0.05 }).observe(plate);
      document.addEventListener('visibilitychange', function () { document.hidden ? pause() : play(); });
      v.load();
    });
    return slot;
  }

  /* brightness of the footage, 0 to 1, smoothed. fn(value) */
  function light(slot, fn) {
    var v = slot.video; if (!v || calm) return;
    var cv = document.createElement('canvas'); cv.width = 16; cv.height = 9; var cx = cv.getContext('2d', { willReadFrequently: true }); var avg = 0, init = false, timer = 0;
    function tick() {
      if (slot.state !== 'live' || v.paused || document.hidden) return;
      try {
        cx.drawImage(v, 0, 0, 16, 9); var d = cx.getImageData(0, 0, 16, 9).data, s = 0;
        for (var i = 0; i < d.length; i += 4) s += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
        var l = s / (144 * 255); avg = init ? avg * 0.6 + l * 0.4 : l; init = true; fn(avg);
      } catch (e) { clearInterval(timer); }
    }
    function begin() { clearInterval(timer); timer = setInterval(tick, 125); }
    if (slot.state === 'live') begin(); else slot.listeners.push(function () { begin(); });
  }

  window.Footage = { mount: mount, light: light, calm: calm };
})();
