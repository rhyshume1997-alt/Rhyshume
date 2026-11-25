// FEEL · spring.ts
// A real spring (mass 1), described the way people tune one: how long it takes to
// feel done (`duration`, seconds) and how much it bounces (`bounce`, 0 = none, 0.3 = playful).
// Same model as SwiftUI's Spring(duration:bounce:): stiffness = (2π/d)², damping ratio = 1 − bounce.
// No dependencies. Used by drag.ts to throw things with the finger's speed, and by
// `node scripts/spring.mjs` to print a CSS linear() curve for a token.
function springAt(t, x0, v0, spec = {}) {
  const d = Math.max(0.05, spec.duration ?? 0.4);
  const zeta = 1 - Math.min(0.9, Math.max(0, spec.bounce ?? 0));
  const w0 = 2 * Math.PI / d;
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const e2 = Math.exp(-zeta * w0 * t);
    const B2 = (v0 + zeta * w0 * x0) / wd;
    const cos = Math.cos(wd * t), sin = Math.sin(wd * t);
    const x = e2 * (x0 * cos + B2 * sin);
    const v = e2 * (-zeta * w0 * (x0 * cos + B2 * sin) + (-x0 * wd * sin + B2 * wd * cos));
    return { x, v };
  }
  const e = Math.exp(-w0 * t);
  const B = v0 + w0 * x0;
  return { x: e * (x0 + B * t), v: e * (B - w0 * (x0 + B * t)) };
}
function springPath(from, to, velocity = 0, spec = {}, step = 1 / 60, rest = 0.5) {
  const x0 = from - to;
  const span = Math.max(Math.abs(x0), 1);
  const restAt = Math.min(rest, span * 2e-3 + 0.01);
  const out = [from];
  let t = 0;
  for (; ; ) {
    t += step;
    const { x, v } = springAt(t, x0, velocity, spec);
    out.push(to + x);
    if (Math.abs(x) < restAt && Math.abs(v) < restAt * 10 || t >= 2) break;
  }
  out[out.length - 1] = to;
  return { points: out, seconds: t };
}
function springCss(spec = {}) {
  const { points, seconds } = springPath(0, 1, 0, spec, 1 / 120, 4e-3);
  const keep = [0];
  for (let i = 1; i < points.length - 1; i++) {
    const k = keep[keep.length - 1], a = points[k], b = points[i + 1];
    let ok = true;
    for (let j = k + 1; j <= i; j++) if (Math.abs(a + (b - a) * (j - k) / (i + 1 - k) - points[j]) > 2e-3) {
      ok = false;
      break;
    }
    if (!ok) keep.push(i);
  }
  keep.push(points.length - 1);
  const n = points.length - 1;
  const parts = keep.map((i, j) => {
    const v = +points[i].toFixed(4);
    if (j === 0 || j === keep.length - 1) return String(v);
    return `${v} ${+(i / n * 100).toFixed(2)}%`;
  });
  return { easing: `linear(${parts.join(", ")})`, ms: Math.round(seconds * 1e3) };
}
export {
  springAt,
  springCss,
  springPath
};
