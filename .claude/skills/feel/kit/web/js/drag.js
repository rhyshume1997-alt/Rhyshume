// FEEL · drag.ts
// Makes an element follow the finger (or mouse) 1:1, resist past its edges like iOS,
// and on release carry the finger's speed into a spring: back to rest, to a snap point,
// or away (dismissed). Grab it mid-flight and it stops where it is.
// No dependencies; works with any framework. For React, see react.ts (useDrag).
//
//   const stop = drag(sheet, { axis: "y", dismiss: 1, handle: grabber, fade: backdrop, onDismiss: close });
//   // later: stop();
import { springPath } from "./spring.js";
const SLOP = 6;
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
function rubber(over, size) {
  const s = Math.sign(over), a = Math.abs(over);
  return s * (1 - 1 / (a * 0.55 / Math.max(size, 1) + 1)) * size;
}
function drag(el, opts = {}) {
  const axis = opts.axis ?? "y";
  const dismiss = opts.dismiss ?? 0;
  const handle = opts.handle ?? el;
  const ignore = opts.ignore ?? "input, textarea, select, [contenteditable=''], [contenteditable='true'], [data-feel-nodrag]";
  const snaps = opts.snaps ?? [];
  const lo = Math.min(opts.min ?? (dismiss === -1 || dismiss === "both" ? -Infinity : 0), ...snaps, 0);
  const hi = Math.max(opts.max ?? (dismiss === 1 || dismiss === "both" ? Infinity : 0), ...snaps, 0);
  const size = () => (axis === "y" ? el.offsetHeight : el.offsetWidth) || 1;
  const show = (o) => o < lo ? lo + rubber(o - lo, size()) : o > hi ? hi + rubber(o - hi, size()) : o;
  let base = "";
  let offset = 0;
  let anim = null;
  let fadeAnim = null;
  let animPath = [];
  let going = null;
  let resume = null;
  let start = null;
  let dragging = false;
  let samples = [];
  let lastFade = 1;
  const write = (o) => {
    const d = show(o);
    el.style.transform = `${base ? base + " " : ""}translate3d(${axis === "x" ? d : 0}px, ${axis === "y" ? d : 0}px, 0)`;
    const dir = dismiss === "both" ? Math.sign(o) || 1 : dismiss || 0;
    const progress = dir ? Math.min(1, Math.max(0, o * dir / size())) : 0;
    if (opts.fade) {
      lastFade = 1 - progress;
      opts.fade.style.opacity = String(lastFade);
    }
    opts.onMove?.(d, progress);
  };
  const halt = () => {
    if (fadeAnim) {
      fadeAnim.cancel();
      fadeAnim = null;
      if (opts.fade) opts.fade.style.opacity = String(lastFade);
    }
    if (!anim) return;
    resume = going;
    const total = Number(anim.effect?.getComputedTiming().duration) || 1;
    const t = Math.min(1, Number(anim.currentTime ?? total) / total);
    const i = Math.min(animPath.length - 1, Math.round(t * (animPath.length - 1)));
    offset = animPath[i] ?? offset;
    anim.cancel();
    anim = null;
    write(offset);
  };
  const release = (to, velocity, done) => {
    going = { to, done };
    if (!done) el.removeAttribute("data-feel-dragged");
    const motion = reduced() ? { duration: 0.2, bounce: 0 } : opts.spring ?? { duration: 0.35, bounce: 0 };
    let { points } = springPath(offset, to, velocity * 1e3, done ? { ...motion, duration: Math.min(motion.duration ?? 0.35, 0.28) } : motion);
    const cut = points.findIndex((p, i) => i > 0 && ((to - offset) * (to - p) <= 0 || Math.abs(to - p) < 24));
    if (done && cut > 0) points = points.slice(0, cut).concat(to);
    animPath = points;
    const frames = points.map((p) => {
      const d = show(p);
      return { transform: `${base ? base + " " : ""}translate3d(${axis === "x" ? d : 0}px, ${axis === "y" ? d : 0}px, 0)` };
    });
    const ms = Math.max(16, (points.length - 1) * (1e3 / 60));
    anim = el.animate(frames, { duration: ms, easing: "linear", fill: "forwards" });
    if (opts.fade) {
      const dir = dismiss === "both" ? Math.sign(to) || 1 : dismiss || 1;
      const end = done ? 0 : 1 - Math.min(1, Math.max(0, to * dir / size()));
      const f = opts.fade.animate([{ opacity: lastFade }, { opacity: end }], { duration: ms, easing: "linear", fill: "forwards" });
      fadeAnim = f;
      f.finished.then(() => {
        if (fadeAnim !== f) return;
        lastFade = end;
        opts.fade.style.opacity = String(end);
        f.cancel();
        fadeAnim = null;
      }).catch(() => {
      });
    }
    const mine = anim;
    mine.finished.then(() => {
      if (anim !== mine) return;
      offset = to;
      write(to);
      anim.cancel();
      anim = null;
      going = null;
      if (to === 0 && !done) {
        el.style.transform = "";
        if (opts.fade) opts.fade.style.opacity = "";
      }
      if (done) done();
      else opts.onSettle?.(to);
    }).catch(() => {
    });
  };
  const onDown = (e) => {
    if (e.button !== 0 || !e.isPrimary) return;
    const target = e.target;
    if (target?.closest?.(ignore)) return;
    if (!anim && !el.style.transform) {
      const t = getComputedStyle(el).transform;
      base = t && t !== "none" ? t : "";
      offset = 0;
    }
    resume = null;
    halt();
    for (const a of el.getAnimations()) if (a !== anim) {
      try {
        if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
      } catch {
      }
    }
    start = { id: e.pointerId, x: e.clientX, y: e.clientY, from: offset };
    dragging = false;
    samples = [{ t: e.timeStamp, p: offset }];
  };
  const scrollerBlocks = (target, delta) => {
    for (let n = target; n && n !== el.parentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      const over = axis === "y" ? cs.overflowY : cs.overflowX;
      const scrolls = (over === "auto" || over === "scroll") && (axis === "y" ? n.scrollHeight > n.clientHeight : n.scrollWidth > n.clientWidth);
      if (scrolls) {
        const pos = axis === "y" ? n.scrollTop : n.scrollLeft;
        const end = axis === "y" ? n.scrollHeight - n.clientHeight : n.scrollWidth - n.clientWidth;
        if (delta > 0 && pos > 0) return true;
        if (delta < 0 && pos < end - 1) return true;
      }
      if (n === el) break;
    }
    return false;
  };
  const carryOn = () => {
    if (!resume) return;
    const r = resume;
    resume = null;
    release(r.to, 0, r.done);
  };
  const onMove = (e) => {
    if (!start || e.pointerId !== start.id) return;
    const along = axis === "y" ? e.clientY - start.y : e.clientX - start.x;
    const across = axis === "y" ? e.clientX - start.x : e.clientY - start.y;
    if (!dragging) {
      if (Math.abs(along) < SLOP && Math.abs(across) < SLOP) return;
      if (Math.abs(across) > Math.abs(along) || scrollerBlocks(e.target, along)) {
        start = null;
        carryOn();
        return;
      }
      dragging = true;
      resume = null;
      try {
        handle.setPointerCapture(e.pointerId);
      } catch {
      }
      el.setAttribute("data-feel-dragging", "");
    }
    offset = start.from + along;
    write(offset);
    samples.push({ t: e.timeStamp, p: offset });
    while (samples.length > 2 && e.timeStamp - samples[0].t > 80) samples.shift();
  };
  const onUp = (e) => {
    if (!start || e.pointerId !== start.id) return;
    const was = dragging;
    start = null;
    dragging = false;
    el.removeAttribute("data-feel-dragging");
    if (!was) {
      carryOn();
      return;
    }
    const eat = (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
    };
    window.addEventListener("click", eat, { capture: true, once: true });
    setTimeout(() => window.removeEventListener("click", eat, { capture: true }), 0);
    const a = samples[0], b = samples[samples.length - 1];
    const fresh = e.timeStamp - b.t < 60;
    const v = fresh && b.t > a.t ? (b.p - a.p) / (b.t - a.t) : 0;
    const distance = opts.distance ?? 0.3, speed = opts.speed ?? 0.45;
    const dir = dismiss === "both" ? Math.sign(offset || v) || 1 : dismiss;
    if (dir && (offset * dir > size() * distance && v * dir > -0.1 || v * dir > speed)) {
      el.setAttribute("data-feel-dragged", "out");
      const away = dir * Math.max(size() + 40, offset * dir + 40);
      release(away, v, () => opts.onDismiss?.());
      return;
    }
    const projected = offset + v * 120;
    const rests = [0, ...snaps];
    const to = rests.reduce((best, s) => Math.abs(s - projected) < Math.abs(best - projected) ? s : best, 0);
    release(to, v);
  };
  const onCancel = (e) => {
    if (!start || e.pointerId !== start.id) return;
    const was = dragging, from = start.from;
    start = null;
    dragging = false;
    el.removeAttribute("data-feel-dragging");
    if (was) release(from, 0);
    else carryOn();
  };
  const onTouchMove = (e) => {
    if (dragging) e.preventDefault();
  };
  const watch = new MutationObserver(() => {
    const open = el.getAttribute("data-state") === "open" || el.getAttribute("data-feel-state") === "open" || el.hasAttribute("open");
    if (open && el.getAttribute("data-feel-dragged") === "out") {
      anim?.cancel();
      anim = null;
      el.removeAttribute("data-feel-dragged");
      el.style.transform = "";
      offset = 0;
      if (opts.fade) opts.fade.style.opacity = "";
    }
  });
  watch.observe(el, { attributes: true, attributeFilter: ["data-state", "data-feel-state", "open"] });
  handle.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onCancel);
  handle.addEventListener("touchmove", onTouchMove, { passive: false });
  if (handle !== el) handle.setAttribute("data-feel-handle", "");
  return () => {
    handle.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    handle.removeEventListener("touchmove", onTouchMove);
    watch.disconnect();
    anim?.cancel();
    fadeAnim?.cancel();
  };
}
export {
  drag
};
