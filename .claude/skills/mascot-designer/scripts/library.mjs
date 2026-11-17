#!/usr/bin/env node
/**
 * Mascot Designer · the ready-made library: 20 finished mascots, every pose
 * drawn, for people without an OpenAI account (or who want one in a minute).
 *
 *   node library.mjs list                         all 20, one line each
 *   node library.mjs match "a budgeting app for students"   the best fits, ranked
 *   node library.mjs use <id> <folder> [--name Pip] [--colour "#4F7DF3"] [--brand "#4F7DF3"] [--app "My App"]
 *        copies the mascot into <folder> (poses/ + mascot.json), renamed and,
 *        with --colour, recoloured: the body takes the new colour, the shading,
 *        eyes, cheeks and details stay. Then: make.mjs finish <folder>.
 *   node library.mjs preview <id> --colour "#hex" [--out file.png]   idle, celebrate and love recoloured, to look at first
 *
 * The pictures download from tobiadonadon.com the first time (about 1 MB a
 * mascot) and are kept in ~/.mascot-designer/library. MASCOT_LIBRARY=<folder or URL> overrides.
 */
import fs from "node:fs";
import path from "node:path";
import { SKILL, HOME, flags, readJSON, writeJSON, sharp } from "./lib/util.mjs";
import { POSE_IDS } from "./lib/prompts.mjs";
import * as I from "./lib/image.mjs";

const SOURCE = process.env.MASCOT_LIBRARY || "https://www.tobiadonadon.com/mascot-library";
const CACHE = path.join(HOME, "library");
const index = readJSON(path.join(SKILL, "assets", "library", "index.json"));
const f = flags();
const [cmd, a1, a2] = f._;

const byId = (id) => {
  const m = index.find((x) => x.id === String(id).toLowerCase());
  if (!m) { console.error(`No mascot "${id}". Try: ${index.map((x) => x.id).join(", ")}`); process.exit(2); }
  return m;
};

async function fetchPose(id, pose) {
  const local = path.join(CACHE, id, `${pose}.webp`);
  if (fs.existsSync(local) && fs.statSync(local).size > 1000) return local;
  fs.mkdirSync(path.dirname(local), { recursive: true });
  if (!/^https?:/.test(SOURCE)) { fs.copyFileSync(path.join(SOURCE, id, `${pose}.webp`), local); return local; }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(`${SOURCE}/${id}/${pose}.webp`, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      fs.writeFileSync(local, Buffer.from(await r.arrayBuffer()));
      return local;
    } catch (e) { if (attempt === 2) { console.error(`Couldn't download ${id}/${pose}: ${e.message}. Check the internet connection.`); process.exit(1); } }
  }
}

const words = (s) => String(s || "").toLowerCase().match(/[a-z0-9]+/g) || [];
const stem = (w) => w.replace(/(ings?|ers?|ies|es|s)$/, "");

if (cmd === "list") {
  for (const m of index) console.log(`${m.id.padEnd(8)} ${m.name.padEnd(8)} ${m.styleName.padEnd(14)} ${m.role}  [${m.represents.join(", ")}]`);
}

else if (cmd === "match") {
  const q = new Set(words(a1).map(stem));
  const scored = index.map((m) => {
    let s = 0; const why = [];
    for (const r of m.represents) { const rw = words(r).map(stem); if (rw.every((w) => q.has(w))) { s += 3; why.push(r); } else if (rw.some((w) => q.has(w))) { s += 1; why.push(r); } }
    for (const w of words(m.role).map(stem)) if (q.has(w) && w.length > 3) s += 0.5;
    return { m, s, why };
  }).sort((x, y) => y.s - x.s);
  for (const { m, s, why } of scored.slice(0, 5)) console.log(`${m.id.padEnd(8)} score ${s.toFixed(1).padStart(4)}  ${m.name}: ${m.role}${why.length ? `  (matches: ${why.join(", ")})` : ""}`);
  console.log(`\nAll 20 at a glance: ${path.join(SKILL, "assets", "library", "library.webp")}`);
}

else if (cmd === "use" || cmd === "preview") {
  const m = byId(a1);
  const colour = f.colour || f.color;
  if (colour && !/^#?[0-9a-f]{6}$/i.test(colour)) { console.error(`--colour must look like #4F7DF3`); process.exit(2); }
  const target = colour ? (colour.startsWith("#") ? colour : "#" + colour) : null;
  const poses = cmd === "preview" ? ["idle", "celebrate", "love"] : POSE_IDS;
  const imgs = {};
  for (const p of poses) {
    let img = await I.load(await fetchPose(m.id, p));
    if (target) img = I.recolour(img, m.body, target, m.tol || 22);
    imgs[p] = img;
  }
  if (cmd === "preview") {
    const S = sharp(), c = 512, comps = [];
    for (const [i, p] of poses.entries()) comps.push({ input: await S(Buffer.from(imgs[p].data.buffer), { raw: { width: imgs[p].w, height: imgs[p].h, channels: 4 } }).resize(c, c).png().toBuffer(), left: i * c, top: 0 });
    const out = path.resolve(f.out || `${m.id}-preview.png`);
    await S({ create: { width: c * poses.length, height: c, channels: 4, background: "#EEEEF2" } }).composite(comps).png().toFile(out);
    console.log(out);
    process.exit(0);
  }
  const dir = path.resolve(a2 || m.name);
  fs.mkdirSync(path.join(dir, "poses"), { recursive: true });
  for (const p of poses) await I.save(imgs[p], path.join(dir, "poses", `${p}.png`));
  // The library's own colours stay beside them, so a later recolour starts from the original.
  fs.rmSync(path.join(dir, "poses-original"), { recursive: true, force: true });
  if (target) { fs.mkdirSync(path.join(dir, "poses-original"), { recursive: true }); for (const p of poses) fs.copyFileSync(await fetchPose(m.id, p), path.join(dir, "poses-original", `${p}.webp`)); }
  const body = target ? I.bodyColour(imgs.idle) : m.body;
  const meta = readJSON(path.join(dir, "mascot.json"), {});
  Object.assign(meta, {
    name: f.name || meta.name || m.name,
    app: f.app || meta.app,
    style: m.style,
    role: meta.role || m.role,
    represents: meta.represents || m.represents.slice(0, 3).join(", "),
    personality: meta.personality || m.personality,
    library: m.id,
    ground: m.ground, anchors: m.anchors, shadow: m.shadow,
    body, palette: target ? I.palette(imgs.idle) : m.palette,
    bodyOriginal: m.body,
  });
  if (f.brand || target) meta.brand = f.brand || target;
  delete meta.colours;
  writeJSON(path.join(dir, "mascot.json"), meta);
  console.log(`${meta.name} is ready in ${dir} (from ${m.name}${target ? `, recoloured to ${target}` : ""}).`);
  console.log(`Next: node "${path.join(SKILL, "scripts", "make.mjs")}" finish "${dir}"`);
}

else { console.error("Usage: node library.mjs list | match \"words\" | use <id> <folder> [--name X] [--colour #hex] | preview <id> --colour #hex"); process.exit(2); }
