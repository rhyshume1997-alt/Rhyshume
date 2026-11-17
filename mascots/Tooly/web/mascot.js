/*!
 * Mascot Designer runtime for the web. No dependencies.
 *
 *   <script type="module" src="mascot.js"></script>
 *   <mascot-view src="/mascot/pip" state="idle" style="width:160px"></mascot-view>
 *
 *   const m = document.querySelector("mascot-view");
 *   m.play("celebrate");          // idle appear hello think celebrate oops sleep point love
 *   m.play("point", { side: "left" });
 *   m.poke();                     // a squish, also on tap/click
 *   m.addEventListener("done", e => …)   // a one-shot move finished (e.detail.state)
 *
 * Attributes: src (folder with the pose images + mascot.json), state, side
 * (left|right, for point), poke="off" (no tap reaction), shadow="off",
 * lazy (load the pictures only when it comes near the screen), poses="idle,wave"
 * (load only those pictures; any other pose shows the idle one).
 * Honours prefers-reduced-motion: poses still change, nothing jumps or shakes.
 * The same moves, to the frame, as MascotView.swift.
 */

const MOTION = {"version":1,"ground":0.94,"blend":0.2,"crossfade":0.09,"blink":{"duration":0.13,"every":[3.1,2.4,0.32,4.2,2.9,3.6,0.3,2.2,4.8]},"states":{"idle":{"duration":3.6,"loop":0,"blink":true,"frames":[[0,"idle"]],"tracks":{"sy":[[0,1],[1.8,1.016,"inOut"],[3.6,1,"inOut"]],"sx":[[0,1],[1.8,0.992,"inOut"],[3.6,1,"inOut"]],"rot":[[0,0],[0.9,0.6,"inOut"],[2.7,-0.6,"inOut"],[3.6,0,"inOut"]]}},"appear":{"duration":0.9,"next":"idle","blink":true,"frames":[[0,"idle"]],"tracks":{"opacity":[[0,0],[0.1,1,"out"]],"sy":[[0,0.2],[0.3,1.15,"out"],[0.48,0.92,"inOut"],[0.64,1.04,"inOut"],[0.8,1,"inOut"]],"sx":[[0,0.2],[0.3,0.95,"out"],[0.48,1.08,"inOut"],[0.64,0.98,"inOut"],[0.8,1,"inOut"]],"ty":[[0,0],[0.3,-0.05,"out"],[0.48,0,"in"]]},"fx":[[0.28,"sparkle"]]},"hello":{"duration":2,"next":"idle","blink":true,"frames":[[0,"idle"],[0.14,"wave"],[1.62,"idle"]],"tracks":{"sy":[[0,1],[0.14,0.92,"out"],[0.3,1.06,"out"],[0.46,0.99,"inOut"],[0.6,1,"inOut"],[1.5,1],[1.62,0.95,"in"],[1.78,1.02,"out"],[1.95,1,"inOut"]],"sx":[[0,1],[0.14,1.06,"out"],[0.3,0.96,"out"],[0.46,1.01,"inOut"],[0.6,1,"inOut"],[1.5,1],[1.62,1.04,"in"],[1.78,0.99,"out"],[1.95,1,"inOut"]],"rot":[[0,0],[0.3,-3,"out"],[0.55,3.5,"inOut"],[0.8,-3,"inOut"],[1.05,3,"inOut"],[1.3,-1.5,"inOut"],[1.55,0,"inOut"]],"ty":[[0,0],[0.14,0],[0.3,-0.03,"out"],[0.48,0,"in"]]},"fx":[[0.34,"sparkle"]]},"think":{"duration":2.4,"loop":0,"blink":false,"frames":[[0,"think"]],"tracks":{"ty":[[0,0],[1.2,-0.018,"inOut"],[2.4,0,"inOut"]],"rot":[[0,-1.5],[1.2,1.5,"inOut"],[2.4,-1.5,"inOut"]],"sy":[[0,1],[1.2,1.01,"inOut"],[2.4,1,"inOut"]]},"loopFx":"dots"},"celebrate":{"duration":2.2,"next":"idle","blink":true,"frames":[[0,"idle"],[0.2,"celebrate"],[1.95,"idle"]],"tracks":{"sy":[[0,1],[0.2,0.84,"out"],[0.36,1.12,"out"],[0.56,1.02,"inOut"],[0.74,1.06,"in"],[0.82,0.86,"out"],[0.96,1.05,"out"],[1.1,0.98,"inOut"],[1.24,1,"inOut"],[1.85,1],[1.95,0.96,"in"],[2.1,1,"out"]],"sx":[[0,1],[0.2,1.12,"out"],[0.36,0.92,"out"],[0.56,0.99,"inOut"],[0.74,0.96,"in"],[0.82,1.13,"out"],[0.96,0.97,"out"],[1.1,1.01,"inOut"],[1.24,1,"inOut"],[1.85,1],[1.95,1.03,"in"],[2.1,1,"out"]],"ty":[[0,0],[0.2,0],[0.5,-0.2,"out"],[0.56,-0.205],[0.8,0,"in"],[1,-0.035,"out"],[1.12,0,"in"]],"rot":[[0,0],[0.5,-4,"out"],[0.8,0,"in"],[1,3,"out"],[1.12,0,"in"]]},"fx":[[0.42,"confetti"]]},"oops":{"duration":2.6,"loop":0.8,"blink":false,"frames":[[0,"idle"],[0.08,"oops"]],"tracks":{"sy":[[0,1],[0.08,0.9,"out"],[0.22,1.03,"out"],[0.34,0.97,"inOut"],[0.8,0.97],[1.7,0.985,"inOut"],[2.6,0.97,"inOut"]],"sx":[[0,1],[0.08,1.07,"out"],[0.22,0.98,"out"],[0.34,1.01,"inOut"],[0.8,1.01],[1.7,1.003,"inOut"],[2.6,1.01,"inOut"]],"tx":[[0,0],[0.1,0.03,"out"],[0.2,-0.024,"inOut"],[0.3,0.018,"inOut"],[0.4,-0.012,"inOut"],[0.5,0.006,"inOut"],[0.6,0,"inOut"]],"rot":[[0,0],[0.1,2.5,"out"],[0.2,-2,"inOut"],[0.3,1.5,"inOut"],[0.4,-1,"inOut"],[0.5,0,"inOut"],[0.8,0],[1.7,-1.2,"inOut"],[2.6,0,"inOut"]]}},"sleep":{"duration":4.4,"loop":0,"blink":false,"frames":[[0,"sleep"]],"tracks":{"sy":[[0,1],[2.2,1.03,"inOut"],[4.4,1,"inOut"]],"sx":[[0,1],[2.2,1.012,"inOut"],[4.4,1,"inOut"]],"rot":[[0,0],[2.2,0.8,"inOut"],[4.4,0,"inOut"]]},"loopFx":"zzz"},"point":{"duration":2.4,"loop":0.5,"blink":false,"frames":[[0,"point"]],"tracks":{"sy":[[0,1],[0.1,0.95,"out"],[0.28,1.03,"out"],[0.45,1,"inOut"]],"sx":[[0,1],[0.1,1.04,"out"],[0.28,0.98,"out"],[0.45,1,"inOut"]],"tx":[[0,0],[0.5,0],[0.75,0.02,"out"],[1,0,"inOut"],[1.2,0.012,"out"],[1.4,0,"inOut"],[2.4,0]],"rot":[[0,0],[0.28,2,"out"],[0.5,0,"inOut"],[0.75,2.5,"out"],[1,0,"inOut"],[2.4,0]]}},"love":{"duration":2.4,"loop":0,"blink":false,"frames":[[0,"love"]],"tracks":{"sy":[[0,1],[0.12,1.035,"out"],[0.26,0.995,"inOut"],[0.4,1.025,"out"],[0.6,1,"inOut"],[2.4,1]],"sx":[[0,1],[0.12,1.02,"out"],[0.26,1,"inOut"],[0.4,1.015,"out"],[0.6,1,"inOut"],[2.4,1]],"rot":[[0,-1],[1.2,1,"inOut"],[2.4,-1,"inOut"]]},"loopFx":"hearts"}},"poke":{"duration":0.55,"eyes":[0.03,0.22],"tracks":{"sy":[[0,1],[0.07,0.86,"out"],[0.2,1.07,"out"],[0.32,0.97,"inOut"],[0.44,1.01,"inOut"],[0.55,1,"inOut"]],"sx":[[0,1],[0.07,1.12,"out"],[0.2,0.95,"out"],[0.32,1.02,"inOut"],[0.44,0.995,"inOut"],[0.55,1,"inOut"]]}}};

