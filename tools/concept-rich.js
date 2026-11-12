'use strict';
/* The richer concept page for the instant Upgrade my site tool.
   Takes the content the preview engine already wrote and checked (copy, photos, phone, email) and the
   firm's own colours (tools/brand.js) and returns ONE self-contained html page: their colours, animated
   hero (three.js), scroll animations, a working-feeling quote form (React), a menu and a sticky call bar on phones.
   Every visible word comes from the checked content. Nothing here adds claims, numbers or names.
   The page loads three.js and React from cdnjs; with those blocked it still reads and works (plain html and css). */

function esc(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function url(u) { return /^https?:\/\//i.test(String(u || '')) ? esc(u) : ''; }
function hexOk(h, fallback) { return /^#[0-9a-f]{6}$/i.test(String(h || '')) ? h : fallback; }

function css(b) {
  return ':root{--p:' + b.primary + ';--a:' + b.accent + ';--d:' + b.dark + ';--s:' + b.soft + ';--i:' + b.ink + ';--op:' + b.onPrimary + ';--oa:' + b.onAccent + ';--t:' + b.text + '}' + `
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:var(--i);background:#fff;-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block}a{color:inherit}
.wrap{width:min(1120px,92vw);margin:0 auto}
.banner{background:#0b0f19;color:#cbd5e1;font-size:12.5px;text-align:center;padding:7px 12px;letter-spacing:.01em}
header.nav{position:sticky;top:0;z-index:30;background:rgba(255,255,255,.88);backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid rgba(15,23,42,.08)}
.nav .wrap{display:flex;align-items:center;gap:20px;height:68px}
.brand{font-weight:800;font-size:19px;letter-spacing:-.02em;text-decoration:none;color:var(--t);display:flex;align-items:center}
.brand img{height:40px;width:auto;max-width:190px;object-fit:contain}
.nav nav{margin-left:auto;display:flex;gap:26px;align-items:center}
.nav nav a{text-decoration:none;font-size:14.5px;font-weight:600;color:#334155;position:relative}
.nav nav a:after{content:"";position:absolute;left:0;bottom:-6px;height:2px;width:0;background:var(--a);transition:width .25s}
.nav nav a:hover:after{width:100%}
.btn{display:inline-flex;align-items:center;gap:8px;border:0;cursor:pointer;font:inherit;font-weight:700;font-size:15px;padding:13px 22px;border-radius:999px;text-decoration:none;transition:transform .18s,box-shadow .18s,background .18s}
.btn.pri{background:var(--a);color:var(--oa);box-shadow:0 8px 22px -8px var(--a)}
.btn.pri:hover{transform:translateY(-2px);box-shadow:0 14px 26px -10px var(--a)}
.btn.ghost{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.35)}
.btn.ghost:hover{background:rgba(255,255,255,.22);transform:translateY(-2px)}
.phone{font-weight:700;text-decoration:none;color:var(--t);font-size:15px}
.burger{display:none;margin-left:auto;background:none;border:0;width:44px;height:44px;cursor:pointer;border-radius:10px}
.burger span,.burger span:before,.burger span:after{display:block;width:22px;height:2px;background:var(--t);position:relative;transition:.2s}
.burger span:before,.burger span:after{content:"";position:absolute;left:0}
.burger span:before{top:-7px}.burger span:after{top:7px}
.menu-open .burger span{background:transparent}.menu-open .burger span:before{top:0;transform:rotate(45deg)}.menu-open .burger span:after{top:0;transform:rotate(-45deg)}
.hero{position:relative;overflow:hidden;color:#fff;background:radial-gradient(1200px 600px at 80% -10%,color-mix(in srgb,var(--a) 38%,transparent),transparent 60%),linear-gradient(135deg,var(--d),var(--p))}
#fx{position:absolute;inset:0;width:100%;height:100%;opacity:.9}
.hero .wrap{position:relative;display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:96px 0 104px}
.kicker{display:inline-block;font-size:12.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.22)}
h1{font-size:clamp(34px,5.4vw,60px);line-height:1.04;letter-spacing:-.035em;margin:18px 0 18px;font-weight:800}
.hero p.intro{font-size:clamp(17px,2vw,20px);color:rgba(255,255,255,.86);max-width:34em;margin:0 0 10px}
.hero p.area{color:rgba(255,255,255,.7);margin:0 0 28px;font-size:15px}
.ctas{display:flex;gap:12px;flex-wrap:wrap}
.shot{position:relative;border-radius:22px;overflow:hidden;box-shadow:0 40px 80px -30px rgba(0,0,0,.6);transform:perspective(1100px) rotateY(-6deg) rotateX(2deg);transition:transform .5s;aspect-ratio:4/3;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18)}
.shot:hover{transform:perspective(1100px) rotateY(0) rotateX(0)}
.shot img{width:100%;height:100%;object-fit:cover}
.shot.empty{display:grid;place-items:center;color:rgba(255,255,255,.75);text-align:center;padding:24px;font-size:14px}
.proof{background:var(--s);border-bottom:1px solid rgba(15,23,42,.06);overflow:hidden}
.proof ul{list-style:none;margin:0;padding:18px 0;display:flex;gap:44px;white-space:nowrap;width:max-content;animation:slide 34s linear infinite}
.proof li{font-weight:700;color:var(--t);font-size:15px;display:flex;align-items:center;gap:10px}
.proof li:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--a)}
.proof:hover ul{animation-play-state:paused}
@keyframes slide{to{transform:translateX(-50%)}}
section{padding:92px 0}
.eyebrow{color:var(--t);font-weight:800;letter-spacing:.14em;font-size:12.5px;text-transform:uppercase}
h2{font-size:clamp(28px,3.6vw,42px);letter-spacing:-.03em;line-height:1.1;margin:10px 0 36px;font-weight:800}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px}
.card{position:relative;background:#fff;border:1px solid rgba(15,23,42,.09);border-radius:20px;padding:26px;transition:transform .25s,box-shadow .25s,border-color .25s;overflow:hidden}
.card:before{content:"";position:absolute;inset:0 0 auto 0;height:4px;background:linear-gradient(90deg,var(--p),var(--a));transform:scaleX(0);transform-origin:left;transition:transform .35s}
.card:hover{transform:translateY(-6px);box-shadow:0 26px 40px -26px rgba(15,23,42,.35);border-color:transparent}
.card:hover:before{transform:scaleX(1)}
.card .n{font-size:13px;font-weight:800;color:var(--t);opacity:.7}
.card h3{margin:8px 0 8px;font-size:20px;letter-spacing:-.02em}
.card p{margin:0;color:#475569;font-size:15.5px}.card p.det{margin-top:10px;font-size:14px;color:#64748b}
.photos{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:34px}
.photos img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:16px;transition:transform .4s}
.photos div{overflow:hidden;border-radius:16px}.photos div:hover img{transform:scale(1.06)}
.about{background:var(--s)}
.about .wrap{display:grid;grid-template-columns:.8fr 1.2fr;gap:48px;align-items:start}
.about p.lead{font-size:clamp(18px,2vw,22px);line-height:1.6;margin:0;color:#1e293b}
.quote{background:linear-gradient(160deg,var(--d),var(--p));color:#fff}
.quote .wrap{display:grid;grid-template-columns:.9fr 1.1fr;gap:48px;align-items:start}
.quote h2{margin-bottom:14px}.quote p{color:rgba(255,255,255,.82);margin:0 0 10px}
form.qf{background:#fff;color:var(--i);border-radius:22px;padding:28px;display:grid;gap:14px;box-shadow:0 40px 80px -30px rgba(0,0,0,.55)}
form.qf label{display:grid;gap:6px;font-weight:700;font-size:14px}
form.qf input,form.qf textarea{font:inherit;padding:12px 14px;border-radius:12px;border:1.5px solid #cbd5e1;background:#f8fafc;transition:border-color .15s,box-shadow .15s}
form.qf input:focus,form.qf textarea:focus{outline:0;border-color:var(--a);box-shadow:0 0 0 4px color-mix(in srgb,var(--a) 22%,transparent);background:#fff}
form.qf textarea{min-height:110px;resize:vertical}
.fine{font-size:13px;color:#64748b}.ok{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0;border-radius:12px;padding:12px 14px;font-weight:600}
.contact .wrap{display:flex;flex-wrap:wrap;gap:20px 56px;align-items:center;justify-content:space-between}
.contact a{font-weight:800;font-size:clamp(20px,3vw,30px);text-decoration:none;color:var(--t)}
.contact a:hover{text-decoration:underline}
footer{background:#0b0f19;color:#94a3b8;font-size:13.5px;padding:30px 0}
.callbar{display:none}
.reveal{opacity:0;transform:translateY(22px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)}
.reveal.in{opacity:1;transform:none}
.d1{transition-delay:.08s}.d2{transition-delay:.16s}.d3{transition-delay:.24s}
@media (prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}.proof ul{animation:none}html{scroll-behavior:auto}.shot{transform:none}}
@media (max-width:860px){
 .burger{display:block}.nav nav{position:absolute;left:0;right:0;top:68px;background:#fff;flex-direction:column;align-items:flex-start;gap:0;padding:8px 4vw 18px;border-bottom:1px solid rgba(15,23,42,.1);display:none}
 .menu-open .nav nav{display:flex}.nav nav a{padding:12px 0;width:100%;font-size:17px}.nav nav a:after{display:none}
 .nav .phone{display:none}.nav .btn.pri{display:none}
 .hero .wrap{grid-template-columns:1fr;padding:56px 0 64px;gap:34px}.shot{transform:none}
 section{padding:60px 0}.about .wrap,.quote .wrap{grid-template-columns:1fr;gap:26px}
 .callbar{display:block;position:fixed;left:0;right:0;bottom:0;z-index:40;text-align:center;background:var(--a);color:var(--oa);font-weight:800;padding:16px;text-decoration:none;box-shadow:0 -10px 30px rgba(0,0,0,.2)}
 body.has-call{padding-bottom:56px}
}
`;
}

const FX = `
(function(){
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // scroll reveal
  var els=[].slice.call(document.querySelectorAll('.reveal'));
  if('IntersectionObserver' in window&&!reduce){
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12});
    els.forEach(function(el){io.observe(el);});
  } else els.forEach(function(el){el.classList.add('in');});
  // menu
  var b=document.querySelector('.burger');
  if(b){b.addEventListener('click',function(){var o=document.body.classList.toggle('menu-open');b.setAttribute('aria-expanded',o?'true':'false');});
    [].forEach.call(document.querySelectorAll('.nav nav a'),function(a){a.addEventListener('click',function(){document.body.classList.remove('menu-open');});});}
  // three.js hero: slow drifting points and lines in the firm's colours
  function hero3d(){
    var cv=document.getElementById('fx'); if(!cv||!window.THREE||reduce) return;
    var T=window.THREE, p=getComputedStyle(document.documentElement);
    var r=new T.WebGLRenderer({canvas:cv,alpha:true,antialias:true});
    var sc=new T.Scene(), cam=new T.PerspectiveCamera(55,1,.1,100); cam.position.z=14;
    var N=window.innerWidth<700?70:140, pos=new Float32Array(N*3), vel=[];
    for(var i=0;i<N;i++){pos[i*3]=(Math.random()-.5)*30;pos[i*3+1]=(Math.random()-.5)*16;pos[i*3+2]=(Math.random()-.5)*10;vel.push([(Math.random()-.5)*.006,(Math.random()-.5)*.006]);}
    var g=new T.BufferGeometry(); g.setAttribute('position',new T.BufferAttribute(pos,3));
    var pts=new T.Points(g,new T.PointsMaterial({color:new T.Color(p.getPropertyValue('--a').trim()),size:.11,transparent:true,opacity:.9}));
    sc.add(pts);
    var ring=new T.Mesh(new T.TorusGeometry(4.2,.02,8,120),new T.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.22}));
    ring.position.set(7,0,-2); sc.add(ring);
    var ring2=ring.clone(); ring2.scale.set(.6,.6,.6); sc.add(ring2);
    function size(){var w=cv.clientWidth,h=cv.clientHeight; r.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix();}
    size(); window.addEventListener('resize',size);
    var mx=0,my=0; window.addEventListener('pointermove',function(e){mx=(e.clientX/window.innerWidth-.5);my=(e.clientY/window.innerHeight-.5);});
    var vis=true; if('IntersectionObserver' in window){new IntersectionObserver(function(es){vis=es[0].isIntersecting;}).observe(cv);}
    (function loop(){requestAnimationFrame(loop); if(!vis) return;
      var a=g.attributes.position.array;
      for(var i=0;i<N;i++){a[i*3]+=vel[i][0];a[i*3+1]+=vel[i][1]; if(Math.abs(a[i*3])>15)vel[i][0]*=-1; if(Math.abs(a[i*3+1])>8)vel[i][1]*=-1;}
      g.attributes.position.needsUpdate=true;
      ring.rotation.x+=.003; ring.rotation.y+=.004; ring2.rotation.x-=.004; ring2.rotation.z+=.003;
      cam.position.x+=(mx*2-cam.position.x)*.04; cam.position.y+=(-my*1.2-cam.position.y)*.04; cam.lookAt(0,0,0);
      r.render(sc,cam);})();
  }
  [].forEach.call(document.querySelectorAll('form.qf'),function(f){f.addEventListener('submit',function(e){e.preventDefault();var n=f.querySelector('.fine');var d=JSON.parse(document.getElementById('qf-data').textContent);if(n)n.textContent=d.status;});});
  // React quote form (replaces the plain form, which stays as the fallback)
  function form(){
    var root=document.getElementById('qf-root'); if(!root||!window.React||!window.ReactDOM) return;
    var R=window.React, h=R.createElement, d=JSON.parse(document.getElementById('qf-data').textContent);
    function Form(){
      var s=R.useState({name:'',email:'',phone:'',need:''}), v=s[0], set=s[1];
      var t=R.useState(false), sent=t[0], setSent=t[1];
      function on(k){return function(e){var n=Object.assign({},v);n[k]=e.target.value;set(n);};}
      function field(k,label,type){return h('label',{key:k},label,type==='area'?h('textarea',{value:v[k],onChange:on(k),required:k==='need'}):h('input',{type:type||'text',value:v[k],onChange:on(k),required:k==='name'||k==='email'}));}
      return h('form',{className:'qf',onSubmit:function(e){e.preventDefault();setSent(true);}},
        field('name',d.name),field('email',d.email,'email'),field('phone',d.phone,'tel'),field('need',d.need,'area'),
        h('button',{className:'btn pri',type:'submit',disabled:sent},d.send),
        sent?h('div',{className:'ok',role:'status'},d.status):h('div',{className:'fine'},d.note));
    }
    var node=ReactDOM.createRoot?ReactDOM.createRoot(root):null; if(!node) return;
    root.innerHTML=''; node.render(h(Form));
  }
  function load(src,cb){var s=document.createElement('script');s.src=src;s.async=true;s.onload=cb;s.onerror=function(){cb(true);};document.head.appendChild(s);}
  var base='https://cdnjs.cloudflare.com/ajax/libs/';
  load(base+'three.js/r128/three.min.js',function(err){if(!err){try{hero3d();}catch(e){}}});
  load(base+'react/18.2.0/umd/react.production.min.js',function(err){ if(err) return;
    load(base+'react-dom/18.2.0/umd/react-dom.production.min.js',function(err2){ if(!err2){try{form();}catch(e){}} }); });
})();
`;

function renderRich(c, brandIn) {
  const b = Object.assign({ primary: '#1f3a5f', accent: '#c8562a', dark: '#0f1d30', soft: '#eef2f7', ink: '#111827', onPrimary: '#ffffff', onAccent: '#ffffff', text: '#1f3a5f' }, brandIn || {});
  ['primary', 'accent', 'dark', 'soft', 'ink', 'onPrimary', 'onAccent', 'text'].forEach(function (k) { b[k] = hexOk(b[k], '#1f3a5f'); });

  const phone = c.phone ? '<a class="phone" href="tel:' + esc(c.phone.href) + '">' + esc(c.phone.display) + '</a>' : '';
  const logo = url(c.logo);
  const brand = '<a class="brand" href="#top" aria-label="' + esc(c.name) + '">' + (logo ? '<img src="' + logo + '" alt="' + esc(c.name) + '" referrerpolicy="no-referrer">' : esc(c.name)) + '</a>';
  const hero = c.heroPhoto && url(c.heroPhoto.src)
    ? '<div class="shot reveal d2"><img src="' + url(c.heroPhoto.src) + '" alt="' + esc(c.heroPhoto.alt) + '" referrerpolicy="no-referrer"></div>'
    : '<div class="shot empty reveal d2">' + esc(c.placeholder) + '</div>';
  const proofItems = (c.proof || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
  const proof = proofItems ? '<div class="proof" aria-label="' + esc(c.name) + '"><ul>' + proofItems + proofItems + '</ul></div>' : '';
  const services = (c.services || []).map(function (s, i) {
    return '<article class="card reveal d' + ((i % 3) + 1) + '"><span class="n">' + String(i + 1).padStart(2, '0') + '</span><h3>' + esc(s.title) + '</h3>' +
      (s.text ? '<p>' + esc(s.text) + '</p>' : '') + (s.detail ? '<p class="det">' + esc(s.detail) + '</p>' : '') + '</article>';
  }).join('');
  const photos = (c.photos || []).filter(function (p) { return url(p.src); }).slice(0, 6).map(function (p) {
    return '<div class="reveal"><img src="' + url(p.src) + '" alt="' + esc(p.alt) + '" loading="lazy" referrerpolicy="no-referrer"></div>';
  }).join('');
  const L = c.labels || {};
  const qf = { name: L.name, email: L.email, phone: L.phone, need: L.need, send: c.send, status: c.demoStatus, note: c.demoNote };
  const fallbackForm = '<form class="qf">' +
    '<label>' + esc(L.name) + '<input required></label><label>' + esc(L.email) + '<input type="email" required></label>' +
    '<label>' + esc(L.phone) + '<input type="tel"></label><label>' + esc(L.need) + '<textarea required></textarea></label>' +
    '<button class="btn pri" type="submit">' + esc(c.send) + '</button><div class="fine">' + esc(c.demoNote) + '</div></form>';
  const about = c.about ? '<section class="about" id="about"><div class="wrap"><div class="reveal"><span class="eyebrow">' + esc(c.aboutHeading) + '</span><h2>' + esc(c.name) + '</h2></div><p class="lead reveal d1">' + esc(c.about) + '</p></div></section>' : '';
  const contactLinks = (c.phone ? '<a href="tel:' + esc(c.phone.href) + '">' + esc(c.phone.display) + '</a>' : '') +
    (c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : '');

  return '<!DOCTYPE html>\n<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Concept: ' + esc(c.name) + '</title><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="' + b.primary + '">' +
    '<style>' + css(b) + '</style></head>\n' +
    '<body id="top" class="' + (c.phone ? 'has-call' : '') + '">' +
    '<div class="banner" role="note">' + esc(c.banner) + '</div>' +
    '<header class="nav"><div class="wrap">' + brand +
    '<nav aria-label="Main"><a href="#services">' + esc(c.servicesHeading) + '</a>' + (c.about ? '<a href="#about">' + esc(c.aboutHeading) + '</a>' : '') +
    '<a href="#quote">' + esc(c.quoteHeading) + '</a><a href="#contact">' + esc(c.contactHeading) + '</a></nav>' + phone +
    '<a class="btn pri" href="#quote">' + esc(c.quoteButton) + '</a>' +
    '<button class="burger" aria-label="Menu" aria-expanded="false"><span></span></button></div></header>' +
    '<main><section class="hero" style="padding:0"><canvas id="fx" aria-hidden="true"></canvas><div class="wrap">' +
    '<div><span class="kicker reveal">' + esc(c.name) + '</span><h1 class="reveal d1">' + esc(c.headline) + '</h1>' +
    '<p class="intro reveal d2">' + esc(c.intro) + '</p>' + (c.area ? '<p class="area reveal d2">' + esc(c.area) + '</p>' : '') +
    '<div class="ctas reveal d3"><a class="btn pri" href="#quote">' + esc(c.quoteButton) + '</a>' + (c.phone ? '<a class="btn ghost" href="tel:' + esc(c.phone.href) + '">' + esc(c.phone.display) + '</a>' : '') + '</div></div>' +
    hero + '</div></section>' + proof +
    '<section id="services"><div class="wrap"><div class="reveal"><span class="eyebrow">' + esc(c.name) + '</span><h2>' + esc(c.servicesHeading) + '</h2></div>' +
    '<div class="grid">' + services + '</div>' + (photos ? '<div class="photos">' + photos + '</div>' : '') + '</div></section>' +
    about +
    '<section class="quote" id="quote"><div class="wrap"><div class="reveal"><h2>' + esc(c.quoteHeading) + '</h2><p>' + esc(c.quoteIntro) + '</p>' +
    (c.fileTypesLine ? '<p>' + esc(c.fileTypesLine) + '</p>' : '') + (c.replyLine ? '<p>' + esc(c.replyLine) + '</p>' : '') + '</div>' +
    '<div class="reveal d1" id="qf-root">' + fallbackForm + '</div></div></section>' +
    '<section class="contact" id="contact"><div class="wrap"><div class="reveal"><span class="eyebrow">' + esc(c.contactHeading) + '</span></div><div class="reveal d1">' + contactLinks + '</div></div></section></main>' +
    '<footer><div class="wrap">' + esc(c.footer) + '</div></footer>' +
    (c.phone ? '<a class="callbar" href="tel:' + esc(c.phone.href) + '">' + esc(c.callBar) + '</a>' : '') +
    '<script type="application/json" id="qf-data">' + JSON.stringify(qf).replace(/</g, '\\u003c') + '</script>' +
    '<script>' + FX + '</script></body></html>';
}

module.exports = { renderRich };
