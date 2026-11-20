const {chromium,devices}=require('playwright');const fs=require('fs');const L=require('./lib');
const AXE=fs.readFileSync('npm-gsap/a/package/axe.min.js','utf8');const out=process.argv[2];const R=[];const ok=(n,v,d)=>{R.push({n,pass:!!v,d:d===undefined?'':d});console.log((v?'PASS ':'FAIL ')+n+(d!==undefined&&d!==''?'  ['+d+']':''))};
const lvl=(p,i)=>p.evaluate(i=>{const li=document.querySelectorAll('li.pw')[i];return gsap.getProperty(li._glass.liquid.liquid,'y')},i);
(async()=>{const b=await chromium.launch();
// ---------- desktop ----------
let c=await b.newContext({viewport:{width:1440,height:900}});await L.route(c);let p=await c.newPage();
const errs=[],ext=[],nonget=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/404/.test(m.text()))errs.push(m.text())});
p.on('request',r=>{const u=r.url();if(!u.startsWith('http://site.test')&&!u.startsWith('data:'))ext.push(u);if(r.method()!=='GET')nonget.push(u)});
await p.addInitScript(()=>{window.__m={lcp:0,cls:0,lt:[]};new PerformanceObserver(l=>{for(const e of l.getEntries())window.__m.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.__m.cls+=e.value}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())window.__m.lt.push(e.duration)}).observe({type:'longtask',buffered:true})});
const t0=Date.now();await p.goto(L.URL);
// opening does not block: click the primary action at 400ms
await p.waitForTimeout(400);
const hdrBtn=await p.locator('.top-btn').isVisible(), cta=await p.locator('#top .cta .btn').isVisible();
ok('opening: header action and shop CTA visible and enabled while it plays',hdrBtn&&cta);
await p.click('#top .cta .btn');await p.waitForTimeout(150);
ok('opening: clicking "Explore the shop" at 0.4s navigates to #shop (not blocked)',(await p.evaluate(()=>location.hash))==='#shop');
await p.evaluate(()=>scrollTo(0,0));await p.reload();await p.waitForTimeout(3600);
ok('opening: duration 2 to 3 s',await p.evaluate(()=>{const d=Sig.openingTL.duration();return d>=2&&d<=3}),await p.evaluate(()=>Sig.openingTL.duration().toFixed(2)+'s'));
ok('opening: ends in static final state (glass full, bottle standing, logo upright)',await p.evaluate(()=>Math.abs(gsap.getProperty('#sig-stage .sig-liquid','y'))<0.01&&gsap.getProperty('#sig-stage .sig-pose','rotation')===0&&gsap.getProperty('#sig-stage image','rotation')===0));
ok('opening: text content visible after',await p.evaluate(()=>+getComputedStyle(document.querySelector('h1')).opacity===1));
// skip
await p.reload();await p.waitForTimeout(500);await p.keyboard.press('Tab');await p.waitForTimeout(100);
ok('opening: any key skips to the end',await p.evaluate(()=>Sig.openingTL.progress()===1));
// components exist
ok('components: Bottle with separate body, neck, label',await p.evaluate(()=>{const b=document.querySelector('.sig-follow .sig-bottle');return !!(b.querySelector('.sig-body')&&b.querySelector('.sig-neck')&&b.querySelector('.sig-label'))}));
ok('components: Stream, Glass, Liquid exposed and glass liquid uses clipPath',await p.evaluate(()=>!!(Sig.Stream&&Sig.Glass&&Sig.Liquid&&Sig.Bottle)&&!!document.querySelector('.sig-glass g[clip-path]')&&!!document.querySelector('.sig-glass clipPath')));
// cursor
await p.evaluate(()=>document.querySelector('#shop').scrollIntoView({behavior:'instant'}));await p.waitForTimeout(300);
const cursorOpBefore=await p.evaluate(()=>+getComputedStyle(document.querySelector('.sig-follow')).opacity);
const box=await p.locator('li.pw >> nth=1').boundingBox();
await p.mouse.move(300,520);await p.mouse.move(box.x-250,box.y+60,{steps:10});await p.waitForTimeout(700);
ok('cursor: visible inside drinks section on desktop',await p.evaluate(()=>+getComputedStyle(document.querySelector('.sig-follow')).opacity>0.9));
ok('cursor: offset from pointer (does not cover it)',await p.evaluate(({x,y})=>{const r=document.querySelector('.sig-follow .sig-bottle').getBoundingClientRect();return !(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)&&r.left>x-5},{x:box.x-250,y:box.y+60}));
ok('cursor: native pointer left alone (no cursor:none anywhere)',await p.evaluate(()=>![...document.styleSheets].some(s=>[...s.cssRules].some(r=>/cursor:\s*none/.test(r.cssText)))));
ok('cursor: pointer-events none',await p.evaluate(()=>getComputedStyle(document.querySelector('.sig-follow')).pointerEvents==='none'&&getComputedStyle(document.querySelector('.sig-follow svg')).pointerEvents==='none'));
const pt=await p.evaluate(()=>{const r=document.querySelector('.sig-follow .sig-bottle').getBoundingClientRect();const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return e?e.tagName+'.'+(e.className.baseVal??e.className):''});
ok('cursor: elements under the bottle receive hits (it does not intercept)',!/sig-/.test(pt),pt);
await p.mouse.move(box.x+box.width/2,box.y+120,{steps:10});await p.waitForTimeout(250);
ok('hover: product information visible immediately',await p.evaluate(()=>+getComputedStyle(document.querySelectorAll('li.pw')[1].querySelector('.info')).opacity>0.5));
await p.waitForTimeout(1700);
ok('hover: glass filled with liquid',(await lvl(p,1))===0,await lvl(p,1));
ok('hover: foam developed',await p.evaluate(()=>gsap.getProperty(document.querySelectorAll('li.pw')[1]._glass.liquid.foam,'scale')>0.95));
ok('hover: stream stopped after the short pour',await p.evaluate(()=>{const l=document.querySelectorAll('li.pw')[1]._glass.stream.el;return parseFloat(getComputedStyle(l).strokeDashoffset)<0}));
ok('hover: bottle tilted towards the glass',await p.evaluate(()=>Math.abs(gsap.getProperty(document.querySelector('.sig-follow .sig-pose'),'rotation')-100)<1));
const sc=await p.screenshot({path:`${out}/ev-hover.png`,clip:{x:Math.max(box.x-260,0),y:box.y-90,width:900,height:480}});
await p.mouse.move(box.x+box.width/2,box.y-70,{steps:6});await p.waitForTimeout(900);
ok('leave: glass drains and information hides',(await lvl(p,1))===66&&await p.evaluate(()=>+getComputedStyle(document.querySelectorAll('li.pw')[1].querySelector('.info')).opacity<0.1),await lvl(p,1));
ok('leave: bottle returns to follow pose',await p.evaluate(()=>Math.abs(gsap.getProperty(document.querySelector('.sig-follow .sig-pose'),'rotation'))<25));
// click goes through to the product
await p.hover('li.pw >> nth=2');await p.click('li.pw >> nth=2 >> .card');
ok('click: selecting a product opens its detail with cursor active',(await p.textContent('#d-name'))==='Demo Pale Lager');
// category change while hovering
await p.click('#ct-cider');await p.waitForTimeout(300);
ok('category change: no leftover state, no errors',(await p.locator('li.pw.on').count())===0&&errs.length===0);
// outside section hides
await p.evaluate(()=>document.querySelector('#top').scrollIntoView({behavior:'instant'}));await p.mouse.move(700,300,{steps:4});await p.waitForTimeout(500);
ok('cursor: hidden outside the drinks section',await p.evaluate(()=>+getComputedStyle(document.querySelector('.sig-follow')).opacity<0.05));
// keyboard
await p.evaluate(()=>document.querySelector('#shop').scrollIntoView({behavior:'instant'}));await p.click('#ct-beer');await p.focus('#ct-beer');await p.evaluate(()=>{window.__e=[];['focusin','focusout','pointerover','pointerout'].forEach(t=>document.addEventListener(t,e=>{const l=e.target.closest&&e.target.closest('li.pw');if(l)__e.push(t+':'+(l.querySelector('.card').dataset.id)+':'+(e.pointerType||''))},true))});await p.keyboard.press('Tab');
await p.keyboard.press('Tab').catch(()=>{});
const fk=await p.evaluate(()=>document.activeElement.className);console.log('   focus',await p.evaluate(()=>document.activeElement.dataset.id+' on:'+document.querySelectorAll('li.pw.on').length));
ok('keyboard: Tab reaches a product card',/card/.test(fk),fk);
await p.waitForTimeout(1900);console.log('   ev',await p.evaluate(()=>__e.join(' ')));console.log('   y',await p.evaluate(()=>{const li=document.activeElement.closest('li.pw');return li&&gsap.getProperty(li._glass.liquid.liquid,'y')}));
ok('keyboard: focus shows information and fills the glass (same as hover)',await p.evaluate(()=>{const li=document.activeElement.closest('li.pw');return !!li&&li.classList.contains('on')&&gsap.getProperty(li._glass.liquid.liquid,'y')===0}));
await p.keyboard.press('Enter');ok('keyboard: Enter selects the product and moves focus to its details',await p.evaluate(()=>document.querySelector('.card[aria-pressed=true]').dataset.id==='b2'&&document.activeElement.id==='detail'));
await p.keyboard.press('Tab');await p.waitForTimeout(700);
ok('keyboard: moving on resets the previous glass',(await lvl(p,0))===66);
// toggle static alternative
await p.click('#pour-toggle');ok('toggle: animation can be turned off',(await p.getAttribute('#pour-toggle','aria-pressed'))==='false');
await p.hover('li.pw >> nth=0');await p.waitForTimeout(150);
ok('toggle off: info shows and glass state is instant, cursor hidden',await p.evaluate(()=>gsap.getProperty(document.querySelectorAll('li.pw')[0]._glass.liquid.liquid,'y')===0&&+getComputedStyle(document.querySelector('.sig-follow')).opacity<0.05));
// scroll while hovering
await p.click('#pour-toggle');await p.mouse.move(box.x+40,box.y+100,{steps:5});await p.waitForTimeout(700);await p.mouse.wheel(0,500);await p.waitForTimeout(500);
ok('scroll during pour: no errors',errs.length===0,errs.join('|'));
// perf
const m=await p.evaluate(()=>window.__m);
const fps=await p.evaluate(()=>new Promise(r=>{const ts=[];let n=0;function f(t){ts.push(t);if(++n<90)requestAnimationFrame(f);else{const d=ts.slice(1).map((x,i)=>x-ts[i]);d.sort((a,b)=>a-b);r({avg:(1000/(d.reduce((a,b)=>a+b)/d.length)).toFixed(1),p95:d[Math.floor(d.length*.95)].toFixed(1),max:d[d.length-1].toFixed(1)})}}requestAnimationFrame(f)}));
console.log('PERF page',JSON.stringify(m),'idle rAF',JSON.stringify(fps));
ok('network: no external requests',ext.length===0,ext.join(','));ok('network: no non-GET requests (nothing sent)',nonget.length===0);ok('page errors: none',errs.length===0,errs.join('|'));
ok('storage: no cookies, localStorage or sessionStorage',await p.evaluate(()=>document.cookie===''&&!localStorage.length&&!sessionStorage.length));
await c.close();
// ---------- hover-pour frame rate ----------
c=await b.newContext({viewport:{width:1440,height:900}});await L.route(c);p=await c.newPage();await p.goto(L.URL);await p.waitForTimeout(3500);await p.evaluate(()=>document.querySelector('#shop').scrollIntoView({behavior:'instant'}));await p.waitForTimeout(300);
const bb=await p.locator('li.pw >> nth=0').boundingBox();await p.mouse.move(300,520);
const rec=p.evaluate(()=>new Promise(r=>{const ts=[];const f=t=>{ts.push(t);if(t-ts[0]<2600)requestAnimationFrame(f);else{const d=ts.slice(1).map((x,i)=>x-ts[i]).sort((a,b)=>a-b);r({frames:ts.length,avgFps:(1000/(d.reduce((a,b)=>a+b)/d.length)).toFixed(1),p95ms:d[Math.floor(d.length*.95)].toFixed(1),maxms:d[d.length-1].toFixed(1)})}};requestAnimationFrame(f)}));
await p.mouse.move(bb.x+bb.width/2,bb.y+100,{steps:30});await p.waitForTimeout(500);await p.mouse.move(bb.x+bb.width+300,bb.y+100,{steps:30});
console.log('PERF during pour+cursor',JSON.stringify(await rec));await c.close();
// ---------- reduced motion ----------
c=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});await L.route(c);p=await c.newPage();const e2=[];p.on('pageerror',e=>e2.push(e.message));await p.goto(L.URL);await p.waitForTimeout(400);
ok('reduced motion: opening not run, final state shown immediately',await p.evaluate(()=>!Sig.openingTL&&!document.documentElement.classList.contains('sig-wait')&&getComputedStyle(document.querySelector('h1')).opacity==='1'));
ok('reduced motion: nothing animating',await p.evaluate(()=>gsap.globalTimeline.getChildren().filter(t=>t.isActive()).length===0&&document.getAnimations().length===0));
await p.evaluate(()=>document.querySelector('#shop').scrollIntoView({behavior:'instant'}));await p.mouse.move(300,500);await p.mouse.move(400,600,{steps:6});await p.waitForTimeout(300);
ok('reduced motion: cursor bottle not shown',await p.evaluate(()=>+getComputedStyle(document.querySelector('.sig-follow')).opacity<0.05));
ok('reduced motion: toggle starts off',(await p.getAttribute('#pour-toggle','aria-pressed'))==='false');
const bx=await p.locator('li.pw >> nth=0').boundingBox();await p.mouse.move(bx.x+60,bx.y+100,{steps:4});await p.waitForTimeout(150);
ok('reduced motion: information still shows on hover, glass shown full without animation',await p.evaluate(()=>{const li=document.querySelectorAll('li.pw')[0];return +getComputedStyle(li.querySelector('.info')).opacity===1&&gsap.getProperty(li._glass.liquid.liquid,'y')===0}));
ok('reduced motion: no errors',e2.length===0);await p.screenshot({path:`${out}/ev-reduced.png`});await c.close();
// ---------- no JS ----------
c=await b.newContext({viewport:{width:1440,height:900},javaScriptEnabled:false});await L.route(c);p=await c.newPage();await p.goto(L.URL);
ok('no JS: hero scene shows its static finished state',await p.evaluate(()=>true)&&await p.locator('#sig-stage image').count()===1&&await p.locator('h1').isVisible());await c.close();
// ---------- mobile ----------
const dev=devices['iPhone 13'];c=await b.newContext({...dev,reducedMotion:'no-preference'});await L.route(c);p=await c.newPage();const e3=[];p.on('pageerror',e=>e3.push(e.message));await p.goto(L.URL);await p.waitForTimeout(3600);
ok('mobile: opening scene is above the fold',await p.evaluate(()=>document.querySelector('#scene').getBoundingClientRect().top<innerHeight*0.6));
ok('mobile: no custom cursor visible before any tap',await p.evaluate(()=>+getComputedStyle(document.querySelector('.sig-follow')).opacity<0.05));
await p.evaluate(()=>document.querySelector('#shop').scrollIntoView({behavior:'instant'}));await p.waitForTimeout(300);
await p.mouse.move(0,0).catch(()=>{});
const card=p.locator('li.pw >> nth=1 >> .card');await card.scrollIntoViewIfNeeded();await card.tap();await p.waitForTimeout(400);
ok('mobile tap: information visible straight away',await p.evaluate(()=>{const li=document.querySelectorAll('li.pw')[1];return li.classList.contains('on')&&+getComputedStyle(li.querySelector('.info')).opacity>0.5}));
await p.screenshot({path:`${out}/ev-mobile-tap-mid.png`});
await p.waitForTimeout(3200);
ok('mobile tap: glass filled after the pour',(await lvl(p,1))===0);
ok('mobile tap: bottle leaves again and cursor layer hides',await p.evaluate(()=>+getComputedStyle(document.querySelector('.sig-follow')).opacity<0.05),'');
ok('mobile tap: product detail updated too',(await p.textContent('#d-name'))==='Demo Dark Stout');
ok('mobile: no sideways scroll',await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await card.screenshot({path:`${out}/ev-mobile-card.png`});
ok('mobile: no errors',e3.length===0,e3.join('|'));await c.close();
// ---------- axe ----------
for(const [name,url,act] of [['concept (default)',L.URL,null],['concept (card focused + info open)',L.URL,async p=>{await p.evaluate(()=>document.querySelector('#shop').scrollIntoView());await p.focus('li.pw >> nth=0 >> .card');await p.keyboard.press('Shift+Tab');await p.keyboard.press('Tab');await p.waitForTimeout(1800)}],['design review','http://site.test/p-5c2e81a7f3b04d96/review.html',null]]){
 c=await b.newContext({viewport:{width:1440,height:900}});await L.route(c);p=await c.newPage();await p.goto(url);await p.waitForTimeout(3600);if(act)await act(p);
 await p.evaluate(AXE);const r=await p.evaluate(()=>axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}));
 ok('axe '+name+': no violations (WCAG 2.2 AA + best practice)',r.violations.length===0,r.violations.map(v=>v.id+'('+v.nodes.length+')').join(', ')||`${r.passes.length} rules passed`);
 r.violations.forEach(v=>console.log('   ',v.id,v.impact,v.help,v.nodes.slice(0,2).map(n=>n.target.join(' ')).join(' ; ')));
 await c.close();}
fs.writeFileSync(`${out}/results.json`,JSON.stringify(R,null,1));console.log(R.filter(r=>!r.pass).length+' failing of '+R.length);await b.close();})();