const EASE = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t),
};
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const mix = (a, b, w) => a + (b - a) * w;
/** Same numbers in Swift: a cheap hash, not Math.random, so every film is identical. */
export const rnd = (i, k = 0) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };

export function track(keys, t, fallback) {
  if (!keys || !keys.length) return fallback;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const span = t1 - t0;
      return span <= 0 ? v1 : mix(v0, v1, (EASE[e] || EASE.linear)(clamp01((t - t0) / span)));
    }
  }
  return keys[keys.length - 1][1];
}

const NEUTRAL = { sx: 1, sy: 1, rot: 0, tx: 0, ty: 0, opacity: 1 };

/** The pure engine: where the mascot is at any moment. Shared by the element and the film renderer. */
export class MascotEngine {
  constructor(motion = MOTION || globalThis.MASCOT_MOTION, seed = 0) {
    if (!motion) throw new Error("Mascot runtime: no movement library");
    this.m = motion;
    // several mascots on one screen don't blink in unison
    this.blinkShift = seed ? rnd(seed, 7) * motion.blink.every.reduce((a, b) => a + b, 0) : 0;
    this.born = null;
    this.s = { name: "idle", start: 0, side: "right", from: null, fromAt: 0, fromPose: null, prevLoopFx: null, poke: -1 };
    this.listeners = [];
  }
  /** Local time inside the current state, with loops folded. */
  local(def, t) {
    if (def.loop === undefined || t < def.duration) return Math.min(t, def.duration);
    const span = def.duration - def.loop;
    return def.loop + ((t - def.loop) % span);
  }
  set(name, now, opts = {}) {
    if (!this.m.states[name]) throw new Error(`Unknown move "${name}". Moves: ${Object.keys(this.m.states).join(", ")}`);
    if (this.born === null) this.born = now;
    const cur = this.born === now && this.s.start === 0 ? null : this.frame(now);
    this.s = {
      name, start: now, side: opts.side || "right",
      from: cur ? { sx: cur.sx, sy: cur.sy, rot: cur.rot, tx: cur.tx, ty: cur.ty, opacity: cur.opacity } : null,
      fromAt: now, fromPose: cur ? cur.pose : null,
      prevLoopFx: cur ? cur.fx.find((f) => f.loop) || null : null,
      poke: this.s.poke,
    };
  }
  poke(now) { this.s.poke = now; }
  frame(now, reduced = false) {
    if (this.born === null) this.born = now;
    let def = this.m.states[this.s.name];
    // One-shots hand over to their next state on their own.
    while (def.loop === undefined && def.next && now - this.s.start >= def.duration) {
      const ended = this.s.name;
      this.s = { ...this.s, name: def.next, start: this.s.start + def.duration, from: null, fromPose: null, prevLoopFx: null };
      def = this.m.states[this.s.name];
      for (const fn of this.listeners) fn(ended);
    }
    const T = now - this.s.start;          // unfolded
    const t = this.local(def, T);          // folded
    const tr = def.tracks || {};
    let f = {
      sx: track(tr.sx, t, 1), sy: track(tr.sy, t, 1), rot: track(tr.rot, t, 0),
      tx: track(tr.tx, t, 0), ty: track(tr.ty, t, 0), opacity: track(tr.opacity, t, 1),
    };
    // Blend out of whatever it was doing.
    const bw = this.s.from ? clamp01((now - this.s.fromAt) / this.m.blend) : 1;
    if (bw < 1) {
      const w = EASE.out(bw);
      for (const k of Object.keys(NEUTRAL)) f[k] = mix(this.s.from[k], f[k], w);
    }
    // A tap: squash and stretch on top.
    let eyes = false;
    const P = this.m.poke, pt = now - this.s.poke;
    if (this.s.poke >= 0 && pt >= 0 && pt < P.duration) {
      f.sy *= track(P.tracks.sy, pt, 1); f.sx *= track(P.tracks.sx, pt, 1);
      eyes = pt >= P.eyes[0] && pt <= P.eyes[1];
    }
    // Which picture, and the one it's fading from.
    const frames = def.frames;
    let i = 0;
    for (let k = 0; k < frames.length; k++) if (frames[k][0] <= (T < def.duration ? T : t)) i = k;
    let pose = frames[i][1];
    const swapAt = frames[i][0];
    let prev = i > 0 ? frames[i - 1][1] : this.s.fromPose;
    let poseMix = T < def.duration || def.loop === undefined ? clamp01((T - swapAt) / this.m.crossfade) : 1;
    if (!prev || prev === pose) { prev = null; poseMix = 1; }
    // Blinks run on their own clock so they don't restart with every move.
    if (pose === "idle" && poseMix === 1 && (eyes || (def.blink && this.blinking(now - this.born)))) pose = "blink";
    // Point to the left = the whole mascot mirrored.
    const flip = this.s.name === "point" && this.s.side === "left" ? -1 : 1;
    f.tx *= flip;
    if (reduced) { f = { ...NEUTRAL, opacity: f.opacity }; poseMix = prev ? clamp01((T - swapAt) / 0.25) : 1; }
    // Effects: one-shots from the timeline, plus the state's loop.
    const fx = [];
    if (!reduced) {
      for (const [at, type] of def.fx || []) if (T >= at && T - at < FX_LIFE[type]) fx.push({ type, t: T - at, alpha: 1 });
      if (def.loopFx) fx.push({ type: def.loopFx, t: T, alpha: clamp01(T / 0.3), loop: true });
      if (this.s.prevLoopFx && this.s.prevLoopFx.type !== def.loopFx && T < 0.3) fx.push({ ...this.s.prevLoopFx, t: this.s.prevLoopFx.t + T, alpha: 1 - T / 0.3, loop: true });
    }
    return { state: this.s.name, pose, prev, poseMix, flip, ...f, fx };
  }
  blinking(g) {
    const B = this.m.blink, every = B.every, cycle = every.reduce((a, b) => a + b, 0);
    let x = (g + this.blinkShift) % cycle, acc = 0;
    for (const d of every) { acc += d; if (x >= acc && x < acc + B.duration) return true; }
    return false;
  }
}

