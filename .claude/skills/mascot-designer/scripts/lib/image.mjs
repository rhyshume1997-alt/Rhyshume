// Pixels: clean the matte, line every pose up on one ground line, splice the
// blink into the idle, recolour, find the palette. All in plain JS on raw RGBA
// (sharp only reads, resizes and writes), so it runs the same on every computer.
import fs from "node:fs";
import { sharp } from "./util.mjs";

export const CANVAS = 1024;       // every pose is delivered on the same square
export const GROUND = 0.94;       // feet sit on this line (fraction of the height)

export async function load(file, size = 0) {
  let s = sharp()(file).ensureAlpha();
  if (size) s = s.resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } });
  const { data, info } = await s.raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length) };
}
export async function save(img, file, { webp = false, quality = 90 } = {}) {
  let s = sharp()(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length), { raw: { width: img.w, height: img.h, channels: 4 } });
  s = webp || file.endsWith(".webp") ? s.webp({ quality, alphaQuality: 100, effort: 5 }) : s.png({ compressionLevel: 9 });
  await s.toFile(file);
}
export const blank = (w, h) => ({ w, h, data: new Uint8ClampedArray(w * h * 4) });

// ------------------------------------------------------------ matte
/** True when the picture already has a real transparent background. */
export function hasMatte(img) {
  const { w, h, data } = img;
  let clear = 0, n = 0;
  for (let x = 0; x < w; x += 4) for (const y of [0, h - 1]) { n++; if (data[(y * w + x) * 4 + 3] < 16) clear++; }
  for (let y = 0; y < h; y += 4) for (const x of [0, w - 1]) { n++; if (data[(y * w + x) * 4 + 3] < 16) clear++; }
  return clear / n > 0.9;
}

/**
 * Remove a flat or near-flat backdrop by flooding in from the edges
 * (only when the picture came without transparency).
 */
export function keyBackdrop(img) {
  const { w, h, data } = img;
  const border = [];
  for (let x = 0; x < w; x += 2) border.push(px(img, x, 0), px(img, x, h - 1));
  for (let y = 0; y < h; y += 2) border.push(px(img, 0, y), px(img, w - 1, y));
  const med = [0, 1, 2].map((c) => border.map((p) => p[c]).sort((a, b) => a - b)[border.length >> 1]);
  const dist = (i) => Math.hypot(data[i] - med[0], data[i + 1] - med[1], data[i + 2] - med[2]);
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    const d = dist(p * 4);
    if (d > 38) continue;
    seen[p] = 1;
    // Soft edge: near-backdrop colours fade out instead of cutting.
    data[p * 4 + 3] = d < 18 ? 0 : Math.round(((d - 18) / 20) * 255);
    const x = p % w, y = (p / w) | 0;
    if (x > 0) stack.push(p - 1); if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w); if (y < h - 1) stack.push(p + w);
  }
  return img;
}
const px = (img, x, y) => { const i = (y * img.w + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]]; };

/** Solid body, clean air: alpha near 255 becomes 255, specks of dust become 0, lonely islands go. */
export function cleanMatte(img) {
  const { w, h, data } = img;
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 12) { data[i] = data[i + 1] = data[i + 2] = data[i + 3] = 0; }
    else if (a > 236) data[i + 3] = 255;
  }
  // Drop specks that aren't connected to the character (largest blobs kept).
  const lab = new Int32Array(w * h).fill(-1);
  const sizes = [];
  for (let p = 0; p < w * h; p++) {
    if (lab[p] >= 0 || data[p * 4 + 3] < 40) continue;
    const id = sizes.length; let n = 0; const st = [p]; lab[p] = id;
    while (st.length) {
      const q = st.pop(); n++;
      const x = q % w, y = (q / w) | 0;
      for (const r of [x > 0 ? q - 1 : -1, x < w - 1 ? q + 1 : -1, y > 0 ? q - w : -1, y < h - 1 ? q + w : -1]) {
        if (r >= 0 && lab[r] < 0 && data[r * 4 + 3] >= 40) { lab[r] = id; st.push(r); }
      }
    }
    sizes.push(n);
  }
  const big = Math.max(0, ...sizes);
  for (let p = 0; p < w * h; p++) {
    const l = lab[p];
    if (l >= 0 && sizes[l] < big * 0.004) data[p * 4 + 3] = 0;
    // Faint haze far from any blob (alpha 12..40 not attached) also goes.
    if (l < 0 && data[p * 4 + 3] > 0 && data[p * 4 + 3] < 40) {
      const x = p % w, y = (p / w) | 0;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && lab[yy * w + xx] >= 0 && sizes[lab[yy * w + xx]] >= big * 0.004) { near = true; break; }
      }
      if (!near) data[p * 4 + 3] = 0;
    }
  }
  return img;
}

