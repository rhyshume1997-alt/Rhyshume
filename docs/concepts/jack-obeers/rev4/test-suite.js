const {chromium,devices}=require('playwright');const fs=require('fs');const L=require('./lib');
const AXE=fs.readFileSync('npm-gsap/a/package/axe.min.js','utf8');const out=process.argv[2];const R=[];const ok=(n,v,d)=>{R.push({n,pass:!!v,d:d===undefined?'':d});console.log((v?'PASS ':'FAIL ')+n+(d!==undefined&&d!==''?'  ['+d+']':''))};
const vid=p=>p.evaluate(()=>{const v=document.querySelector('.reel-video');return v?{paused:v.paused,t:v.currentTime,inCard:!!v.closest('li.pw')}:null});
const open=(p,i)=>p.evaluate(i=>{const l=document.querySelectorAll('li.pw')[i];return {open:l.classList.contains('is-open'),on:l.classList.contains('on'),clip:getComputedStyle(l._reel||l).clipPath,info:+getComputedStyle(l.querySelector('.info')).opacity}},i);
const curOp=p=>p.evaluate(()=>+getComputedStyle(document.querySelector('.sig-follow')).opacity);
const toShop=async p=>{await p.evaluate(()=>document.querySelector('#shop').scrollIntoView({behavior:'instant'}));await p.evaluate(()=>scrollBy(0,330));await p.waitForTimeout(500)};
(async()=>{const b=await chromium.launch();
let c=await b.newContext({viewport:{width:1440,height:900}});await L.route(c);let p=await c.newPage();
const errs=[],ext=[],nonget=[],sizes={};p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/404/.test(m.text()))errs.push(m.text())});
p.on('request',r=>{const u=r.url();if(!u.startsWith('http://site.test')&&!u.startsWith('data:'))ext.push(u);if(r.method()!=='GET')nonget.push(u)});
p.on('response',async r=>{try{const bd=await r.body();sizes[r.url().replace('http://site.test/p-5c2e81a7f3b04d96/','')]=bd.length}catch(e){}});
await p.addInitScript(()=>{window.__m={lcp:0,cls:0,lt:[]};new PerformanceObserver(l=>{for(const e of l.getEntries())window.__m.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput){window.__m.cls+=e.value;(window.__m.src=window.__m.src||[]).push(Math.round(e.startTime)+':'+e.value.toFixed(3)+':'+e.sources.map(x=>x.node&&(x.node.id||x.node.className||x.node.tagName)).join(','))}}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())window.__m.lt.push(e.duration)}).observe({type:'longtask',buffered:true})});
await p.goto(L.URL);await p.waitForTimeout(400);
ok('opening: nav and both shop actions visible while it plays',await p.locator('.top-btn').isVisible()&&await p.locator('#top .cta .btn').isVisible()&&await p.locator('.top nav a').first().isVisible());
await p.click('#top .cta .btn');await p.waitForTimeout(150);ok('opening: "Explore the shop" works at 0.4 s (not blocked)',(await p.evaluate(()=>location.hash))==='#shop');
await p.evaluate(()=>scrollTo(0,0));await p.reload();await p.waitForTimeout(1500);
const f1=await p.evaluate(()=>{const v=document.querySelector('#hero-film');return {paused:v.paused,t:v.currentTime,op:+getComputedStyle(v).opacity}});
ok('opening: real pour footage is playing',!f1.paused&&f1.t>0.5&&f1.op===1,JSON.stringify(f1));
await p.waitForTimeout(2200);
ok('opening: timeline 2 to 3 s',await p.evaluate(()=>{const d=Sig.openingTL.duration();return d>=2&&d<=3}),await p.evaluate(()=>Sig.openingTL.duration().toFixed(2)+'s'));
ok('opening: logo plaque stood up, text visible',await p.evaluate(()=>gsap.getProperty('#plaque','rotationX')===0&&+getComputedStyle(document.querySelector('h1')).opacity===1));
ok('opening: footage ends and holds its last frame',await p.evaluate(async()=>{const v=document.querySelector('#hero-film');await new Promise(r=>{if(v.ended)r();else v.addEventListener('ended',r,{once:true})});return v.ended&&v.currentTime>4.9}));
await p.reload();await p.waitForTimeout(500);await p.keyboard.press('Tab');await p.waitForTimeout(100);
ok('opening: any key skips the plaque rise to its end',await p.evaluate(()=>Sig.openingTL.progress()===1));
ok('opening: no floating bottle: the bottle exists only inside the footage, which the stage crops',await p.evaluate(()=>{const s=document.querySelector('#stage');return !s.querySelector('.sig-bottle')&&!s.querySelector('#plate-wrap svg')&&getComputedStyle(s).overflow==='hidden'}));
ok('opening: headline is split into letters but keeps its text for assistive tech',await p.evaluate(()=>{const h=document.querySelector('#h1');return h.getAttribute('aria-label')==='Something good on the shelves'&&h.querySelectorAll('.c').length>20&&[...h.querySelectorAll('.c')].every(c=>c.getAttribute('aria-hidden')==='true')}));
ok('opening: dark stage (mahogany) with cream headline',await p.evaluate(()=>{const lum=c=>{const m=c.match(/\d+/g).map(Number);return (0.2126*m[0]+0.7152*m[1]+0.0722*m[2])/255};const st=getComputedStyle(document.querySelector('#stage')).backgroundColor,h=getComputedStyle(document.querySelector('#h1 .c')).color;return lum(st)<0.1&&lum(h)>0.8}));
// ---- scroll transition ----
await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await p.waitForTimeout(400);
const sc0=await p.evaluate(()=>({carry:document.documentElement.classList.contains('carry'),type:+getComputedStyle(document.querySelector('#type')).opacity,dim:+getComputedStyle(document.querySelector('#dim')).opacity}));
await p.screenshot({path:`${out}/ev-scroll-0.png`});
await p.evaluate(()=>scrollTo({top:330,behavior:'instant'}));await p.waitForTimeout(900);await p.screenshot({path:`${out}/ev-scroll-1.png`});
await p.evaluate(()=>scrollTo({top:640,behavior:'instant'}));await p.waitForTimeout(900);
const sc1=await p.evaluate(()=>({type:+getComputedStyle(document.querySelector('#type')).opacity,dim:+getComputedStyle(document.querySelector('#dim')).opacity,scale:gsap.getProperty('#plate-wrap','scale'),lipTop:Math.round(document.querySelector('.lip').getBoundingClientRect().top)}));
await p.screenshot({path:`${out}/ev-scroll-2.png`});
ok('scroll: stage is pinned and carried (type fades, plate comes closer, room dims, counter lip rises over it)',sc0.carry&&sc0.type===1&&sc0.dim===0&&sc1.type<0.15&&sc1.dim>0.4&&sc1.scale>1.05&&sc1.lipTop<700,JSON.stringify({sc0,sc1}));
await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await p.waitForTimeout(900);
ok('scroll: returns cleanly to the opening',await p.evaluate(()=>+getComputedStyle(document.querySelector('#type')).opacity>0.95&&+getComputedStyle(document.querySelector('#dim')).opacity<0.05));
ok('scroll: the shop catalogue section is on a light surface (not forced dark)',await p.evaluate(()=>{const m=getComputedStyle(document.querySelector('#shop')).backgroundColor.match(/\d+/g).map(Number);return (0.2126*m[0]+0.7152*m[1]+0.0722*m[2])/255>0.8}));
ok('components: photographic Bottle (cut-out image) and Stream, Glass, Liquid exposed',await p.evaluate(()=>{const i=document.querySelector('.sig-follow image.sig-photo');return !!i&&/bottle-amber/.test(i.getAttribute('href'))&&!!(Sig.Stream&&Sig.Glass&&Sig.Liquid&&Sig.Bottle)}));
await toShop(p);
const box=await p.locator('li.pw >> nth=1').boundingBox();
await p.mouse.move(300,520);await p.mouse.move(box.x-260,box.y+60,{steps:10});await p.waitForTimeout(900);
ok('cursor: photographic bottle visible in the drinks section',await curOp(p)>0.9);
ok('cursor: offset from pointer, pointer not covered',await p.evaluate(({x,y})=>{const r=document.querySelector('.sig-follow image').getBoundingClientRect();return !(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)&&r.left>x},{x:box.x-260,y:box.y+60}));
ok('cursor: no cursor:none, pointer-events none, hits go through',await p.evaluate(()=>{const f=document.querySelector('.sig-follow');const r=f.querySelector('image').getBoundingClientRect();const e=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return ![...document.styleSheets].some(s=>[...s.cssRules].some(x=>/cursor:\s*none/.test(x.cssText)))&&getComputedStyle(f).pointerEvents==='none'&&!(e&&f.contains(e))}));
ok('cursor: bottle fades out over shopping controls (tabs, detail panel, add to basket) and returns',await (async()=>{const t=await p.locator('#ct-beer').boundingBox();await p.mouse.move(t.x+10,t.y+8,{steps:6});await p.waitForTimeout(450);const over=await curOp(p);const d=await p.locator('#add').boundingBox();await p.mouse.move(d.x+20,d.y+10,{steps:6});await p.waitForTimeout(450);const over2=await curOp(p);await p.mouse.move(box.x-260,box.y-60,{steps:8});await p.waitForTimeout(700);const back=await curOp(p);return over<0.05&&over2<0.05&&back>0.9})());
// weighted movement: lags behind the pointer, leans against travel, settles
await p.mouse.move(box.x-260,box.y-60);const lag=[];
await p.evaluate(()=>{window.__r=[]});
await p.mouse.move(box.x-110,box.y-60,{steps:6});
const s1=await p.evaluate(()=>({x:gsap.getProperty(document.querySelector('.sig-follow'),'x'),rot:gsap.getProperty(document.querySelector('.sig-follow .sig-pose'),'rotation')}));
await p.waitForTimeout(1500);
const s2=await p.evaluate(()=>({x:gsap.getProperty(document.querySelector('.sig-follow'),'x'),rot:gsap.getProperty(document.querySelector('.sig-follow .sig-pose'),'rotation')}));
ok('cursor: movement lags the pointer and leans while travelling, then settles to its resting angle',s1.x<box.x-110+26-4&&s1.rot>-12.5&&Math.abs(s2.rot+12)<1.5&&Math.abs(s2.x-(box.x-110+26))<2,JSON.stringify({travel:s1,rest:s2}));
// hover film
await p.mouse.move(box.x+box.width/2,box.y+110,{steps:12});await p.waitForTimeout(300);
ok('hover: information visible within 0.3 s',(await open(p,1)).info>0.5);
await p.waitForTimeout(900);
const h=await open(p,1),hv=await vid(p);
ok('hover: window opens and the pour footage plays inside the card',h.open&&hv&&!hv.paused&&hv.t>0.3&&hv.inCard,JSON.stringify({h:h.clip,hv}));
ok('hover: cursor bottle hands off (hidden) while the footage plays',(await curOp(p))<0.05);
await p.screenshot({path:`${out}/ev-hover.png`,clip:{x:Math.max(box.x-260,0),y:box.y-100,width:900,height:470}});
await p.mouse.move(box.x+box.width/2,box.y-80,{steps:6});await p.waitForTimeout(1000);
const hl=await open(p,1),hv2=await vid(p);
ok('leave: window closes, footage paused and removed, information hides',!hl.open&&hl.info<0.1&&(!hv2||hv2.paused||!hv2.inCard),JSON.stringify(hl));
ok('leave: cursor bottle returns',(await curOp(p))>0.9);
// cider and wine
await p.click('#ct-wine');await p.waitForTimeout(300);const wb=await p.locator('li.pw >> nth=0').boundingBox();await p.mouse.move(wb.x+wb.width/2,wb.y+100,{steps:10});await p.waitForTimeout(500);
const wi=await open(p,0);ok('wine: information shows, no pour footage (none supplied)',wi.on&&wi.info>0.5&&!(await vid(p))?.inCard&&(await p.evaluate(()=>!document.querySelector('li.pw .reel'))));
await p.click('#ct-cider');await p.waitForTimeout(300);const cb=await p.locator('li.pw >> nth=0').boundingBox();await p.mouse.move(cb.x+cb.width/2,cb.y+100,{steps:10});await p.waitForTimeout(1000);
ok('cider: footage plays',(await vid(p)).inCard&&!(await vid(p)).paused);
await p.mouse.move(60,200,{steps:8});await p.click('#ct-beer');
ok('category change: clean, no errors',(await p.locator('li.pw.on').count())===0&&errs.length===0,errs.join('|'));
// keyboard
await p.evaluate(()=>{document.activeElement.blur();scrollTo(0,0)});await toShop(p);await p.mouse.move(60,200);await p.focus('#ct-beer');await p.keyboard.press('Tab');await p.waitForTimeout(1100);
const kv=await vid(p);ok('keyboard: focusing a card opens its information and plays the footage',(await open(p,0)).info>0.5&&kv&&kv.inCard&&!kv.paused,JSON.stringify(kv));
await p.keyboard.press('Enter');ok('keyboard: Enter selects it and moves focus to the details',await p.evaluate(()=>document.querySelector('.card[aria-pressed=true]').dataset.id==='b1'&&document.activeElement.id==='detail'));
await p.focus('#ct-beer');await p.keyboard.press('Tab');await p.keyboard.press('Tab');await p.waitForTimeout(500);
ok('keyboard: moving to the next card moves the window with focus',(await open(p,1)).open&&!(await open(p,0)).open);
// toggle static
await p.click('#pour-toggle');ok('toggle: pouring animation can be turned off',(await p.getAttribute('#pour-toggle','aria-pressed'))==='false');
await p.mouse.move(box.x+box.width/2,box.y+110,{steps:6});await p.waitForTimeout(400);
const st=await open(p,1),sv=await vid(p);ok('toggle off: information and still frame show, nothing plays',st.on&&st.info>0.5&&st.open&&(!sv||sv.paused)&&(await curOp(p))<0.05,JSON.stringify(sv));
await p.click('#pour-toggle');
// scroll while open
await p.mouse.move(box.x+box.width/2,box.y+110,{steps:6});await p.waitForTimeout(500);await p.mouse.wheel(0,600);await p.waitForTimeout(600);
ok('scroll while a window is open: closes cleanly, no errors',(await p.locator('li.pw.is-open').count())===0&&errs.length===0,errs.join('|'));
const m=await p.evaluate(()=>window.__m);
const fps=await p.evaluate(()=>new Promise(r=>{const ts=[];let n=0;function f(t){ts.push(t);if(++n<90)requestAnimationFrame(f);else{const d=ts.slice(1).map((x,i)=>x-ts[i]).sort((a,b)=>a-b);r({avg:(1000/(d.reduce((a,b)=>a+b)/d.length)).toFixed(1),p95:d[Math.floor(d.length*.95)].toFixed(1),max:d[d.length-1].toFixed(1)})}}requestAnimationFrame(f)}));
console.log('PERF page',JSON.stringify(m),'idle rAF',JSON.stringify(fps));
const tot=Object.entries(sizes);const kb=k=>Math.round((sizes[k]||0)/1024);
console.log('PERF bytes',JSON.stringify(Object.fromEntries(tot.map(([k,v])=>[k,Math.round(v/1024)+' KB']))),'total',Math.round(tot.reduce((a,[,v])=>a+v,0)/1024)+' KB');
ok('network: no external requests, nothing sent, no storage',ext.length===0&&nonget.length===0&&await p.evaluate(()=>document.cookie===''&&!localStorage.length&&!sessionStorage.length),ext.join(','));
ok('page errors: none',errs.length===0,errs.join('|'));
await c.close();
// pour frame rate
c=await b.newContext({viewport:{width:1440,height:900}});await L.route(c);p=await c.newPage();await p.goto(L.URL);await p.waitForTimeout(3600);await toShop(p);await p.waitForTimeout(500);
const bb=await p.locator('li.pw >> nth=0').boundingBox();await p.mouse.move(300,520);
const rec=p.evaluate(()=>new Promise(r=>{const ts=[];const f=t=>{ts.push(t);if(t-ts[0]<3000)requestAnimationFrame(f);else{const d=ts.slice(1).map((x,i)=>x-ts[i]).sort((a,b)=>a-b);r({frames:ts.length,avgFps:(1000/(d.reduce((a,b)=>a+b)/d.length)).toFixed(1),p95ms:d[Math.floor(d.length*.95)].toFixed(1),maxms:d[d.length-1].toFixed(1)})}};requestAnimationFrame(f)}));
await p.mouse.move(bb.x+bb.width/2,bb.y+100,{steps:30});await p.waitForTimeout(500);await p.mouse.move(bb.x+bb.width+300,bb.y+100,{steps:30});
console.log('PERF during pour+cursor',JSON.stringify(await rec));await c.close();
// reduced motion
c=await b.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});await L.route(c);p=await c.newPage();const e2=[];p.on('pageerror',e=>e2.push(e.message));await p.goto(L.URL);await p.waitForTimeout(500);
ok('reduced motion: no playback, still frame and standing plaque, text visible at once',await p.evaluate(()=>{const v=document.querySelector('#hero-film');return v.paused&&!Sig.openingTL&&getComputedStyle(document.querySelector('h1')).opacity==='1'&&+getComputedStyle(v).opacity===0&&!document.documentElement.classList.contains('sig-wait')}));
ok('reduced motion: nothing animating',await p.evaluate(()=>gsap.globalTimeline.getChildren().filter(t=>t.isActive()).length===0));
await toShop(p);await p.mouse.move(300,500);await p.mouse.move(400,600,{steps:6});await p.waitForTimeout(300);ok('reduced motion: cursor bottle not shown',(await curOp(p))<0.05);
const rb=await p.locator('li.pw >> nth=0').boundingBox();await p.mouse.move(rb.x+60,rb.y+100,{steps:4});await p.waitForTimeout(300);
const rs=await open(p,0),rv=await vid(p);ok('reduced motion: information shows and the still frame appears, no footage plays',rs.info===1&&rs.open&&(!rv||rv.paused)&&(await p.evaluate(()=>!!document.querySelector('li.pw.is-open .reel .still'))));
await p.screenshot({path:`${out}/ev-reduced.png`});ok('reduced motion: no errors',e2.length===0);await c.close();
// no JS
c=await b.newContext({viewport:{width:1440,height:900},javaScriptEnabled:false});await L.route(c);p=await c.newPage();await p.goto(L.URL);
ok('no JS: still frame and standing plaque show, headline visible',await p.locator('#stage .still').isVisible()&&await p.locator('#plaque').isVisible()&&await p.locator('h1').isVisible());await c.close();
// svg fallback
c=await b.newContext({viewport:{width:1440,height:900}});await L.route(c);p=await c.newPage();const e4=[];p.on('pageerror',e=>e4.push(e.message));await p.goto(L.URL+'?pour=svg');await p.waitForTimeout(3600);
ok('fallback (?pour=svg): footage off, drawn pour kept',await p.evaluate(()=>document.documentElement.classList.contains('film-off')&&Sig.film===false));
await toShop(p);const fb=await p.locator('li.pw >> nth=0').boundingBox();await p.mouse.move(300,520);await p.mouse.move(fb.x+fb.width/2,fb.y+100,{steps:10});await p.waitForTimeout(2200);
ok('fallback: drawn glass fills when hovered, information shows',await p.evaluate(()=>{const l=document.querySelectorAll('li.pw')[0];return gsap.getProperty(l._glass.liquid.liquid,'y')===0&&l.classList.contains('on')}));
ok('fallback: no errors',e4.length===0,e4.join('|'));await c.close();
// mobile
const dev=devices['iPhone 13'];c=await b.newContext({...dev});await L.route(c);p=await c.newPage();const e3=[];p.on('pageerror',e=>e3.push(e.message));await p.goto(L.URL);await p.waitForTimeout(3600);
ok('mobile: opening stage above the fold and playing',await p.evaluate(()=>document.querySelector('#stage').getBoundingClientRect().top<innerHeight*0.6&&!document.querySelector('#hero-film').paused));
ok('mobile: custom cursor not visible',(await curOp(p))<0.05);
await toShop(p);await p.evaluate(()=>scrollBy(0,100));
const card=p.locator('li.pw >> nth=1 >> .card');await card.scrollIntoViewIfNeeded();await card.tap();await p.waitForTimeout(1100);
const mo=await open(p,1),mv=await vid(p);
ok('mobile tap: information visible and the pour footage plays in the card',mo.info>0.5&&mo.open&&mv&&!mv.paused&&mv.t>0.2,JSON.stringify(mv));
ok('mobile tap: cursor layer never shown',(await curOp(p))<0.05);
await p.screenshot({path:`${out}/ev-mobile-tap.png`});
ok('mobile tap: product details updated too, no sideways scroll',(await p.textContent('#d-name'))==='Demo Dark Stout'&&await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
ok('mobile: no errors',e3.length===0,e3.join('|'));await c.close();
// axe
for(const [name,url,act] of [['concept (default)',L.URL,null],['concept (card open, footage playing)',L.URL,async p=>{await p.evaluate(()=>document.querySelector('#shop').scrollIntoView());await p.focus('#ct-beer');await p.keyboard.press('Tab');await p.waitForTimeout(1200)}],['design review','http://site.test/p-5c2e81a7f3b04d96/review.html',null],['prototype lab','http://site.test/p-5c2e81a7f3b04d96/lab.html',null]]){
 c=await b.newContext({viewport:{width:1440,height:900}});await L.route(c);p=await c.newPage();await p.goto(url);await p.waitForTimeout(3600);if(act)await act(p);
 await p.evaluate(AXE);const r=await p.evaluate(()=>axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice']}));
 ok('axe '+name+': no violations (WCAG 2.2 AA + best practice)',r.violations.length===0,r.violations.map(v=>v.id+'('+v.nodes.length+')').join(', ')||`${r.passes.length} rules passed`);
 r.violations.forEach(v=>console.log('   ',v.id,v.impact,v.help,v.nodes.slice(0,3).map(n=>n.target.join(' ')).join(' ; ')));await c.close();}
fs.writeFileSync(`${out}/results3.json`,JSON.stringify(R,null,1));console.log(R.filter(r=>!r.pass).length+' failing of '+R.length);await b.close();})();