export const FX_LIFE = { sparkle: 0.9, confetti: 1.9, dots: Infinity, zzz: Infinity, hearts: Infinity };

/**
 * Draw the effects. Units: the mascot's box is 1 x 1 (its pose canvas);
 * ctx is already scaled so 1 unit = the box size, origin at the box's top left.
 * meta.anchors: { cx, top, left, right } in box fractions (from the idle pose).
 */
export function drawFx(ctx, fx, meta, colours) {
  const A = meta.anchors;
  for (const e of fx) {
    ctx.save();
    ctx.globalAlpha = e.alpha;
    FX_DRAW[e.type]?.(ctx, e.t, A, colours);
    ctx.restore();
  }
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 ? r * 0.28 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath(); ctx.fill();
}
function heart(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s * 0.1, y + s * 0.25, x - s * 0.5, y + s * 0.05, x - s * 0.5, y - s * 0.18);
  ctx.bezierCurveTo(x - s * 0.5, y - s * 0.45, x - s * 0.15, y - s * 0.52, x, y - s * 0.28);
  ctx.bezierCurveTo(x + s * 0.15, y - s * 0.52, x + s * 0.5, y - s * 0.45, x + s * 0.5, y - s * 0.18);
  ctx.bezierCurveTo(x + s * 0.5, y + s * 0.05, x + s * 0.1, y + s * 0.25, x, y + s * 0.35);
  ctx.fill();
}
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

