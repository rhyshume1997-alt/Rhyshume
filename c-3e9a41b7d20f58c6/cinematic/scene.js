/* Scene engine for the cinematic proofs of concept.
   Two small pieces, no libraries:
   Scene.plate(el, opts)   a WebGL layer that draws the photograph in el and moves it (cloth or fire), grain included.
   Scene.embers(el, opts)  a 2D canvas of drifting embers.
   Both are progressive enhancement. The plain <img> in the page is always the fallback and is what a visitor sees with
   reduced motion, no WebGL, a lost context or JavaScript off. Neither piece moves anything faster than the screen can
   show and both stop when off screen or when the tab is hidden. */
(function () {
  'use strict';
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700;

  var VERT = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}';
  var FRAG = [
    'precision mediump float;',
    'uniform sampler2D tex;uniform vec2 res;uniform vec2 img;uniform vec2 focus;uniform float t;uniform float amp;uniform float grain;uniform float mode;',
    'varying vec2 v;',
    'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}',
    'vec2 cover(vec2 uv){float ca=res.x/res.y,ia=img.x/img.y;vec2 s=ca>ia?vec2(1.,ia/ca):vec2(ca/ia,1.);return focus*(1.-s)+uv*s;}',
    'void main(){',
    ' vec2 uv=cover(v);vec3 c;',
    ' if(mode<.5){',
    /* cloth: curtains left and right, and the hem of the dress, sway slowly */
    '  float mL=smoothstep(.30,.10,uv.x)*smoothstep(.08,.30,uv.y);',
    '  float mR=smoothstep(.70,.90,uv.x)*smoothstep(.08,.30,uv.y);',
    '  float mD=smoothstep(.34,.48,uv.x)*smoothstep(.66,.52,uv.x)*smoothstep(.42,.80,uv.y);',
    '  float m=max(max(mL,mR),mD*.55);',
    '  float w=sin(uv.y*9.+t*.7+n(vec2(uv.x*4.,t*.2))*4.)*.5+sin(uv.y*17.-t*.5)*.25;',
    '  vec2 d=vec2(w*m*amp,sin(uv.x*11.+t*.6)*m*amp*.4);',
    '  c=texture2D(tex,uv+d).rgb;',
    '  c*=1.+.035*sin(t*.35)*smoothstep(.75,.25,v.x);',
    ' }else{',
    /* fire: pixels that are orange and bright are treated as flame and licked sideways and upward; a warm lift flickers on them */
    '  vec3 c0=texture2D(tex,uv).rgb;',
    '  float lum=dot(c0,vec3(.3,.59,.11));',
    '  float fl=smoothstep(.12,.36,c0.r-c0.b)*smoothstep(.34,.62,lum);',
    '  vec2 d=vec2(n(uv*vec2(8.,5.)+vec2(0.,-t*1.5))-.5,n(uv*vec2(6.,4.)+vec2(3.,-t*1.2))-.5)*amp*fl;',
    '  c=texture2D(tex,uv+d).rgb;',
    '  float fk=.8+.2*sin(t*7.+n(vec2(t*2.,1.))*6.);',
    '  c+=vec3(.9,.34,.07)*fl*.10*fk;',
    ' }',
    ' c+=(h(v*res+t)-.5)*grain;',
    ' gl_FragColor=vec4(c,1.);',
    '}'
  ].join('\n');

  function shader(gl, type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }

  /* el contains an <img>. opts: mode 'cloth' | 'fire', amp, grain, focus [x,y], src (optional 2x source), fps */
  function plate(el, opts) {
    opts = opts || {};
    var img = el.querySelector('img'); if (!img) return null;
    if (calm) { el.setAttribute('data-scene', 'still'); return null; }
    var cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); cv.className = 'gl';
    var gl = null;
    try { gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power', preserveDrawingBuffer: false }); } catch (e) { gl = null; }
    if (!gl) { el.setAttribute('data-scene', 'fallback'); return null; }
    var st = { on: false, vis: true, raf: 0, t0: performance.now(), t: 0, last: 0, tex: null, prog: null, u: {} };
    var fps = opts.fps || (coarse ? 30 : 60), minDt = 1000 / fps;
    try {
      var pr = gl.createProgram();
      gl.attachShader(pr, shader(gl, gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, shader(gl, gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('link');
      gl.useProgram(pr); st.prog = pr;
      var b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      ['tex', 'res', 'img', 'focus', 't', 'amp', 'grain', 'mode'].forEach(function (k) { st.u[k] = gl.getUniformLocation(pr, k); });
    } catch (e) { el.setAttribute('data-scene', 'fallback'); return null; }

    function size() {
      var r = el.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
      var w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    }
    function draw(now) {
      st.raf = 0; if (!st.on) return;
      if (st.vis && !document.hidden) st.raf = requestAnimationFrame(draw);
      if (now - st.last < minDt) return; st.last = now;
      st.t = (now - st.t0) / 1000; size();
      gl.uniform1i(st.u.tex, 0); gl.uniform2f(st.u.res, cv.width, cv.height); gl.uniform2f(st.u.img, img.naturalWidth, img.naturalHeight);
      var f = opts.focus || [0.5, 0.5]; gl.uniform2f(st.u.focus, f[0], f[1]);
      gl.uniform1f(st.u.t, st.t); gl.uniform1f(st.u.amp, opts.amp != null ? opts.amp : (opts.mode === 'fire' ? 0.02 : 0.004));
      gl.uniform1f(st.u.grain, opts.grain != null ? opts.grain : 0.035); gl.uniform1f(st.u.mode, opts.mode === 'fire' ? 1 : 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    function kick() { if (st.on && !st.raf && st.vis && !document.hidden) st.raf = requestAnimationFrame(draw); }
    function start() {
      var im = new Image(); im.crossOrigin = 'anonymous';
      im.onload = function () {
        try {
          var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
          st.tex = tex; img = im;
          el.appendChild(cv); st.on = true; draw(performance.now());
          el.setAttribute('data-scene', 'live'); el.classList.add('gl-on');
          kick();
        } catch (e) { el.setAttribute('data-scene', 'fallback'); }
      };
      im.onerror = function () { el.setAttribute('data-scene', 'fallback'); };
      im.src = opts.src || img.currentSrc || img.src;
    }
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); st.on = false; el.classList.remove('gl-on'); el.setAttribute('data-scene', 'fallback'); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { st.vis = es[0].isIntersecting; kick(); }, { threshold: 0 }).observe(el);
    document.addEventListener('visibilitychange', kick);
    start();
    return { el: el, state: st };
  }

  /* embers: drifting sparks in a 2D canvas that fills el. opts: origin() returns {x,y,w,h} of the region they rise from in el pixels */
  function embers(el, opts) {
    opts = opts || {};
    if (calm) return null;
    var cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); cv.className = 'embers'; el.appendChild(cv);
    var cx = cv.getContext('2d'); if (!cx) return null;
    var spr = document.createElement('canvas'); spr.width = spr.height = 64; var sc = spr.getContext('2d'), sg = sc.createRadialGradient(32, 32, 0, 32, 32, 32);
    sg.addColorStop(0, 'rgba(255,200,120,1)'); sg.addColorStop(.3, 'rgba(240,120,45,.6)'); sg.addColorStop(1, 'rgba(180,50,10,0)'); sc.fillStyle = sg; sc.fillRect(0, 0, 64, 64);
    var N = opts.count || (coarse ? 34 : 70), ps = [], vis = true, raf = 0, last = 0, dpr = Math.min(window.devicePixelRatio || 1, 2), W = 0, H = 0;
    function size() { var r = el.getBoundingClientRect(); W = r.width; H = r.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    function spawn(p, first) {
      var o = (opts.origin && opts.origin()) || { x: W * .6, y: H * .6, w: 60, h: 60 };
      p.x = o.x + Math.random() * o.w; p.y = o.y + Math.random() * o.h;
      p.vx = -8 - Math.random() * 26; p.vy = -22 - Math.random() * 46; p.r = .7 + Math.random() * 2.1;
      p.life = 0; p.max = 2.6 + Math.random() * 3.4; p.ph = Math.random() * 6.28; p.sw = 6 + Math.random() * 16;
      if (first) p.life = Math.random() * p.max;
    }
    function frame(now) {
      raf = 0; if (!(vis && !document.hidden)) return; raf = requestAnimationFrame(frame);
      var dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
      cx.setTransform(dpr, 0, 0, dpr, 0, 0); cx.clearRect(0, 0, W, H); cx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i]; p.life += dt; if (p.life >= p.max) { spawn(p); continue; }
        var k = p.life / p.max; p.x += (p.vx + Math.sin(p.ph + p.life * 2.4) * p.sw) * dt; p.y += p.vy * dt; p.vy *= (1 - .02 * dt * 60 * .1);
        var a = Math.sin(Math.PI * Math.min(1, k * 1.15)) * (.55 + .45 * Math.sin(p.ph + p.life * 17));
        cx.globalAlpha = Math.max(0, Math.min(1, a)); var sz = p.r * 6.4; cx.drawImage(spr, p.x - sz / 2, p.y - sz / 2, sz, sz);
      }
    }
    function kick() { if (!raf && vis && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
    size(); for (var i = 0; i < N; i++) { var p = {}; spawn(p, true); ps.push(p); }
    window.addEventListener('resize', function () { size(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { vis = es[0].isIntersecting; kick(); }, { threshold: 0 }).observe(el);
    document.addEventListener('visibilitychange', kick); kick();
    return { el: el, canvas: cv };
  }

  window.Scene = { plate: plate, embers: embers, calm: calm };
})();
