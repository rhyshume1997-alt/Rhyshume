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

function fontName(n) { return /^[A-Za-z0-9 ]{2,30}$/.test(String(n || '')) ? String(n) : ''; }

function css(b, f) {
  const disp = (f.display ? '"' + f.display + '",' : '') + 'Archivo,"Helvetica Neue",Arial,sans-serif';
  const body = (f.body ? '"' + f.body + '",' : '') + '"IBM Plex Sans","Segoe UI",Arial,sans-serif';
  return ':root{--p:' + b.primary + ';--a:' + b.accent + ';--d:' + b.dark + ';--op:' + b.onPrimary + ';--oa:' + b.onAccent + ';--t:' + b.text + ';--disp:' + disp + ';--body:' + body + ';--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace}' + `
:root{--paper:color-mix(in srgb,var(--p) 4%,#fcfbf8);--paper2:color-mix(in srgb,var(--p) 10%,#fcfbf8);--ink:var(--d);--mute:color-mix(in srgb,var(--d) 64%,#fcfbf8);--rule:color-mix(in srgb,var(--d) 18%,#fcfbf8);--lt:color-mix(in srgb,#fcfbf8 90%,var(--d));--ease:cubic-bezier(.16,1,.3,1);--gut:clamp(20px,5vw,72px)}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;font:400 17px/1.6 var(--body);color:var(--ink);background:var(--paper);-webkit-font-smoothing:antialiased}
img{max-width:100%;display:block}a{color:inherit}
.wrap{width:min(1240px,100% - 2*var(--gut));margin:0 auto}
.mono{font-family:var(--mono)}
.banner{background:var(--d);color:var(--lt);font:400 12px/1.4 var(--mono);text-align:center;padding:8px 12px;letter-spacing:.02em}
header.nav{position:sticky;top:0;z-index:30;background:var(--paper);border-bottom:1px solid var(--rule)}
.nav .wrap{display:flex;align-items:center;gap:28px;height:72px}
.brand{font:800 20px/1 var(--disp);letter-spacing:-.02em;text-decoration:none;color:var(--ink);display:flex;align-items:center}
.brand img{height:40px;width:auto;max-width:190px;object-fit:contain}
.nav nav{margin-left:auto;display:flex;gap:30px;align-items:center}
.nav nav a{text-decoration:none;font-size:15px;font-weight:500;color:var(--ink);position:relative;padding:6px 0}
.nav nav a:after,.tlink:after{content:"";position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--a);transform:scaleX(0);transform-origin:left;transition:transform .5s var(--ease)}
.nav nav a:hover:after,.tlink:hover:after{transform:scaleX(1)}
.nav nav a{opacity:.82;transition:transform .4s var(--ease),opacity .4s var(--ease)}
.nav nav a:hover,.nav nav a:focus-visible{transform:translateY(-3px);opacity:1}
.btn{position:relative;overflow:hidden;isolation:isolate;display:inline-flex;align-items:center;justify-content:center;gap:10px;border:0;cursor:pointer;font:600 15px/1 var(--body);letter-spacing:.01em;padding:17px 26px;border-radius:3px;text-decoration:none}
.btn.pri{background:var(--a);color:var(--oa)}
.btn.pri:before{content:"";position:absolute;inset:0;background:var(--d);transform:translateY(101%);transition:transform .5s var(--ease);z-index:-1}
.btn.pri:hover:before,.btn.pri:focus-visible:before{transform:none}
.fl{display:inline-grid;perspective:600px}
.fl i{--dp:.575em;font-style:normal;display:inline-grid;transform-style:preserve-3d;transform:translateZ(calc(var(--dp) * -1));transition:transform .55s var(--ease)}
.fl b{grid-area:1/1;font-weight:inherit;display:inline-flex;align-items:center;justify-content:center;height:1.15em;line-height:1.15em;backface-visibility:hidden;transform:translateZ(var(--dp))}
.fl b+b{transform:rotateX(-90deg) translateZ(var(--dp))}
.btn.pri .fl b+b{color:#fcfbf8}
.btn:hover .fl i,.btn:focus-visible .fl i{transform:translateZ(calc(var(--dp) * -1)) rotateX(90deg)}
.btn.sm{padding:13px 20px;font-size:14px}
.tlink{position:relative;font:500 15px/1 var(--mono);text-decoration:none;color:var(--ink);padding:8px 0}
.phone{font:500 14px/1 var(--mono);text-decoration:none;color:var(--ink)}
.burger{display:none;margin-left:auto;background:none;border:0;width:44px;height:44px;cursor:pointer}
.burger span,.burger span:before,.burger span:after{display:block;width:24px;height:2px;background:var(--ink);position:relative;transition:transform .35s var(--ease),opacity .2s}
.burger span:before,.burger span:after{content:"";position:absolute;left:0}
.burger span:before{top:-7px}.burger span:after{top:7px}
.menu-open .burger span{opacity:0}.menu-open .burger span:before,.menu-open .burger span:after{opacity:1}.menu-open .burger span:before{top:0;transform:rotate(45deg)}.menu-open .burger span:after{top:0;transform:rotate(-45deg)}
.hero{position:relative;overflow:hidden;border-bottom:1px solid var(--rule)}
.floor{position:absolute;inset:0;pointer-events:none;overflow:hidden;color:color-mix(in srgb,var(--d) 26%,var(--paper))}
.floor .fg{position:absolute;top:0;left:0;width:100%;height:100%;opacity:.45;-webkit-mask-image:radial-gradient(ellipse 80% 90% at 72% 70%,#000 20%,transparent 100%);mask-image:radial-gradient(ellipse 80% 90% at 72% 70%,#000 20%,transparent 100%)}
.floor .spot{position:absolute;top:0;left:0;width:340px;height:340px;opacity:0;transition:opacity .4s var(--ease);will-change:transform;-webkit-mask-image:radial-gradient(closest-side,#000,transparent);mask-image:radial-gradient(closest-side,#000,transparent)}
.floor.on .spot{opacity:.85}
.floor .lit{position:absolute;top:0;left:0;color:var(--a);will-change:transform}
.floor .fl2{display:block;width:100%;height:100%}
#fx{position:absolute;inset:0;width:100%;height:100%;opacity:.7;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 40%);mask-image:linear-gradient(90deg,transparent 0,#000 40%)}
.hero .wrap{position:relative;display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:clamp(28px,5vw,80px);align-items:end;padding:clamp(48px,8vw,112px) 0 clamp(48px,7vw,96px)}
.eyebrow{display:flex;align-items:center;gap:12px;font:500 12.5px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;color:var(--t)}
.eyebrow:before{content:"";width:28px;height:2px;background:var(--a)}
h1{font:800 clamp(38px,6.2vw,88px)/.96 var(--disp);letter-spacing:-.035em;margin:22px 0 28px;text-wrap:balance;color:var(--ink)}
h1.long{font-size:clamp(34px,4.9vw,66px);line-height:1}
.hero p.intro{font-size:clamp(17px,1.6vw,20px);color:var(--mute);max-width:32em;margin:0 0 12px}
.hero p.area{font:400 13px/1.4 var(--mono);color:var(--mute);margin:0 0 32px;letter-spacing:.04em;text-transform:uppercase}
.ctas{display:flex;gap:26px;flex-wrap:wrap;align-items:center}
.shot{position:relative;aspect-ratio:4/5;background:var(--paper2);overflow:hidden;border-radius:2px}
.shot img{width:100%;height:100%;object-fit:cover}
.shot.empty{display:grid;place-items:center;color:var(--mute);text-align:center;padding:24px;font:400 13px/1.5 var(--mono);border:1px dashed var(--rule);background:transparent}
.proof{border-bottom:1px solid var(--rule)}
.proof ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap}
.proof li{font:500 12.5px/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;padding:20px 28px 20px 0;margin-right:28px;border-right:1px solid var(--rule);color:var(--ink)}
.proof li:last-child{border-right:0}
section{padding:clamp(64px,9vw,128px) 0}
h2{font:800 clamp(30px,4vw,56px)/1 var(--disp);letter-spacing:-.03em;margin:18px 0 0;text-wrap:balance}
.split{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,8fr);gap:clamp(28px,6vw,96px);align-items:start}
.split .head{position:sticky;top:104px}
.rows{border-bottom:1px solid var(--rule)}
.row{position:relative;display:grid;grid-template-columns:56px minmax(0,1fr) minmax(0,1.2fr);gap:24px;padding:32px 0;border-top:1px solid var(--rule);align-items:baseline}
.row:before{content:"";position:absolute;left:0;top:-1px;height:2px;width:100%;background:var(--a);transform:scaleX(0);transform-origin:left;transition:transform .7s var(--ease)}
.row:hover:before{transform:scaleX(1)}
.row .n{font:400 13px/1 var(--mono);color:var(--mute)}
.row h3{margin:0;font:700 clamp(21px,2.2vw,30px)/1.12 var(--disp);letter-spacing:-.02em;transition:transform .6s var(--ease)}
.row:hover h3{transform:translateX(8px)}
.row p{margin:0;color:var(--mute);font-size:16px}.row p.det{margin-top:8px;font-size:14.5px}
.photos{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));grid-auto-rows:clamp(130px,17vw,250px);gap:12px;margin-top:clamp(40px,6vw,80px)}
.photos div{overflow:hidden;grid-column:span 2;background:var(--paper2)}
.photos div:first-child{grid-column:span 4;grid-row:span 2}
.photos div:only-child{grid-column:span 6;grid-row:span 2}
.photos div:first-child:nth-last-child(2),.photos div:first-child:nth-last-child(2)~div{grid-column:span 3;grid-row:span 2}
.photos img{width:100%;height:100%;object-fit:cover;transition:transform 1s var(--ease)}
.photos div:hover img{transform:scale(1.04)}
.about{background:var(--paper2)}
.about p.lead{font:500 clamp(22px,2.7vw,36px)/1.32 var(--disp);letter-spacing:-.015em;margin:0;max-width:26em;text-wrap:pretty}
.quote{background:var(--d);color:var(--lt)}
.quote .eyebrow{color:var(--lt)}
.quote h2{color:var(--lt)}
.quote .intro{color:color-mix(in srgb,var(--lt) 78%,var(--d));margin:22px 0 0;max-width:28em}
.quote .split{align-items:start}.quote .split .head{top:104px}
form.qf{background:var(--paper);color:var(--ink);padding:clamp(22px,3vw,40px);display:grid;gap:18px;border-radius:3px}
form.qf label{display:grid;gap:8px;font:500 12px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--mute)}
form.qf input,form.qf textarea{font:400 16px/1.4 var(--body);letter-spacing:0;text-transform:none;color:var(--ink);padding:14px 14px;border-radius:3px;border:1px solid var(--rule);background:#fff0}
form.qf input:focus,form.qf textarea:focus{outline:0;border-color:var(--t);box-shadow:0 0 0 3px color-mix(in srgb,var(--a) 30%,transparent)}
form.qf textarea{min-height:120px;resize:vertical}
.fine{font:400 12.5px/1.5 var(--mono);color:var(--mute)}.ok{border-left:2px solid var(--t);padding:6px 0 6px 12px;font-weight:500;color:var(--ink)}
.chg{background:var(--paper2);border-bottom:1px solid var(--rule);padding:clamp(44px,6vw,92px) 0 clamp(36px,5vw,70px)}
.chg .read{margin:30px 0 0;padding:0;font:400 12.5px/1.45 var(--mono)}
.chg .read div{display:grid;grid-template-columns:78px minmax(0,1fr);gap:12px;padding:10px 0;border-top:1px solid var(--rule)}
.chg .read dt{color:var(--mute);text-transform:uppercase;letter-spacing:.08em}
.chg .read dd{margin:0;color:var(--ink)}
.sw{display:inline-block;width:14px;height:14px;margin-right:6px;vertical-align:-2px;border:1px solid var(--rule)}
.sw+.hx{margin-right:14px}
.chg ol{list-style:none;margin:0;padding:0;border-bottom:1px solid var(--rule)}
.chg li{display:grid;grid-template-columns:56px minmax(0,1fr);gap:24px;padding:28px 0;border-top:1px solid var(--rule)}
.chg li .n{font:400 13px/1.6 var(--mono);color:var(--mute)}
.chg li p{margin:0;font:600 clamp(18px,1.9vw,24px)/1.3 var(--disp);letter-spacing:-.015em}
.chg li p.why{margin-top:8px;font:400 15px/1.55 var(--body);letter-spacing:0;color:var(--mute)}
.contact .wrap{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,8fr);gap:clamp(28px,6vw,96px);align-items:end}
.contact .big{font:800 clamp(34px,6.5vw,92px)/1 var(--disp);letter-spacing:-.035em;text-decoration:none;color:var(--ink);display:inline-block;position:relative}
.contact .big:after{content:"";position:absolute;left:0;right:0;bottom:-4px;height:3px;background:var(--a);transform:scaleX(0);transform-origin:left;transition:transform .6s var(--ease)}
.contact .big:hover:after{transform:scaleX(1)}
.contact .mail{display:block;margin-top:22px;font:400 17px/1.3 var(--mono);color:var(--mute);text-decoration:none}
footer{background:var(--d);color:var(--lt);font:400 12.5px/1.5 var(--mono);padding:26px 0;letter-spacing:.03em}
.callbar{display:none}
.evd{padding:clamp(56px,8vw,104px) 0;border-top:1px solid var(--rule);background:var(--paper2)}
.evd h2{font:700 clamp(28px,3.6vw,44px)/1.08 var(--disp);margin:14px 0 10px;color:var(--ink);max-width:18em}
.evd .lede{max-width:42em;color:var(--mute);margin:0 0 34px}
.evd ol{list-style:none;margin:0;padding:0}
.evd li{display:grid;grid-template-columns:48px minmax(0,5fr) minmax(0,6fr);gap:8px clamp(18px,3vw,44px);padding:22px 0;border-top:1px solid var(--rule)}
.evd li .n{font:500 13px/1.6 var(--mono);color:var(--t)}
.evd li h3{font:600 19px/1.3 var(--disp);margin:0;color:var(--ink)}
.evd li .pf{font:400 13px/1.55 var(--mono);color:var(--ink);margin:0 0 8px;padding-left:12px;border-left:2px solid var(--a)}
.evd li .wy{margin:0;color:var(--mute)}
.evd .cmp{margin:40px 0 0;max-width:640px}
.evd .cmp h3{font:600 19px/1.3 var(--disp);margin:0 0 12px}
.evd table{width:100%;table-layout:fixed;border-collapse:collapse;font:400 14px/1.4 var(--body)}
.evd th{font:500 11.5px/1.2 var(--mono);letter-spacing:.1em;text-transform:uppercase;text-align:left;padding:8px 10px 8px 0;border-bottom:1px solid var(--rule);color:var(--t)}
.evd td{padding:9px 10px 9px 0;border-bottom:1px solid var(--rule);color:var(--ink)}
.evd th,.evd td{overflow-wrap:anywhere}
.evd th:first-child{width:44%}
.evd td.no{font-weight:600;color:var(--a)}
.evd .note{margin:26px 0 0;font:400 13px/1.5 var(--mono);color:var(--mute);max-width:52em}
@media(max-width:900px){.evd li{grid-template-columns:34px 1fr}.evd li>div:last-child{grid-column:1 / -1}}
.help{padding:clamp(56px,8vw,104px) 0;border-top:1px solid var(--rule)}
.help h2{font:700 clamp(28px,3.6vw,44px)/1.08 var(--disp);margin:14px 0 10px;color:var(--ink)}
.help .lede{max-width:40em;color:var(--mute);margin:0 0 34px}
.help .hr{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,4fr) minmax(0,4fr);gap:10px clamp(20px,4vw,56px);padding:24px 0;border-top:1px solid var(--rule)}
.help .hr small{display:block;font:500 11.5px/1.2 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--t);margin-bottom:7px}
.help .hr p{margin:0;color:var(--ink)}
.help .hr .k{font:600 18px/1.3 var(--disp)}
.help .note{margin:26px 0 0;font:400 13px/1.5 var(--mono);color:var(--mute);max-width:52em}
@media(max-width:900px){.help .hr{grid-template-columns:1fr}}
.fromrhys{background:var(--paper2);border-top:1px solid var(--rule);padding:34px 0}
.fromrhys .wrap{display:flex;flex-wrap:wrap;gap:14px 34px;align-items:baseline}
.fromrhys p{font:600 19px/1.3 var(--disp);margin:0;color:var(--ink)}
.fromrhys a{font:500 14px/1.3 var(--mono);color:var(--t);text-underline-offset:4px}
.rise{animation:rise 1s var(--ease) both}.r1{animation-delay:.05s}.r2{animation-delay:.18s}.r3{animation-delay:.3s}.r4{animation-delay:.42s}
@keyframes rise{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:none}}
.reveal{opacity:0;transform:translateY(24px);transition:opacity .9s var(--ease),transform .9s var(--ease)}
.reveal.in{opacity:1;transform:none}
.d1{transition-delay:.08s}.d2{transition-delay:.16s}.d3{transition-delay:.24s}
@media (prefers-reduced-motion:reduce){.rise{animation:none}.reveal{opacity:1;transform:none;transition:none}html{scroll-behavior:auto}.row:hover h3{transform:none}.fl i{transition:none}.btn:hover .fl i,.btn:focus-visible .fl i{transform:translateZ(calc(var(--dp) * -1))}.nav nav a{transition:none}.nav nav a:hover{transform:none}.floor .spot{transition:none}}
@media (max-width:900px){
 .burger{display:block}.nav nav{position:absolute;left:0;right:0;top:72px;background:var(--paper);flex-direction:column;align-items:flex-start;gap:0;padding:6px var(--gut) 20px;border-bottom:1px solid var(--rule);display:none}
 .menu-open .nav nav{display:flex}.nav nav a{padding:15px 0;width:100%;font-size:19px;border-bottom:1px solid var(--rule)}.nav nav a:after{display:none}
 .nav .phone,.nav .btn{display:none}.nav nav a{opacity:1}.nav nav a:hover,.nav nav a:focus-visible{transform:none}.chg li{grid-template-columns:40px 1fr;gap:6px 14px;padding:22px 0}.floor{display:none}
 .hero .wrap{grid-template-columns:1fr;align-items:start}.shot{aspect-ratio:16/10}#fx{-webkit-mask-image:none;mask-image:none;opacity:.55}
 .split,.contact .wrap{grid-template-columns:1fr}.split .head{position:static}
 .row{grid-template-columns:40px 1fr;gap:6px 14px;padding:24px 0}.row .t2{grid-column:2}
 .proof li{border-right:0;padding:12px 0;margin:0 22px 0 0}
 .callbar{display:block;position:fixed;left:0;right:0;bottom:0;z-index:40;text-align:center;background:var(--a);color:var(--oa);font:600 16px/1 var(--body);padding:19px;text-decoration:none}
 body.has-call{padding-bottom:58px}
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
  // floor grid: a copy in the firm's accent colour shows through a round window that follows the mouse (transform only)
var fl=document.querySelector('.floor');
if(fl&&!reduce&&window.matchMedia&&window.matchMedia('(hover:hover) and (pointer:fine)').matches){
var hr=fl.parentNode,sp=fl.querySelector('.spot'),lit=fl.querySelector('.lit'),S=340,raf=0;
var fit=function(){lit.style.width=hr.clientWidth+'px';lit.style.height=hr.clientHeight+'px';};
fit();window.addEventListener('resize',fit);
hr.addEventListener('pointermove',function(e){if(e.pointerType!=='mouse')return;cancelAnimationFrame(raf);
raf=requestAnimationFrame(function(){var r=hr.getBoundingClientRect(),x=e.clientX-r.left-S/2,y=e.clientY-r.top-S/2;
sp.style.transform='translate3d('+x+'px,'+y+'px,0)';lit.style.transform='translate3d('+(-x)+'px,'+(-y)+'px,0)';fl.classList.add('on');});});
hr.addEventListener('pointerleave',function(){cancelAnimationFrame(raf);fl.classList.remove('on');});
}
// three.js hero: a slow wireframe contour surface in the firm's own colour, behind the headline
  function hero3d(){
    var cv=document.getElementById('fx'); if(!cv||!window.THREE||reduce) return;
    var T=window.THREE, st=getComputedStyle(document.documentElement);
    var r=new T.WebGLRenderer({canvas:cv,alpha:true,antialias:true});
    var sc=new T.Scene(), cam=new T.PerspectiveCamera(50,1,.1,100); cam.position.set(0,5.5,13); cam.lookAt(0,0,0);
    var cols=window.innerWidth<700?30:56, rows=window.innerWidth<700?18:32;
    var g=new T.PlaneGeometry(44,26,cols,rows); g.rotateX(-Math.PI/2.4);
    var m=new T.Mesh(g,new T.MeshBasicMaterial({color:new T.Color(st.getPropertyValue('--p').trim()),wireframe:true,transparent:true,opacity:.2}));
    sc.add(m);
    var base=g.attributes.position.array.slice(), pos=g.attributes.position;
    function size(){var w=cv.clientWidth,h=cv.clientHeight; if(!w||!h) return; r.setPixelRatio(Math.min(window.devicePixelRatio||1,2)); r.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix();}
    size(); window.addEventListener('resize',size);
    var mx=0; window.addEventListener('pointermove',function(e){mx=(e.clientX/window.innerWidth-.5);});
    var vis=true; if('IntersectionObserver' in window){new IntersectionObserver(function(es){vis=es[0].isIntersecting;}).observe(cv);}
    var t0=performance.now();
    (function loop(){requestAnimationFrame(loop); if(!vis) return;
      var t=(performance.now()-t0)/1000, a=pos.array;
      for(var i=0;i<a.length;i+=3){var x=base[i],z=base[i+2];a[i+1]=base[i+1]+Math.sin(x*.32+t*.5)*Math.cos(z*.4+t*.35)*1.1;}
      pos.needsUpdate=true; m.rotation.y+=(mx*.25-m.rotation.y)*.03;
      r.render(sc,cam);})();
  }
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
        h('button',{className:'btn pri',type:'submit',disabled:sent},h('span',{className:'fl'},h('i',null,h('b',null,d.send),h('b',{'aria-hidden':'true'},d.send)))),
        sent?h('div',{className:'ok',role:'status'},d.status):h('div',{className:'fine'},d.note));
    }
    var node=ReactDOM.createRoot?ReactDOM.createRoot(root):null; if(!node) return;
    root.innerHTML=''; node.render(h(Form));
  }
  function load(src,cb){var s=document.createElement('script');s.src=src;s.async=true;s.onload=function(){cb();};s.onerror=function(){cb(true);};document.head.appendChild(s);}
  var base='https://cdnjs.cloudflare.com/ajax/libs/';
  load(base+'three.js/r128/three.min.js',function(err){if(!err){try{hero3d();}catch(e){}}});
  load(base+'react/18.2.0/umd/react.production.min.js',function(err){ if(err) return;
    load(base+'react-dom/18.2.0/umd/react-dom.production.min.js',function(err2){ if(!err2){try{form();}catch(e){}} }); });
})();
`;

function flip(label) {
  return '<span class="fl"><i><b>' + esc(label) + '</b><b aria-hidden="true">' + esc(label) + '</b></i></span>';
}

// The floor grid behind the hero: the same diamond pattern twice, grey and in the firm's accent colour.
function floorSvg(id, cls) {
  return '<svg class="' + cls + '" width="100%" height="100%" aria-hidden="true"><defs><pattern id="' + id + '" width="84" height="48" patternUnits="userSpaceOnUse"><path d="M0 24L42 0L84 24M0 24L42 48L84 24" fill="none" stroke="currentColor" stroke-width=".8"/></pattern></defs><rect width="100%" height="100%" fill="url(#' + id + ')"/></svg>';
}

// What was read from their site and what changed. Every value comes from the content the engine already checked,
// the colours and fonts found by tools/brand.js, and the change list the engine wrote (points). Nothing is made up.
function changesSection(c, b, fonts, points) {
  const list = (Array.isArray(points) ? points : []).map(function (p) { return String(p || ''); }).filter(Boolean).slice(0, 5);
  if (!list.length) return '';
  const sw = function (hex) { return '<span class="sw" style="background:' + hex + '"></span><span class="hx">' + esc(hex) + '</span>'; };
  const own = fonts.display || fonts.body;
  const nPhotos = (c.heroPhoto ? 1 : 0) + (c.photos || []).length;
  const read = [
    ['Colours', b.found ? sw(b.primary) + sw(b.accent) : 'None found on the site, house colours used'],
    ['Fonts', own ? esc(fonts.display || own) + (fonts.body && fonts.body !== fonts.display ? ', ' + esc(fonts.body) : '') : 'None of their own found, house fonts used'],
    ['Logo', c.logo ? 'Found and used' : 'None found, the name is shown as text'],
    ['Photos', nPhotos ? nPhotos + ' from their site' : 'None found, a marked space is shown'],
    ['Phone', c.phone ? esc(c.phone.display) : 'None found'],
    ['Email', c.email ? esc(c.email) : 'None found'],
    ['Services', (c.services || []).length + ' taken from their pages']
  ].map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>'; }).join('');
  const items = list.map(function (p, i) {
    const cut = p.split(' Why: ');
    return '<li class="reveal"><span class="n">' + String(i + 1).padStart(2, '0') + '</span><div><p>' + esc(cut[0]) + '</p>' + (cut[1] ? '<p class="why">' + esc(cut[1].charAt(0).toUpperCase() + cut[1].slice(1)) + '</p>' : '') + '</div></li>';
  }).join('');
  return '<section class="chg" id="changes"><div class="wrap split"><div class="head reveal"><span class="eyebrow">Built from ' + esc(c.host || c.name) + '</span><h2>What changed</h2><dl class="read">' + read + '</dl></div><ol>' + items + '</ol></div></section>';
}

function niceDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return String(iso || '');
  return Number(m[3]) + ' ' + ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][Number(m[2]) - 1] + ' ' + m[1];
}