const FX_DRAW = {
  sparkle(ctx, t, A, C) {
    const pts = [[A.left - 0.03, A.top + 0.06, 0.045, 0], [A.left + 0.05, A.top - 0.05, 0.034, 0.1], [A.left - 0.08, A.top + 0.2, 0.028, 0.2],
                 [A.right + 0.03, A.top + 0.02, 0.03, 0.15]];
    ctx.fillStyle = C.spark;
    for (const [x, y, r, d] of pts) {
      const k = clamp01((t - d) / 0.55);
      if (k <= 0 || k >= 1) continue;
      const s = Math.sin(Math.PI * k);
      star(ctx, x, y, r * (0.4 + 0.8 * s) * s);
    }
  },
  confetti(ctx, t, A, C) {
    const n = 30, ox = A.cx, oy = A.top + 0.04;
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (rnd(i, 1) - 0.5) * 2.4;
      const sp = 0.75 + rnd(i, 2) * 0.75;
      const x = ox + Math.cos(ang) * sp * t + Math.sin(t * 6 + i) * 0.012;
      const y = oy + Math.sin(ang) * sp * t + 1.6 * t * t;
      const life = 1.9;
      const a = t > life - 0.45 ? clamp01((life - t) / 0.45) : 1;
      ctx.globalAlpha = a;
      ctx.fillStyle = C.confetti[i % C.confetti.length];
      ctx.save(); ctx.translate(x, y); ctx.rotate(t * (4 + rnd(i, 3) * 8) + i);
      ctx.scale(1, Math.cos(t * (6 + rnd(i, 4) * 6) + i));
      if (i % 3 === 0) { ctx.beginPath(); ctx.arc(0, 0, 0.011, 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(-0.009, -0.016, 0.018, 0.032);
      ctx.restore();
    }
  },
  dots(ctx, t, A, C) {
    const bx = Math.min(0.98 - 0.22, A.right - 0.08), by = Math.max(0.0, A.top - 0.13);
    const pop = Math.min(1, EASE.out(clamp01(t / 0.25)) * 1.0);
    ctx.translate(bx, by + 0.12); ctx.scale(pop, pop); ctx.translate(-bx, -(by + 0.12));
    ctx.shadowColor = "rgba(0,0,0,0.14)"; ctx.shadowBlur = 0.03; ctx.shadowOffsetY = 0.008;
    ctx.fillStyle = C.bubble;
    rrect(ctx, bx, by, 0.22, 0.11, 0.055); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + 0.03, by + 0.13, 0.017, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(bx + 0.005, by + 0.165, 0.009, 0, Math.PI * 2); ctx.fill();
    ctx.shadowColor = "transparent";
    for (let i = 0; i < 3; i++) {
      const ph = ((t - i * 0.18) % 1.2 + 1.2) % 1.2;
      const k = ph < 0.5 ? Math.sin((ph / 0.5) * Math.PI) : 0;
      ctx.globalAlpha *= 1; ctx.fillStyle = C.ink;
      ctx.globalAlpha = 0.35 + 0.65 * k;
      ctx.beginPath(); ctx.arc(bx + 0.058 + i * 0.052, by + 0.055 - k * 0.014, 0.015, 0, Math.PI * 2); ctx.fill();
    }
  },
  zzz(ctx, t, A, C) {
    ctx.fillStyle = C.ink; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const life = 2.1;
    for (let k = 0; k < 3; k++) {
      const p = ((t - k * 0.7) % life + life) % life;
      if (t - k * 0.7 < 0) continue;
      const u = p / life;
      const a = u < 0.12 ? u / 0.12 : u > 0.65 ? (1 - u) / 0.35 : 1;
      const x = A.right - 0.05 + u * 0.1 + Math.sin(u * 5) * 0.014, y = A.top + 0.06 - u * 0.22;
      const s = 0.065 + u * 0.05;
      ctx.globalAlpha *= 1;
      ctx.save(); ctx.globalAlpha = a * (ctx.globalAlpha || 1);
      ctx.font = `900 ${s}px ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif`;
      ctx.translate(x, y); ctx.rotate(-0.15); ctx.fillText("z", 0, 0); ctx.restore();
    }
  },
  hearts(ctx, t, A, C) {
    ctx.fillStyle = C.heart;
    const life = 1.6;
    for (let k = 0; k < 2; k++) {
      if (t - k * 0.8 < 0) continue;
      const p = ((t - k * 0.8) % life) / life;
      const side = k % 2 ? 1 : -1;
      const x = A.cx + side * 0.17 + Math.sin(p * 6) * 0.015, y = A.top + 0.12 - p * 0.2;
      const a = p < 0.15 ? p / 0.15 : p > 0.6 ? (1 - p) / 0.4 : 1;
      ctx.save(); ctx.globalAlpha = a; heart(ctx, x, y, 0.03 + p * 0.03); ctx.restore();
    }
  },
};

/** Colours for the effects, from the mascot's own palette. */
export function fxColours(meta) {
  const p = meta.colours || {};
  return {
    spark: p.accent || "#FFC93C",
    ink: p.ink || "#2B2B33",
    bubble: "#FFFFFF",
    heart: "#FF4F7B",
    confetti: p.confetti || [p.body || "#FF7A59", "#FFC93C", "#4CC9F0", "#7BD88F", "#FF4F7B", "#FFFFFF"],
  };
}

// ------------------------------------------------------------ the element
const POSES = ["idle", "blink", "wave", "think", "celebrate", "oops", "sleep", "point", "love"];
const reducedQuery = typeof matchMedia !== "undefined" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

export class MascotView extends (typeof HTMLElement !== "undefined" ? HTMLElement : class {}) {
  static clock = () => performance.now() / 1000;   // the film renderer swaps this for a stepped clock
  static all = new Set();
  static count = 0;
  static renderAll() { for (const el of MascotView.all) el.render(); }
  static get observedAttributes() { return ["src", "state", "side"]; }

  constructor() {
    super();
    this.meta = null;
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>
      :host{display:inline-block;position:relative;aspect-ratio:1/1;width:160px;-webkit-tap-highlight-color:transparent;user-select:none}
      .stage{position:absolute;inset:0}
      .shadow{position:absolute;left:50%;height:3.2%;border-radius:50%;background:radial-gradient(closest-side,rgba(20,16,30,.32),rgba(20,16,30,0));transform:translate(-50%,-50%)}
      .body{position:absolute;inset:0;will-change:transform}
      img{position:absolute;inset:0;width:100%;height:100%;opacity:0;pointer-events:none;-webkit-user-drag:none}
      canvas{position:absolute;left:-50%;top:-50%;width:200%;height:200%;pointer-events:none}
    </style><div class="stage" part="stage"><div class="shadow" part="shadow"></div><div class="body"></div><canvas></canvas></div>`;
    this.$body = root.querySelector(".body");
    this.$shadow = root.querySelector(".shadow");
    this.$fx = root.querySelector("canvas");
    this.imgs = {};
    this.addEventListener("pointerdown", () => { if (this.getAttribute("poke") !== "off") this.poke(); });
  }
  get engine() {
    if (!this._engine) {
      this._engine = new MascotEngine(undefined, ++MascotView.count);
      this._engine.listeners.push((ended) => this.dispatchEvent(new CustomEvent("done", { detail: { state: ended } })));
    }
    return this._engine;
  }
  set engine(e) { this._engine = e; }
  connectedCallback() {
    // A framework may have set .state before this element was upgraded.
    if (Object.prototype.hasOwnProperty.call(this, "state")) { const v = this.state; delete this.state; this.play(v); }
    MascotView.all.add(this);
    if (!this.hasAttribute("role")) { this.setAttribute("role", "img"); }
    this.load();
    if (!MascotView.raf && MascotView.clock === MascotView.defaultClock) MascotView.loop();
  }
  disconnectedCallback() { MascotView.all.delete(this); this.io?.disconnect(); this.io = null; }
  attributeChangedCallback(name, old, v) {
    if (name === "src" && old !== v) this.load();
    if ((name === "state" || name === "side") && old !== v && v) this.play(this.getAttribute("state") || "idle", { side: this.getAttribute("side") || "right" });
  }
  async load() {
    const src = (this.getAttribute("src") || "").replace(/\/$/, "");
    if (!src || src === this.loaded) return;
    // lazy: wait until it's near the screen (pages with many mascots)
    if (this.hasAttribute("lazy") && !this.near && typeof IntersectionObserver !== "undefined") {
      if (!this.io) {
        this.io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { this.near = true; this.io.disconnect(); this.load(); } }, { rootMargin: "300px" });
        this.io.observe(this);
      }
      return;
    }
    this.loaded = src;
    try { this.meta = await (await fetch(`${src}/mascot.json`)).json(); }
    catch { this.meta = { anchors: { cx: 0.5, top: 0.3, left: 0.3, right: 0.7 }, shadow: { w: 0.4 }, ext: "webp" }; }
    const ext = this.meta.ext || "webp";
    this.$body.innerHTML = "";
    this.imgs = {};
    // poses="idle,blink,wave": load only those (the rest show the idle picture)
    const want = this.getAttribute("poses") ? [...new Set(["idle", ...this.getAttribute("poses").split(",").map((x) => x.trim())])].filter((x) => POSES.includes(x)) : POSES;
    await Promise.all(want.map((p) => new Promise((res) => {
      const im = new Image();
      im.decoding = "async"; im.alt = ""; im.draggable = false;
      im.onload = res;
      im.onerror = () => { im.remove(); delete this.imgs[p]; res(); }; // a missing pose shows the idle
      im.src = `${src}/${p}.${ext}`;
      this.$body.appendChild(im); this.imgs[p] = im;
    })));
    if (!this.getAttribute("aria-label")) this.setAttribute("aria-label", this.meta.name || "Mascot");
    this.colours = fxColours(this.meta);
    this.ready = true;
    this.dispatchEvent(new Event("ready"));
    this.render();
  }
  get state() { return this.engine.s.name; }
  set state(v) { this.play(v); }
  play(name, opts = {}) { this.engine.set(name, MascotView.clock(), opts); this.render(); return this; }
  poke() { this.engine.poke(MascotView.clock()); }
  render() {
    if (!this.ready) return;
    const reduced = reducedQuery.matches || this.hasAttribute("reduced-motion");
    const f = this.engine.frame(MascotView.clock(), reduced);
    const has = (p) => (p && this.imgs[p] ? p : p ? "idle" : null);
    const cur = has(f.pose), prev = has(f.prev) === cur ? null : has(f.prev);
    for (const [p, im] of Object.entries(this.imgs)) {
      const o = p === cur ? (prev ? f.poseMix : 1) : p === prev ? 1 - f.poseMix : 0;
      im.style.opacity = o;
    }
    const g = (this.meta.ground ?? 0.94) * 100;
    this.$body.style.transformOrigin = `50% ${g}%`;
    this.$body.style.opacity = f.opacity;
    this.$body.style.transform = `translate(${f.tx * 100}%, ${f.ty * 100}%) rotate(${f.rot}deg) scale(${f.sx * f.flip}, ${f.sy})`;
    if (this.meta.shadow && this.getAttribute("shadow") !== "off") {
      const lift = Math.min(0.6, Math.max(0, -f.ty) * 3);
      this.$shadow.style.display = "";
      this.$shadow.style.top = `${g + 0.6}%`;
      this.$shadow.style.width = `${this.meta.shadow.w * 100 * (1 - lift * 0.6) * f.sx}%`;
      this.$shadow.style.opacity = f.opacity * (1 - lift);
      this.$shadow.style.marginLeft = `${f.tx * 100}%`;
    } else this.$shadow.style.display = "none";
    // effects
    const c = this.$fx, box = this.getBoundingClientRect().width || 160, dpr = Math.min(3, window.devicePixelRatio || 1);
    const W = Math.round(box * 2 * dpr);
    if (c.width !== W) { c.width = W; c.height = W; }
    const ctx = c.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, W);
    if (f.fx.length) {
      const u = box * dpr;
      ctx.setTransform(u, 0, 0, u, u * 0.5, u * 0.5);
      drawFx(ctx, f.fx, this.meta, this.colours);
    }
  }
  static loop() {
    MascotView.raf = requestAnimationFrame(() => {
      MascotView.raf = 0;
      if (MascotView.clock !== MascotView.defaultClock) return; // a film is stepping the clock itself
      MascotView.renderAll();
      if (MascotView.all.size) MascotView.loop();
    });
  }
}
MascotView.defaultClock = MascotView.clock;

if (typeof customElements !== "undefined" && !customElements.get("mascot-view")) customElements.define("mascot-view", MascotView);