// ------------------------------------------------------------ measuring
/** Silhouette numbers at a small working size: bbox, the body core (limbs removed), its centre and area. */
export function measure(img, work = 256) {
  const k = img.w / work;
  const W = work, H = Math.round(img.h / k);
  const m = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = Math.min(img.w - 1, Math.round((x + 0.5) * k)), sy = Math.min(img.h - 1, Math.round((y + 0.5) * k));
    m[y * W + x] = img.data[(sy * img.w + sx) * 4 + 3] > 100 ? 1 : 0;
  }
  // bbox from full res (rows with at least a few solid pixels, so a stray hair doesn't count)
  let top = img.h, bot = -1, left = img.w, right = -1;
  for (let y = 0; y < img.h; y++) {
    let n = 0, l = -1, r = -1;
    for (let x = 0; x < img.w; x++) if (img.data[(y * img.w + x) * 4 + 3] > 100) { n++; if (l < 0) l = x; r = x; }
    if (n >= 3) { top = Math.min(top, y); bot = y; left = Math.min(left, l); right = Math.max(right, r); }
  }
  // distance to the background (chamfer), then the core = an opening that removes thin limbs
  const d = chamfer(m, W, H, (v) => v === 0);
  let maxD = 0; for (const v of d) maxD = Math.max(maxD, v);
  const r = Math.max(2, maxD * 0.42);
  const seed = new Uint8Array(W * H); for (let i = 0; i < W * H; i++) seed[i] = d[i] > r ? 1 : 0;
  const d2 = chamfer(seed, W, H, (v) => v === 1);
  let area = 0, cx = 0, cy = 0, cTop = H, cBot = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (m[i] && d2[i] <= r) { area++; cx += x; cy += y; cTop = Math.min(cTop, y); cBot = Math.max(cBot, y); }
  }
  return {
    bbox: { top, bottom: bot, left, right, width: right - left + 1, height: bot - top + 1 },
    core: { area: area * k * k, cx: (cx / Math.max(1, area) + 0.5) * k, cy: (cy / Math.max(1, area) + 0.5) * k, top: cTop * k, bottom: (cBot + 1) * k },
    thickness: maxD * k,
  };
}
function chamfer(m, W, H, isSource) {
  const INF = 1e9, d = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) d[i] = isSource(m[i]) ? 0 : INF;
  const a = 1, b = Math.SQRT2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + a);
    if (y > 0) { v = Math.min(v, d[i - W] + a); if (x > 0) v = Math.min(v, d[i - W - 1] + b); if (x < W - 1) v = Math.min(v, d[i - W + 1] + b); }
    d[i] = v;
  }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
    const i = y * W + x; let v = d[i];
    if (x < W - 1) v = Math.min(v, d[i + 1] + a);
    if (y < H - 1) { v = Math.min(v, d[i + W] + a); if (x < W - 1) v = Math.min(v, d[i + W + 1] + b); if (x > 0) v = Math.min(v, d[i + W - 1] + b); }
    d[i] = v;
  }
  return d;
}