function evidenceSection(ev) {
  if (!ev || !Array.isArray(ev.problems) || !ev.problems.length) return '';
  const items = ev.problems.map(function (p, i) {
    return '<li class="reveal"><span class="n">' + String(i + 1).padStart(2, '0') + '</span><div><h3>' + esc(p.issue) + '</h3></div>' +
      '<div><p class="pf">' + esc(p.proof) + '</p><p class="wy">' + esc(p.why) + '</p></div></li>';
  }).join('');
  let cmp = '';
  if (ev.compare && ev.compare.length && ev.compHost) {
    const yn = function (v) { return v ? '<td>Yes</td>' : '<td class="no">No</td>'; };
    cmp = '<div class="cmp reveal"><h3>The same checks on ' + esc(ev.compHost) + '</h3><table><thead><tr><th>Check</th><th>' + esc(ev.host) + '</th><th>' + esc(ev.compHost) + '</th></tr></thead><tbody>' +
      ev.compare.map(function (r) { return '<tr><td>' + esc(r.label) + '</td>' + yn(r.theirs) + yn(r.comp) + '</tr>'; }).join('') + '</tbody></table></div>';
  }
  return '<section class="evd" id="evidence"><div class="wrap"><div class="reveal"><span class="eyebrow">Found on ' + esc(ev.host) + '</span><h2>Problems on your current site you may not know about</h2>' +
    '<p class="lede">Each one below was found by reading the public page source of ' + esc(ev.host) + ' on ' + esc(niceDate(ev.checkedOn)) + '. The proof line shows exactly what was found. Nothing is estimated.</p></div>' +
    '<ol>' + items + '</ol>' + cmp +
    '<p class="note">These checks read page source only. They do not measure your Google ranking or visitor numbers, and fixing them does not guarantee more enquiries. They are the things search engines, phones and AI tools can see straight away.</p></div></section>';
}

