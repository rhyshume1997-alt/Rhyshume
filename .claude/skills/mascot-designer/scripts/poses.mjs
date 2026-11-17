#!/usr/bin/env node
/**
 * Mascot Designer · turn raw pictures into a clean, aligned pose set.
 *
 *   node poses.mjs <mascot folder>          reads raw/<pose>.png, writes poses/<pose>.png + mascot.json
 *   node poses.mjs <mascot folder> --sheet  also draws qa/overlay.png (all poses stacked) and qa/sheet.png
 *
 * Every pose ends up on the same 1024 square, the same scale, feet on the same
 * ground line, the body centred, the matte clean (solid body, no specks).
 * The blink is spliced into the idle so only the eyes change.
 * mascot.json gets the numbers the runtimes need: anchors for the effects,
 * the shadow width, the body colour and a palette.
 */
import fs from "node:fs";
import path from "node:path";
import { flags, readJSON, writeJSON } from "./lib/util.mjs";
import { POSE_IDS } from "./lib/prompts.mjs";
import * as I from "./lib/image.mjs";

const f = flags();
const dir = path.resolve(f._[0] || ".");
const rawDir = path.join(dir, "raw");
if (!fs.existsSync(path.join(rawDir, "idle.png"))) { console.error(`No raw/idle.png in ${dir}`); process.exit(2); }

const missing = POSE_IDS.filter((p) => !fs.existsSync(path.join(rawDir, `${p}.png`)));
if (missing.length) console.error(`!! missing poses: ${missing.join(", ")} (the runtime falls back to idle for them)`);

const raw = {};
for (const p of POSE_IDS) {
  const file = path.join(rawDir, `${p}.png`);
  if (!fs.existsSync(file)) continue;
  const img = await I.load(file, I.CANVAS);
  if (!I.hasMatte(img)) { I.keyBackdrop(img); console.error(`   ${p}: no transparency, backdrop keyed out`); }
  raw[p] = I.cleanMatte(img);
}

// A pose the model drew see-through (ghosted) doesn't fix itself: flag it.
const ghosts = [];
for (const [p, img] of Object.entries(raw)) {
  let solid = 0, partial = 0;
  for (let i = 3; i < img.data.length; i += 4) { const a = img.data[i]; if (a > 235) solid++; else if (a > 20) partial++; }
  const share = partial / Math.max(1, solid + partial);
  if (share > 0.08) ghosts.push(`${p} (${Math.round(share * 100)}% see-through)`);
}

// Blink is spliced after alignment, so it's aligned like the idle (same silhouette).
const { images, info } = I.align(raw, "idle");
let blinkNote = "";
if (images.blink) {
  const r = I.spliceBlink(images.idle, images.blink);
  images.blink = r.img;
  blinkNote = r.spliced ? `blink spliced (eyes only, shift ${r.shift.dx},${r.shift.dy})` : "blink kept whole (the model changed more than the eyes)";
}
for (const p of POSE_IDS) if (!images[p]) images[p] = images.idle;

fs.mkdirSync(path.join(dir, "poses"), { recursive: true });
for (const [p, img] of Object.entries(images)) await I.save(img, path.join(dir, "poses", `${p}.png`));

// Numbers for the runtimes, measured on the aligned idle.
const m = I.measure(images.idle);
const C = I.CANVAS;
const body = I.bodyColour(images.idle);
const pal = I.palette(images.idle);
const metaFile = path.join(dir, "mascot.json");
const meta = readJSON(metaFile, {});
Object.assign(meta, {
  ground: I.GROUND,
  anchors: { cx: +(m.core.cx / C).toFixed(4), top: +(m.bbox.top / C).toFixed(4), left: +(m.bbox.left / C).toFixed(4), right: +((m.bbox.right + 1) / C).toFixed(4) },
  shadow: meta.shadow === null ? null : { w: +((m.core.bottom - m.core.top > 0 ? Math.min(m.bbox.width, (m.bbox.width + (m.core.bottom - m.core.top)) / 2) : m.bbox.width) / C * 0.78).toFixed(4) },
  body,
  palette: pal,
  align: info,
});
meta.colours = { body: body.hex, ...(meta.colours || {}) };
writeJSON(metaFile, meta);

console.log(`Poses ready in ${path.join(dir, "poses")}`);
console.log(`  body ${body.hex} · palette ${pal.map((c) => c.hex).join(" ")}`);
console.log(`  ${blinkNote}`);
if (ghosts.length) console.log(`!! see-through, redo: ${ghosts.join(", ")}  (make.mjs poses <folder> --only ${ghosts.map((g) => g.split(" ")[0]).join(",")} --note "fully opaque, solid body")`);
if (meta.brand) {
  const { rgb2lab, unhex } = I;
  const a = rgb2lab(...unhex(meta.brand)), b2 = rgb2lab(...unhex(body.hex));
  const dE = Math.hypot(a[0] - b2[0], a[1] - b2[1], a[2] - b2[2]);
  if (dE > 18) console.log(`  -- body ${body.hex} is far from the brand ${meta.brand} (difference ${Math.round(dE)}): if they want it exact, recolour.mjs "<folder>" "${meta.brand}"`);
}
const odd = Object.entries(info).filter(([, v]) => v.correction !== 1).map(([k, v]) => `${k} x${v.correction}`);
if (odd.length) console.log(`  size corrected: ${odd.join(", ")}`);

if (f.sheet) {
  fs.mkdirSync(path.join(dir, "qa"), { recursive: true });
  const sharp = (await import("./lib/util.mjs")).sharp();
  // Overlay: every pose at 25% over each other: the feet and body should line up.
  const over = I.blank(C, C);
  for (const p of POSE_IDS) {
    const d = images[p].data;
    for (let i = 0; i < d.length; i += 4) {
      const a = (d[i + 3] / 255) * 0.22;
      for (let c = 0; c < 3; c++) over.data[i + c] = over.data[i + c] * (1 - a) + d[i + c] * a;
      over.data[i + 3] = Math.max(over.data[i + 3], Math.min(255, over.data[i + 3] + d[i + 3] * 0.35));
    }
  }
  for (let dy = -2; dy <= 2; dy++) for (let x = 0; x < C; x++) { const i = ((Math.round(C * I.GROUND) + dy) * C + x) * 4; over.data[i] = 255; over.data[i + 1] = 30; over.data[i + 2] = 60; over.data[i + 3] = 255; }
  await I.save(over, path.join(dir, "qa", "overlay.png"));
  // Sheet: all poses on a light grey, with the ground line, 5 across.
  const cell = 300, cols = 5, rows = Math.ceil(POSE_IDS.length / cols);
  const comps = [];
  for (const [k, p] of POSE_IDS.entries()) {
    comps.push({ input: await sharp(path.join(dir, "poses", `${p}.png`)).resize(cell, cell).png().toBuffer(), left: (k % cols) * cell, top: Math.floor(k / cols) * cell });
  }
  await sharp({ create: { width: cell * cols, height: cell * rows, channels: 4, background: "#ECECF1" } }).composite(comps).png().toFile(path.join(dir, "qa", "sheet.png"));
  console.log(`  qa: ${path.join(dir, "qa", "sheet.png")} and overlay.png`);
}
