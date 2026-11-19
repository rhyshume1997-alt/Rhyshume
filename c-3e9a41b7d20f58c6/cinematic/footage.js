/* Footage slots (Rev 3.1: separate desktop and mobile compositions).
   A slot is an element holding a poster photograph and an empty <video> that names where its footage will live:
     <video data-desktop="se-hero-fire-16x9" data-mobile="se-hero-fire-mobile-4x5" ...></video>
   Phones (under 40rem) use data-mobile, everything wider uses data-desktop. A slot may name only one of them, in which case
   the other size simply has no footage for that slot.
   data/footage.json says what exists. For each key: { "available": true, "layout": "wide" | "portrait", "poster": "img-name" }.
   Drop key.webm and key.mp4 into video/, optionally key's poster as img/<poster>.webp and .jpg, set available true: no rebuild.
   With no file, with reduced motion, with data saver on, or if the file will not play, the poster photograph stays and nothing breaks.
   Listeners get 'layout' (the clip's composition is known, so the page can switch layout), 'live' (it is playing) or 'poster' (it fell back).
   Footage.light(slot, fn, region) reads the average brightness of the playing footage about 8 times a second so the page can
   respond to it (the Salt & Ember name flickers with the fire). region {x,y,w,h} in 0 to 1 limits where it looks. */
(function () {
  'use strict';
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var saver = !!(navigator.connection && navigator.connection.saveData);
  var phone = window.matchMedia('(max-width: 39.99rem)');

  var manifest = null;
  function loadManifest() {
    if (manifest) return manifest;
    manifest = fetch('data/footage.json').then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
    return manifest;
  }

  /* the plates stay hidden (see .fg-wait in cinematic.css) until every slot knows which composition it is, so the page never reflows after it first paints */
  var pending = 0, doc = document.documentElement;
  function release() { doc.classList.remove('fg-wait'); }
  function settle() { setTimeout(function () { if (pending <= 0) release(); }, 0); }
  function setPoster(plate, name) {
    var pic = plate.querySelector('picture'), img = pic && pic.querySelector('img'), src = pic && pic.querySelector('source');
    if (!img) return;
    if (src) src.srcset = 'img/' + name + '.webp';
    img.removeAttribute('width'); img.removeAttribute('height'); img.src = 'img/' + name + '.jpg';
  }

  function mount(plate) {
    var v = plate && plate.querySelector('video');
    var slot = { plate: plate, video: v || null, state: 'poster', layout: 'default', listeners: [] };
    function tell(what) { slot.listeners.forEach(function (f) { f(what); }); }
    var done = false; pending++;
    function decided() { if (done) return; done = true; pending--; settle(); }
    if (!v) { decided(); return slot; }
    plate.setAttribute('data-footage', 'poster');
    var id = (phone.matches ? v.getAttribute('data-mobile') : v.getAttribute('data-desktop'));
    if (!id || calm || saver) {
      /* no clip for this size, or motion is off: a declared poster for the composition may still apply */
      if (id) loadManifest().then(function (m) { var e = m[id]; if (e && e.available === true && e.poster) { setPoster(plate, e.poster); slot.layout = e.layout || 'default'; plate.setAttribute('data-layout', slot.layout); tell('layout'); } decided(); }, decided); else decided();
      return slot;
    }

    loadManifest().then(function (m) {
      var e = m[id];
      if (!e || e.available !== true) { decided(); return; }      /* no footage yet: stay on the poster, make no requests */
      if (e.layout) { slot.layout = e.layout; plate.setAttribute('data-layout', e.layout); }
      if (e.poster) { setPoster(plate, e.poster); tell('layout'); }
      decided();
      var base = 'video/' + id;
      ['webm', 'mp4'].forEach(function (ext) {
        var s = document.createElement('source'); s.src = base + '.' + ext; s.type = 'video/' + ext; v.appendChild(s);
      });
      var last = v.querySelector('source:last-child');
      v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto';
      var visible = true;
      function fall() { slot.state = 'poster'; plate.classList.remove('has-footage'); plate.setAttribute('data-footage', 'poster'); if (!e.poster) { slot.layout = 'default'; plate.removeAttribute('data-layout'); } tell('poster'); }
      function play() { if (!visible || document.hidden || slot.state !== 'live') return; var p = v.play(); if (p && p.catch) p.catch(fall); }
      function pause() { v.pause(); }
      v.addEventListener('error', function (ev) { if (ev.target === last || ev.target === v) fall(); }, true);
      v.addEventListener('canplay', function once() {
        v.removeEventListener('canplay', once); slot.state = 'live'; plate.classList.add('has-footage'); plate.setAttribute('data-footage', 'live');
        if (!e.poster) tell('layout');
        tell('live'); play();
      });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? play() : pause(); }, { threshold: 0.05 }).observe(plate);
      document.addEventListener('visibilitychange', function () { document.hidden ? pause() : play(); });
      v.load();
    });
    return slot;
  }

  /* brightness of the footage, 0 to 1, smoothed. fn(value) */
  function light(slot, fn, region) {
    var v = slot.video; if (!v || calm) return;
    var cv = document.createElement('canvas'); cv.width = 16; cv.height = 9; var cx = cv.getContext('2d', { willReadFrequently: true }); var avg = 0, init = false, timer = 0;
    function tick() {
      if (slot.state !== 'live' || v.paused || document.hidden) return;
      try {
        var w = v.videoWidth || 16, h = v.videoHeight || 9, r = region || { x: 0, y: 0, w: 1, h: 1 }; cx.drawImage(v, w * r.x, h * r.y, w * r.w, h * r.h, 0, 0, 16, 9); var d = cx.getImageData(0, 0, 16, 9).data, s = 0;
        for (var i = 0; i < d.length; i += 4) s += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
        var l = s / (144 * 255); avg = init ? avg * 0.6 + l * 0.4 : l; init = true; fn(avg);
      } catch (e) { clearInterval(timer); }
    }
    function begin() { clearInterval(timer); timer = setInterval(tick, 125); }
    if (slot.state === 'live') begin(); else slot.listeners.push(function (what) { if (what === 'live') begin(); });
  }

  window.Footage = { mount: mount, light: light, calm: calm };
})();
