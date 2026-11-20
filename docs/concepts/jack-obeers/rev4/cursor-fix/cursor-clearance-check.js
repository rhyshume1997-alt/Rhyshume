// Sweeps the pointer across the drinks section and checks, frame by frame, that the visible bottle never overlaps readable text or a control.
const {chromium}=require('playwright');const L=require('./lib');
exports.run=async function(p,label){
  await p.evaluate(()=>{
    window.__cv={frames:0,visible:0,viol:[],maxOp:0};
    const skip=e=>e.closest('.info,.vh,.sig-follow,[aria-hidden="true"]:not(.card)')||getComputedStyle(e).visibility==='hidden';
    function targets(){
      const out=[];const root=document.querySelectorAll('#shop,.top');
      root.forEach(r=>{
        const w=document.createTreeWalker(r,NodeFilter.SHOW_TEXT);let n;
        while(n=w.nextNode()){const t=n.textContent.trim();if(!t)continue;const el=n.parentElement;if(!el||el.closest('.info,.vh,[hidden]'))continue;
          const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity===0)continue;
          const rg=document.createRange();rg.selectNodeContents(n);[...rg.getClientRects()].forEach(q=>{if(q.width>1&&q.height>1)out.push({r:q,k:'text:'+t.slice(0,18)})})}
        r.querySelectorAll('button,a,input,select,label,.card,.pw,#detail').forEach(e=>{if(e.closest('.sig-follow'))return;const q=e.getBoundingClientRect();if(q.width>1&&q.height>1)out.push({r:q,k:'ctl:'+(e.id||e.className||e.tagName).toString().slice(0,18)})});
      });return out}
    let i=0,T=[];
    function loop(){
      const f=document.querySelector('.sig-follow');const op=+getComputedStyle(f).opacity;window.__cv.frames++;window.__cv.maxOp=Math.max(window.__cv.maxOp,op);
      if(op>(window.__thr||0.15)){window.__cv.visible++;
        if(i++%2===0)T=targets();
        const q=document.querySelector('.sig-follow image').getBoundingClientRect();
        for(const t of T){const r=t.r;if(q.right>r.left&&q.left<r.right&&q.bottom>r.top&&q.top<r.bottom){window.__cv.viol.push(t.k+' @'+Math.round(q.left)+','+Math.round(q.top)+' op'+op.toFixed(2));break}}}
      requestAnimationFrame(loop)}
    requestAnimationFrame(loop)});
};
exports.read=(p)=>p.evaluate(()=>window.__cv);