// ------------------------------------------------------------ placing
/** Draw src scaled by s with its point (ax, ay) landing on (tx, ty) of a new canvas. Bilinear. */
export function place(src, s, ax, ay, tx, ty, W = CANVAS, H = CANVAS) {
  const out = blank(W, H), o = out.data, d = src.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = (x - tx) / s + ax - 0.5 / s, sy = (y - ty) / s + ay - 0.5 / s;
    if (sx < -1 || sy < -1 || sx > src.w || sy > src.h) continue;
    const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
    let r = 0, g = 0, b = 0, a = 0;
    for (const [xx, yy, wgt] of [[x0, y0, (1 - fx) * (1 - fy)], [x0 + 1, y0, fx * (1 - fy)], [x0, y0 + 1, (1 - fx) * fy], [x0 + 1, y0 + 1, fx * fy]]) {
      if (xx < 0 || yy < 0 || xx >= src.w || yy >= src.h || wgt === 0) continue;
      const i = (yy * src.w + xx) * 4, al = d[i + 3] * wgt;
      r += d[i] * al; g += d[i + 1] * al; b += d[i + 2] * al; a += al;
    }
    if (a > 0) { const i = (y * W + x) * 4; o[i] = r / a; o[i + 1] = g / a; o[i + 2] = b / a; o[i + 3] = a; }
  }
  return out;
}

/**
 * Line up a set of poses: one shared scale, feet on the ground line, body
 * cores centred. `poses` = { id: img }, `masterId` sets the size.
 * Returns { id: img on the CANVAS } plus the numbers used.
 */
export function align(poses, masterId = "idle") {
  const ms = {};
  for (const [id, img] of Object.entries(poses)) ms[id] = measure(img);
  const M = ms[masterId];
  // Per-pose scale correction: the image model sometimes draws a pose a little
  // bigger or smaller. Bodies are compared by their core (limbs removed).
  const corr = {};
  for (const [id, m] of Object.entries(ms)) {
    let c = Math.sqrt(M.core.area / Math.max(1, m.core.area));
    if (id === "sleep" || Math.abs(1 - c) < 0.035 || Math.abs(1 - c) > 0.2) c = 1; // sitting changes the core; big gaps are real pose changes
    corr[id] = c;
  }
  // One global scale: the master stands about 64% of the canvas tall, then shrink if any pose would leave the frame.
  let S = (CANVAS * 0.64) / M.bbox.height;
  const margin = CANVAS * 0.03;
  for (const [id, m] of Object.entries(ms)) {
    const s = S * corr[id];
    const top = CANVAS * GROUND - (m.bbox.bottom - m.bbox.top) * s;
    const halfL = (m.core.cx - m.bbox.left) * s, halfR = (m.bbox.right - m.core.cx) * s;
    const fit = Math.min(
      top < margin ? (CANVAS * GROUND - margin) / ((m.bbox.bottom - m.bbox.top) * s) : 1,
      halfL > CANVAS / 2 - margin ? (CANVAS / 2 - margin) / halfL : 1,
      halfR > CANVAS / 2 - margin ? (CANVAS / 2 - margin) / halfR : 1,
    );
    if (fit < 1) S *= fit;
  }
  const out = {}, info = {};
  for (const [id, m] of Object.entries(ms)) {
    const s = S * corr[id];
    out[id] = place(poses[id], s, m.core.cx, m.bbox.bottom, CANVAS / 2, CANVAS * GROUND);
    info[id] = { scale: +s.toFixed(4), correction: +corr[id].toFixed(3) };
  }
  return { images: out, info };
}

// ------------------------------------------------------------ blink
/**
 * Make the blink frame from the idle: find where the blink picture differs
 * (the eyes), and paste only that part onto the idle, feathered. Both must
 * already be aligned on the canvas. Falls back to the whole blink picture
 * when the model changed too much to splice cleanly.
 */
