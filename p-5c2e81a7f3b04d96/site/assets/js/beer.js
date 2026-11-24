/* FALLBACK background (used on pages without the photo frames, or if they fail to load).
   Jack O'Beers: the whole screen is a pint of beer, and it empties as you scroll.
   A WebGL fragment shader draws the beer itself (backlit amber, rising bubbles of different sizes, a creamy foam head riding the surface,
   foam lacing left behind as the level falls). No glass is drawn: you are inside the pint. Scroll position sets the level.
   TEMPORARY STAND-IN: generated in the browser. Real macro footage of a pint being drunk, scrubbed by scroll, will look better; see README.
   Reduced motion or no WebGL: a still, full pint (CSS), no scrubbing. */
window.JO_startBeerShader = function () {
  'use strict';
  var cv = document.querySelector('canvas.beer'); if (!cv) return;
  cv.hidden = false;
  var meter = document.querySelector('.drain-level i');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function fallback() { cv.classList.add('beer-still'); }

  var gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) { fallback(); return; }

  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FS = [
    'precision highp float;',
    'uniform vec2 R;uniform float T;uniform float S;', /* S = surface height, 0 (empty) to 1 (top of screen) */
    'float h11(float p){p=fract(p*.1031);p*=p+33.33;p*=p+p;return fract(p);}',
    'vec2 h22(vec2 p){vec3 q=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));q+=dot(q,q.yzx+33.33);return fract((q.xx+q.yz)*q.zy);}',
    'float h21(vec2 p){return h22(p).x;}',
    'float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*vn(p);p=p*2.03+7.1;a*=.5;}return v;}',
    /* bubbles: grid cells that rise; returns x = fill, y = rim, z = highlight */
    'vec3 bub(vec2 p,float sc,float sp,float seed,float T){',
    '  vec2 g=p*sc;float col=floor(g.x);float v=sp*(.55+.9*h11(col+seed));g.y-=T*v;',
    '  vec2 c=floor(g),l=fract(g)-.5;vec2 h=h22(c+seed*13.7);float h3=h11(c.x*7.3+c.y*3.1+seed);',
    '  if(h3<.70)return vec3(0.);',
    '  float r=.07+.17*h.x*h.x;vec2 o=(h-.5)*(.9-2.*r);float d=length(l-o);',
    '  float body=smoothstep(r,r-.03,d);float rim=smoothstep(r-.07,r-.005,d)*body;',
    '  float hl=smoothstep(r*.38,0.,length(l-o-vec2(-.35,.4)*r))*body;',
    '  return vec3(body,rim,hl);}',
    /* foam: voronoi cells, x = cell shade, y = edge */
    'vec2 vor(vec2 p){vec2 n=floor(p),f=fract(p);float d1=8.,d2=8.;',
    '  for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(float(i),float(j));vec2 o=h22(n+g);float d=length(g+o-f);if(d<d1){d2=d1;d1=d;}else if(d<d2)d2=d;}',
    '  return vec2(d1,d2-d1);}',
    'void main(){',
    '  vec2 uv=gl_FragCoord.xy/R;float asp=R.x/R.y;vec2 p=vec2(uv.x*asp,uv.y);',
    '  float wob=.004*sin(p.x*7.+T*.8)+.003*sin(p.x*17.-T*1.1)+.006*(fbm(vec2(p.x*3.,T*.15))-.5);',
    '  float sy=S+wob;',
    '  float foamH=.085*(.30+.70*S)+.012*fbm(vec2(p.x*5.,2.));',
    /* backdrop above the beer: dark, warm, out of focus */
    '  vec3 bgc=vec3(.075,.04,.025)+vec3(.10,.055,.02)*fbm(p*3.+vec2(0.,T*.01));',
    '  vec2 bc=floor(p*5.);float bk=h21(bc);vec2 bl=fract(p*5.)-.5;bgc+=vec3(.20,.11,.04)*step(.8,bk)*smoothstep(.42,.1,length(bl-(h22(bc)-.5)*.5))*.5;',
    '  vec3 col=bgc;',
    /* liquid */
    '  if(uv.y<sy){',
    '    float depth=clamp((sy-uv.y)/.95,0.,1.);',
    '    vec3 top=vec3(.99,.72,.20),mid=vec3(.80,.43,.07),low=vec3(.34,.13,.02);',
    '    col=mix(top,mid,smoothstep(0.,.45,depth));col=mix(col,low,smoothstep(.35,1.,depth));',
    '    float shaft=fbm(vec2(p.x*2.2+p.y*.7+T*.03,p.y*.5-T*.02));col+=vec3(.20,.12,.03)*smoothstep(.45,.85,shaft)*(1.-depth*.8);',
    '    col*=.92+.16*fbm(p*vec2(6.,2.)+vec2(0.,-T*.05));',
    '    float fade=.35+.65*(1.-depth*.6);',
    '    vec3 b1=bub(p,26.,.045,1.3,T),b2=bub(p,14.,.07,5.1,T),b3=bub(p,7.5,.10,9.4,T);',
    '    vec3 bs=b1*.8+b2+b3*1.1;',
    '    col=mix(col,col*1.18+vec3(.05,.03,.0),clamp(bs.x,0.,1.)*.55);col+=vec3(1.,.9,.6)*bs.y*.40*fade+vec3(1.,.97,.85)*bs.z*.80*fade;',
    '    col+=vec3(.9,.55,.12)*smoothstep(.10,0.,sy-uv.y)*.35;', /* bright meniscus just under the foam */
    '  }',
    /* foam head */
    '  float fy=uv.y-sy;float ragged=(fbm(vec2(p.x*9.,3.))-.5)*.02;',
    '  float inFoam=smoothstep(-.012,.004,fy)*(1.-smoothstep(foamH-.012,foamH+ragged,fy));',
    '  if(inFoam>0.001){',
    '    vec2 v=vor(vec2(p.x*38.,fy*38.));vec2 v2=vor(vec2(p.x*86.+9.,fy*86.));',
    '    float shade=.93+.07*smoothstep(0.,.5,v.x);float edge=smoothstep(0.,.22,v.y);float edge2=smoothstep(0.,.25,v2.y);',
    '    float fyn=clamp(fy/foamH,0.,1.);float glow=.88+.12*smoothstep(.0,.9,fyn);',
    '    vec3 foam=vec3(1.,.965,.865)*shade*glow;foam*=.90+.10*edge;foam*=.95+.05*edge2;',
    '    foam+=vec3(.05,.03,.0)*smoothstep(.55,.0,v.x)*(1.-edge)*.6;',
    '    foam=mix(foam,vec3(.95,.78,.44),smoothstep(.0,.03,.014-fy)*.6);',
    '    col=mix(col,foam,inFoam);',
    '  }',
    /* lacing: foam clinging to the glass above the falling surface */
    '  float above=smoothstep(foamH,foamH+.02,fy);',
    '  float lace=smoothstep(.60,.80,fbm(vec2(p.x*9.,p.y*1.4+fbm(vec2(p.x*3.,1.))*2.)))*smoothstep(.0,.35,S+.2-uv.y*.2);',
    '  float lace2=smoothstep(.55,.78,fbm(vec2(p.x*34.,p.y*5.)));',
    '  col=mix(col,vec3(.93,.86,.68)*(.55+.45*lace2),above*lace*.32*(1.-S*.2));',
    /* vignette and grade */
    '  float vg=smoothstep(1.25,.35,length((uv-.5)*vec2(1.15,1.)));col*=.62+.38*vg;',
    '  col=pow(col,vec3(.96));',
    '  gl_FragColor=vec4(col,1.);',
    '}'].join('\n');

  function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { if (window.console) console.warn(gl.getShaderInfoLog(s)); return null; } return s; }
  var vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) { fallback(); return; }
  var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { fallback(); return; }
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var uR = gl.getUniformLocation(pr, 'R'), uT = gl.getUniformLocation(pr, 'T'), uS = gl.getUniformLocation(pr, 'S');

  var fillDir = cv.dataset.dir === 'fill', FULL = 0.93, EMPTY = 0.035, level = fillDir ? EMPTY : FULL, target = level, t0 = performance.now(), running = true, still = reduced;
  if (still) level = target = FULL; /* reduced motion: one still, full pint (also for the fill direction) */
  function resize() {
    var small = innerWidth < 700, scale = Math.min(window.devicePixelRatio || 1, 1.5) * (small ? .55 : .7);
    cv.width = Math.max(2, Math.round(innerWidth * scale)); cv.height = Math.max(2, Math.round(innerHeight * scale));
    gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(uR, cv.width, cv.height); draw(still ? 1.7 : (performance.now() - t0) / 1000);
  }
  function progress() { var m = document.documentElement.scrollHeight - innerHeight; return m > 0 ? Math.min(1, Math.max(0, scrollY / m)) : 0; }
  function draw(t) { gl.uniform1f(uT, t); gl.uniform1f(uS, level); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  function frame(now) {
    if (!running) return;
    if (!still) {
      target = fillDir ? EMPTY + (FULL - EMPTY) * progress() : FULL + (EMPTY - FULL) * progress();
      level += (target - level) * .09; /* the level settles like a liquid, it never jumps */
      if (meter) meter.style.transform = 'scaleY(' + Math.max(0, Math.min(1, (level - EMPTY) / (FULL - EMPTY))) + ')'; /* reads the level directly, so it is right for drain and fill */
      draw((now - t0) / 1000);
    }
    requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', function () { running = !document.hidden; if (running) requestAnimationFrame(frame); });
  addEventListener('resize', resize); window.addEventListener('jo:layout', function () { /* content height changed */ });
  cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); running = false; fallback(); });
  resize();
  if (!still) requestAnimationFrame(frame);
};
if (!document.querySelector('.pint')) window.JO_startBeerShader(); /* shader is the fallback when the photo frames are used */