function helpSection(c) {
  const area = c.areaLine || '';
  const rows = [];
  rows.push(['Customers look on their phone first',
    c.phone ? 'Your number and a Get a quote button stay at the top of every screen, and on a phone a call bar sits at the bottom.' : 'A Get a quote button stays at the top of every screen, so a visitor on a phone never has to hunt for how to reach you.',
    'Most first visits to a trades or engineering firm now happen on a phone, often on site or between jobs. If calling or asking takes more than one tap, many people give up and try the next firm.']);
  rows.push(['AI assistants answer "who does this near me" before anyone clicks a website',
    'Each service has its own plain line, the headline names the town and area, and your contact details are written as real text, not buried in images or sliders.',
    'People now ask Google AI answers, ChatGPT and similar tools for suppliers. Those tools read clear page text to decide who you are and what you do. Clear text helps them describe you correctly. It does not guarantee a listing.']);
  rows.push(['Buyers with a drawing or photo have to ring or email and wait',
    'A quote form takes drawings and photos in one go and asks only what you need to price the job.',
    'It saves the back and forth and lets you quote from something you can see. In this prototype the form posts nowhere. In a live version it would go straight to your inbox.']);
  rows.push(['Old or thin pages make a visitor wonder if you are still trading',
    'One light, current page with no leftover placeholder text, out of date years or dead links. Everything on it comes from your own site.',
    'A buyer decides in seconds whether you are open and sorted. A site that looks tended supports your price and your reputation before you speak to them.']);
  const body = rows.map(function (r) {
    return '<div class="hr reveal"><div><small>Problem today</small><p class="k">' + esc(r[0]) + '</p></div><div><small>What this prototype does</small><p>' + esc(r[1]) + '</p></div><div><small>Why it matters now</small><p>' + esc(r[2]) + '</p></div></div>';
  }).join('');
  return '<section class="help" id="help"><div class="wrap"><div class="reveal"><span class="eyebrow">For ' + esc(c.name) + '</span><h2>How this helps your business</h2>' +
    '<p class="lede">This is a prototype built from your current site, so you can see the idea. Colours, wording, photos, layout and pages can all be changed to your spec. Tell me what you would like different and I will change it.</p></div>' +
    body + '<p class="note">Nothing here is live and nothing has been published for you. No customer names or private details were added.</p></div></section>';
}