export function spliceBlink(idle, blinkImg) {
  const { w, h } = idle;
  // Fine registration: try small shifts of the blink so silhouettes overlap best.
  let best = { dx: 0, dy: 0, err: Infinity };
  for (let dy = -10; dy <= 10; dy += 2) for (let dx = -10; dx <= 10; dx += 2) {
    let err = 0;
    for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) {
      const yy = y - dy, xx = x - dx;
      const a = idle.data[(y * w + x) * 4 + 3] > 128;
      const b = yy >= 0 && xx >= 0 && yy < h && xx < w && blinkImg.data[(yy * w + xx) * 4 + 3] > 128;
      if (a !== b) err++;
    }
    if (err < best.err) best = { dx, dy, err };
  }
  const shifted = place(blinkImg, 1, 0, 0, best.dx, best.dy, w, h);
  // Where do they differ inside the body (away from the outline)?
  const m = measure(idle);
  const diff = new Uint8Array(w * h);
  const inset = Math.max(6, Math.round(m.thickness * 0.08));
  const solid = erodeAlpha(idle, inset);
  let n = 0;
  for (let p = 0; p < w * h; p++) {
    if (!solid[p]) continue;
    const i = p * 4;
    const dd = Math.abs(idle.data[i] - shifted.data[i]) + Math.abs(idle.data[i + 1] - shifted.data[i + 1]) + Math.abs(idle.data[i + 2] - shifted.data[i + 2]);
    if (dd > 70) { diff[p] = 1; n++; }
  }
  // Keep the strong, eye-sized blobs in the upper part of the body.
  const blobs = components(diff, w, h).filter((b) => b.n > 40 && b.cy < m.bbox.top + m.bbox.height * 0.8);
  blobs.sort((a, b) => b.n - a.n);
  const eyes = blobs.slice(0, 3);
  const bodyArea = m.core.area || 1;
  const eyeArea = eyes.reduce((s, b) => s + (b.x1 - b.x0) * (b.y1 - b.y0), 0);
  if (!eyes.length || eyeArea > bodyArea * 0.22) return { img: shifted, spliced: false, shift: best };
  // One feathered window per eye (the snout or beak between them stays the idle's).
  const pad = Math.round(m.thickness * 0.06) + 5, feather = pad + 6;
  const out = { w, h, data: new Uint8ClampedArray(idle.data) };
  const wins = eyes.slice(0, 2).map((b) => ({ x0: b.x0 - pad, y0: b.y0 - pad, x1: b.x1 + pad, y1: b.y1 + pad }));
  for (const { x0, y0, x1, y1 } of wins) {
    for (let y = Math.max(0, y0 - feather); y < Math.min(h, y1 + feather); y++) for (let x = Math.max(0, x0 - feather); x < Math.min(w, x1 + feather); x++) {
      const ex = Math.max(0, x0 - x, x - x1), ey = Math.max(0, y0 - y, y - y1);
      const t = Math.max(0, 1 - Math.hypot(ex, ey) / feather);
      if (t <= 0) continue;
      const i = (y * w + x) * 4;
      if (idle.data[i + 3] < 200 || shifted.data[i + 3] < 200) continue; // never touch the outline
      for (let c = 0; c < 3; c++) out.data[i + c] = Math.max(out.data[i + c] * (1 - t) + shifted.data[i + c] * t, 0);
    }
  }
  return { img: out, spliced: true, shift: best, windows: wins };
}
function erodeAlpha(img, r) {
  const { w, h } = img;
  const m = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) m[p] = img.data[p * 4 + 3] > 200 ? 1 : 0;
  const d = chamfer(m, w, h, (v) => v === 0);
  const out = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) out[p] = d[p] > r ? 1 : 0;
  return out;
}
function components(m, w, h) {
  const lab = new Int32Array(w * h).fill(-1), out = [];
  for (let p = 0; p < w * h; p++) {
    if (!m[p] || lab[p] >= 0) continue;
    const id = out.length, st = [p]; lab[p] = id;
    const b = { n: 0, x0: w, y0: h, x1: 0, y1: 0, sy: 0 };
    while (st.length) {
      const q = st.pop(), x = q % w, y = (q / w) | 0;
      b.n++; b.sy += y; b.x0 = Math.min(b.x0, x); b.y0 = Math.min(b.y0, y); b.x1 = Math.max(b.x1, x); b.y1 = Math.max(b.y1, y);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const r = yy * w + xx; if (m[r] && lab[r] < 0) { lab[r] = id; st.push(r); }
      }
    }
    b.cy = b.sy / b.n; out.push(b);
  }
  return out;
}

// ------------------------------------------------------------ colour
export function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
export function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
export const hex = (rgb) => "#" + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
export const unhex = (s) => { const m = String(s).replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i); if (!m) throw new Error(`Not a colour: ${s}`); return [1, 2, 3].map((i) => parseInt(m[i], 16)); };
const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

/**
 * The body colour, as the most common clearly coloured hue (eyes, whites and
 * shadows don't count). Returns { hex, h, s, l }.
 */
export function bodyColour(img) {
  const bins = new Float64Array(36), acc = Array.from({ length: 36 }, () => [0, 0, 0, 0]);
  const { data } = img;
  let grey = [0, 0, 0, 0];
  for (let i = 0; i < data.length; i += 16) {
    if (data[i + 3] < 250) continue;
    const [h, s, l] = rgb2hsl(data[i], data[i + 1], data[i + 2]);
    if (l < 0.12 || l > 0.97) continue;
    if (s < 0.14) { grey[0]++; grey[1] += data[i]; grey[2] += data[i + 1]; grey[3] += data[i + 2]; continue; }
    const b = Math.floor(h / 10) % 36;
    bins[b] += 1; acc[b][0]++; acc[b][1] += data[i]; acc[b][2] += data[i + 1]; acc[b][3] += data[i + 2];
  }
  let best = 0; for (let b = 0; b < 36; b++) if (bins[b] + bins[(b + 1) % 36] > bins[best] + bins[(best + 1) % 36]) best = b;
  const pick = [acc[best], acc[(best + 1) % 36]].reduce((s, a) => [s[0] + a[0], s[1] + a[1], s[2] + a[2], s[3] + a[3]], [0, 0, 0, 0]);
  const colouredN = pick[0];
  // A white or grey mascot: the body colour is that grey.
  const src = grey[0] > colouredN * 1.4 ? grey : pick;
  const rgb = [src[1] / src[0], src[2] / src[0], src[3] / src[0]];
  const [h, s, l] = rgb2hsl(...rgb);
  return { hex: hex(rgb), h: +h.toFixed(1), s: +s.toFixed(3), l: +l.toFixed(3) };
}

/** A small palette (up to 5 colours, biggest first) for the sheet and the demo app's theme. */
export function palette(img, k = 5) {
  // Distinct colours: cluster finely, then keep the biggest ones that differ clearly,
  // so a blue body with a mint lamp shows the mint, not five blues.
  const many = paletteRaw(img, 10);
  const out = [];
  for (const c of many) {
    const L = rgb2lab(...unhex(c.hex));
    if (out.every((o) => { const M = rgb2lab(...unhex(o.hex)); return Math.hypot(L[0] - M[0], L[1] - M[1], L[2] - M[2]) > 22; })) out.push(c);
    if (out.length === k) break;
  }
  // The accent: a small but vivid detail of another hue (a lamp, a sprout, a backpack) belongs in it.
  const bins = Array.from({ length: 36 }, () => [0, 0, 0, 0]); let total = 0;
  for (let i = 0; i < img.data.length; i += 8) {
    if (img.data[i + 3] < 250) continue; total++;
    const [h, s, l] = rgb2hsl(img.data[i], img.data[i + 1], img.data[i + 2]);
    if (s < 0.45 || l < 0.2 || l > 0.85) continue;
    const b = bins[Math.floor(h / 10) % 36]; b[0]++; b[1] += img.data[i]; b[2] += img.data[i + 1]; b[3] += img.data[i + 2];
  }
  const mainH = out.length ? rgb2hsl(...unhex(out[0].hex))[0] : 0;
  let best = null;
  bins.forEach((b, j) => { if (b[0] / Math.max(1, total) > 0.0015 && hueGap(j * 10 + 5, mainH) > 45 && (!best || b[0] > best[0])) best = b; });
  if (best) {
    const acc = { hex: hex([best[1] / best[0], best[2] / best[0], best[3] / best[0]]), share: +(best[0] / total).toFixed(3) };
    const L = rgb2lab(...unhex(acc.hex));
    if (out.every((o) => { const M = rgb2lab(...unhex(o.hex)); return Math.hypot(L[0] - M[0], L[1] - M[1], L[2] - M[2]) > 22; })) {
      if (out.length >= k) out.pop();
      out.splice(Math.min(2, out.length), 0, acc);
    }
  }
  return out;
}
function paletteRaw(img, k) {
  const pts = [];
  for (let i = 0; i < img.data.length; i += 4 * 7) if (img.data[i + 3] > 250) pts.push([img.data[i], img.data[i + 1], img.data[i + 2]]);
  if (!pts.length) return [];
  // k-means++ in RGB, a few rounds is plenty
  const cs = [pts[(pts.length / 2) | 0]];
  while (cs.length < k) {
    let far = pts[0], fd = -1;
    for (const p of pts) { const d = Math.min(...cs.map((c) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2)); if (d > fd) { fd = d; far = p; } }
    cs.push(far);
  }
  let groups;
  for (let it = 0; it < 8; it++) {
    groups = cs.map(() => [0, 0, 0, 0]);
    for (const p of pts) {
      let bi = 0, bd = Infinity;
      cs.forEach((c, j) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2; if (d < bd) { bd = d; bi = j; } });
      const g = groups[bi]; g[0]++; g[1] += p[0]; g[2] += p[1]; g[3] += p[2];
    }
    groups.forEach((g, j) => { if (g[0]) cs[j] = [g[1] / g[0], g[2] / g[0], g[3] / g[0]]; });
  }
  return cs.map((c, j) => ({ hex: hex(c), share: +(groups[j][0] / pts.length).toFixed(3) }))
    .filter((c) => c.share > 0.0025).sort((a, b) => b.share - a.share);
}