function fromRhys(o) {
  if (!o || !o.cta) return '';
  const link = function (href, label) { return /^(https:|mailto:)/.test(href || '') ? '<a href="' + esc(href) + '">' + esc(label) + '</a>' : ''; };
  return '<section class="fromrhys" id="from-rhys"><div class="wrap"><p>Like it? Reply to my email or book 20 minutes, and we change it to your spec.</p>' +
    link(o.cta.mail, 'Reply by email') + link(o.cta.book, 'Book 20 minutes') + '</div></section>';
}

function renderRich(c, brandIn, points, opts) {
  opts = opts || {};
  const b = Object.assign({ primary: '#1f3a5f', accent: '#c8562a', dark: '#0f1d30', soft: '#eef2f7', ink: '#111827', onPrimary: '#ffffff', onAccent: '#ffffff', text: '#1f3a5f' }, brandIn || {});
  ['primary', 'accent', 'dark', 'soft', 'ink', 'onPrimary', 'onAccent', 'text'].forEach(function (k) { b[k] = hexOk(b[k], '#1f3a5f'); });

  const fonts = { display: fontName(b.fonts && b.fonts.display) || '', body: fontName(b.fonts && b.fonts.body) || '' };
  const fam = function (n) { return 'https://fonts.googleapis.com/css2?family=' + n.replace(/ /g, '+') + ':wght@400;700&display=swap'; };
  const fontLinks = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">' +
    (fonts.display ? '<link rel="stylesheet" href="' + fam(fonts.display) + '">' : '') +
    (fonts.body && fonts.body !== fonts.display ? '<link rel="stylesheet" href="' + fam(fonts.body) + '">' : '');
  const phone = c.phone ? '<a class="phone" href="tel:' + esc(c.phone.href) + '">' + esc(c.phone.display) + '</a>' : '';
  const logo = url(c.logo);
  const brand = '<a class="brand" href="#top" aria-label="' + esc(c.name) + '">' + (logo ? '<img src="' + logo + '" alt="' + esc(c.name) + '" referrerpolicy="no-referrer">' : esc(c.name)) + '</a>';
  const hero = c.heroPhoto && url(c.heroPhoto.src)
    ? '<div class="shot rise r3"><img src="' + url(c.heroPhoto.src) + '" alt="' + esc(c.heroPhoto.alt) + '" referrerpolicy="no-referrer"></div>'
    : '';
  const proofItems = (c.proof || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
  const proof = proofItems ? '<div class="proof" aria-label="' + esc(c.name) + '"><div class="wrap"><ul>' + proofItems + '</ul></div></div>' : '';
  const services = (c.services || []).map(function (s, i) {
    return '<article class="row reveal"><span class="n">' + String(i + 1).padStart(2, '0') + '</span><h3>' + esc(s.title) + '</h3>' +
      '<div class="t2">' + (s.text ? '<p>' + esc(s.text) + '</p>' : '') + (s.detail ? '<p class="det">' + esc(s.detail) + '</p>' : '') + '</div></article>';
  }).join('');
  const photos = (c.photos || []).filter(function (p) { return url(p.src); }).slice(0, 6).map(function (p) {
    return '<div class="reveal"><img src="' + url(p.src) + '" alt="' + esc(p.alt) + '" loading="lazy" referrerpolicy="no-referrer"></div>';
  }).join('');
  const L = c.labels || {};
  const qf = { name: L.name, email: L.email, phone: L.phone, need: L.need, send: c.send, status: c.demoStatus, note: c.demoNote };
  const fallbackForm = '<form class="qf" onsubmit="event.preventDefault();this.querySelector(\'.fine\').textContent=\'' + esc(c.demoStatus).replace(/'/g, '') + '\'">' +
    '<label>' + esc(L.name) + '<input required></label><label>' + esc(L.email) + '<input type="email" required></label>' +
    '<label>' + esc(L.phone) + '<input type="tel"></label><label>' + esc(L.need) + '<textarea required></textarea></label>' +
    '<button class="btn pri" type="submit">' + flip(c.send) + '</button><div class="fine">' + esc(c.demoNote) + '</div></form>';
  const about = c.about ? '<section class="about" id="about"><div class="wrap split"><div class="head reveal"><span class="eyebrow">' + esc(c.aboutHeading) + '</span><h2>' + esc(c.name) + '</h2></div><p class="lead reveal d1">' + esc(c.about) + '</p></div></section>' : '';
  const contactLinks = (c.phone ? '<a class="big" href="tel:' + esc(c.phone.href) + '">' + esc(c.phone.display) + '</a>' : '') +
    (c.email ? '<a class="mail" href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a>' : '');

  return '<!DOCTYPE html>\n<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Concept: ' + esc(c.name) + '</title><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="' + b.primary + '">' +
    fontLinks + '<style>' + css(b, fonts) + '</style></head>\n' +
    '<body id="top" class="' + (c.phone ? 'has-call' : '') + '">' +
    '<div class="banner" role="note">' + esc(opts.cta ? 'Prototype by Rhys Hume, built from your current site. Not live, and every part can be changed to your spec.' : c.banner) + '</div>' +
    '<header class="nav"><div class="wrap">' + brand +
    '<nav aria-label="Main"><a href="#services">' + esc(c.servicesHeading) + '</a>' + (c.about ? '<a href="#about">' + esc(c.aboutHeading) + '</a>' : '') +
    '<a href="#quote">' + esc(c.quoteHeading) + '</a><a href="#contact">' + esc(c.contactHeading) + '</a></nav>' + phone +
    '<a class="btn pri sm" href="#quote">' + flip(c.quoteButton) + '</a>' +
    '<button class="burger" aria-label="Menu" aria-expanded="false"><span></span></button></div></header>' +
    '<main><section class="hero" style="padding:0"><div class="floor" aria-hidden="true">' + floorSvg('fc', 'fg') + '<div class="spot"><div class="lit">' + floorSvg('fcl', 'fl2') + '</div></div></div><canvas id="fx" aria-hidden="true"></canvas><div class="wrap">' +
    '<div><span class="eyebrow rise r1">' + esc(c.name) + '</span><h1 class="rise r2' + (String(c.headline || '').length > 58 ? ' long' : '') + '">' + esc(c.headline) + '</h1>' +
    '<p class="intro rise r3">' + esc(c.intro) + '</p>' + (c.area ? '<p class="area rise r3">' + esc(c.area) + '</p>' : '') +
    '<div class="ctas rise r4"><a class="btn pri" href="#quote">' + flip(c.quoteButton) + '</a>' + (c.phone ? '<a class="tlink" href="tel:' + esc(c.phone.href) + '">' + esc(c.phone.display) + '</a>' : '') + '</div></div>' +
    hero + '</div></section>' + proof + changesSection(c, b, fonts, points) + (opts.cta ? evidenceSection(opts.evidence) + helpSection(c) : '') +
    '<section id="services"><div class="wrap"><div class="split"><div class="head reveal"><span class="eyebrow">' + esc(c.name) + '</span><h2>' + esc(c.servicesHeading) + '</h2></div>' +
    '<div class="rows">' + services + '</div></div>' + (photos ? '<div class="photos">' + photos + '</div>' : '') + '</div></section>' +
    about +
    '<section class="quote" id="quote"><div class="wrap split"><div class="head reveal"><span class="eyebrow">' + esc(c.name) + '</span><h2>' + esc(c.quoteHeading) + '</h2><p class="intro">' + esc(c.quoteIntro) + '</p>' +
    (c.fileTypesLine ? '<p class="intro">' + esc(c.fileTypesLine) + '</p>' : '') + (c.replyLine ? '<p class="intro">' + esc(c.replyLine) + '</p>' : '') + '</div>' +
    '<div class="reveal d1" id="qf-root">' + fallbackForm + '</div></div></section>' +
    '<section class="contact" id="contact"><div class="wrap"><div class="reveal"><span class="eyebrow">' + esc(c.contactHeading) + '</span></div><div class="reveal d1">' + contactLinks + '</div></div></section></main>' +
    fromRhys(opts) +
    '<footer><div class="wrap">' + esc(c.footer) + '</div></footer>' +
    (c.phone ? '<a class="callbar" href="tel:' + esc(c.phone.href) + '">' + esc(c.callBar) + '</a>' : '') +
    '<script type="application/json" id="qf-data">' + JSON.stringify(qf).replace(/</g, '\\u003c') + '</script>' +
    '<script>' + FX + '</script></body></html>';
}

module.exports = { renderRich };