// sRGB <-> CIELAB (D65)
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const gam = (c) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const fLab = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
const fInv = (t) => (t > 6 / 29 ? t ** 3 : (108 / 841) * (t - 4 / 29));
export function rgb2lab(r, g, b) {
  const R = lin(r), G = lin(g), B = lin(b);
  const x = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, y = 0.2126 * R + 0.7152 * G + 0.0722 * B, z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const fx = fLab(x), fy = fLab(y), fz = fLab(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
export function lab2rgb(L, a, b) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const x = fInv(fx) * 0.95047, y = fInv(fy), z = fInv(fz) * 1.08883;
  const R = 3.2406 * x - 1.5372 * y - 0.4986 * z, G = -0.9689 * x + 1.8758 * y + 0.0415 * z, B = 0.0557 * x - 0.204 * y + 1.057 * z;
  return [gam(Math.max(0, R)), gam(Math.max(0, G)), gam(Math.max(0, B))];
}
/** Box blur of a float plane, normalised by a weight plane (both blurred the same). */
function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    let acc = 0; const row = y * w;
    for (let x = -r; x <= r; x++) acc += src[row + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = acc / (2 * r + 1);
      acc += src[row + Math.min(w - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / (2 * r + 1);
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
    }
  }
  return out;
}

/**
 * Recolour the body: the smooth body colour moves to the new one; every local
 * detail (shading, blush, the inside of a mouth, fabric, fur) rides on top as
 * an offset in Lab, so a coral pig turned blue keeps pink cheeks and a red
 * mouth. Eyes, whites, outlines and details of another hue aren't touched.
 * from = { h, s, l, hex } (bodyColour), to = "#rrggbb", tol = hue tolerance.
 */
export function recolour(img, from, to, tol = 22) {
  const { w, h, data } = img;
  const n = w * h;
  const greyBody = from.s < 0.14;
  const F = rgb2lab(...unhex(from.hex || hex(hsl2rgb(from.h, from.s, from.l)))); // refined below
  const T = rgb2lab(...unhex(to));
  // which pixels are body (soft weights at the hue edge)
  const wt = new Float32Array(n);
  const redBody = !greyBody && hueGap(from.h, 0) < 20;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (data[i + 3] < 8) continue;
    const [hh, ss, ll] = rgb2hsl(data[i], data[i + 1], data[i + 2]);
    let v;
    if (greyBody) v = ss < 0.18 && ll > 0.25 && Math.abs(ll - from.l) < 0.35 ? 1 : 0;
    else {
      if (ss < 0.1 || ll < 0.08) continue;
      const g = hueGap(hh, from.h);
      v = g <= tol ? 1 : g <= tol * 1.6 ? 1 - (g - tol) / (tol * 0.6) : 0;
      v *= Math.min(1, ss / 0.2);
      // A reddish body holding something pure red (the love pose's heart, a tongue):
      // a strong pixel nearer to pure red than to the body's hue is that thing, not body.
      if (redBody && ss > 0.7 && hueGap(hh, 0) < 6 && g > 6) v = 0;
    }
    wt[p] = v * (data[i + 3] / 255);
  }
  // the smooth body colour field (masked blur), and each pixel's Lab
  const Lc = new Float32Array(n), Ac = new Float32Array(n), Bc = new Float32Array(n);
  const wl = new Float32Array(n), wa = new Float32Array(n), wb = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    if (!wt[p]) continue;
    const i = p * 4, [L, A, B] = rgb2lab(data[i], data[i + 1], data[i + 2]);
    Lc[p] = L; Ac[p] = A; Bc[p] = B;
    wl[p] = L * wt[p]; wa[p] = A * wt[p]; wb[p] = B * wt[p];
  }
  // The reference is the body's own typical pixel (median), not an average that
  // includes the shadows: then the most common body tone lands on the brand colour.
  { const Ls = [], As = [], Bs = [];
    for (let p = 0; p < n; p += 3) if (wt[p] > 0.8) { Ls.push(Lc[p]); As.push(Ac[p]); Bs.push(Bc[p]); }
    if (Ls.length > 200) { const med = (a) => a.sort((x, y) => x - y)[a.length >> 1]; F[0] = med(Ls); F[1] = med(As); F[2] = med(Bs); } }
  const r = Math.max(8, Math.round(w / 22));
  let W1 = wt, L1 = wl, A1 = wa, B1 = wb;
  for (let k = 0; k < 2; k++) { W1 = boxBlur(W1, w, h, r); L1 = boxBlur(L1, w, h, r); A1 = boxBlur(A1, w, h, r); B1 = boxBlur(B1, w, h, r); }
  const mapL = (L) => (T[0] <= F[0] ? L * (T[0] / Math.max(1, F[0])) : 100 - (100 - L) * ((100 - T[0]) / Math.max(1, 100 - F[0])));
  const out = { w, h, data: new Uint8ClampedArray(data) };
  const d = out.data;
  for (let p = 0; p < n; p++) {
    if (!wt[p]) continue;
    const ww = W1[p] > 1e-4 ? W1[p] : 1;
    const bL = W1[p] > 1e-4 ? L1[p] / ww : Lc[p], bA = W1[p] > 1e-4 ? A1[p] / ww : Ac[p], bB = W1[p] > 1e-4 ? B1[p] / ww : Bc[p];
    // the field, moved: lightness by ratio, colour by the difference between the two body colours
    // the field takes the new hue everywhere; only its lightness and its saturation falloff carry over
    const cF = Math.hypot(F[1], F[2]) || 1, ratio = Math.min(1.6, Math.hypot(bA, bB) / cF);
    const nL = mapL(bL), nA = T[1] * ratio, nB = T[2] * ratio;
    // the detail rides on top
    const i = p * 4;
    let [R, G, Bb] = lab2rgb(nL + (Lc[p] - bL), nA + (Ac[p] - bA), nB + (Bc[p] - bB));
    // Blush, tongues, inner ears: details clearly redder than the body keep their own colour.
    // (shaded creases are redder too, but darker: darkness counts against)
    // (only real pinks and reds: magenta fur tips or violet shading are body)
    const oh = rgb2hsl(data[i], data[i + 1], data[i + 2])[0];
    const pinkRed = oh >= 325 || oh <= 8;
    const red = pinkRed ? Math.max(0, Math.min(1, ((Ac[p] - bA) - Math.max(0, bL - Lc[p]) * 0.3 - 5) / 6)) : 0;
    if (red > 0) { R = R * (1 - red) + data[i] * red; G = G * (1 - red) + data[i + 1] * red; Bb = Bb * (1 - red) + data[i + 2] * red; }
    const m = wt[p] / (data[i + 3] / 255 || 1);
    d[i] = data[i] * (1 - m) + R * m; d[i + 1] = data[i + 1] * (1 - m) + G * m; d[i + 2] = data[i + 2] * (1 - m) + Bb * m;
  }
  return out;
}

export async function resizeTo(file, out, size, { webp = false, quality = 88 } = {}) {
  let s = sharp()(file).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "lanczos3" });
  s = webp ? s.webp({ quality, alphaQuality: 100, effort: 5 }) : s.png({ compressionLevel: 9 });
  await s.toFile(out);
  return fs.statSync(out).size;
}
