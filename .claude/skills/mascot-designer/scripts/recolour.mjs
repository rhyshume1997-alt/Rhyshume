#!/usr/bin/env node
/**
 * Mascot Designer · recolour a finished mascot: the body takes the new colour,
 * shading, eyes, cheeks and details stay.
 *
 *   node recolour.mjs <mascot folder> "#4F7DF3" [--tol 22] [--preview out.png]
 *
 * Works on poses/ in place (the originals are kept once in poses-original/).
 * Then: make.mjs finish <folder>.
 */
import fs from "node:fs";
import path from "node:path";
import { flags, readJSON, writeJSON, sharp } from "./lib/util.mjs";
import { POSE_IDS } from "./lib/prompts.mjs";
import * as I from "./lib/image.mjs";

const f = flags();
const dir = path.resolve(f._[0] || ".");
let target = f._[1];
if (!target || !/^#?[0-9a-f]{6}$/i.test(target)) { console.error('Usage: node recolour.mjs <folder> "#4F7DF3"'); process.exit(2); }
if (!target.startsWith("#")) target = "#" + target;
const meta = readJSON(path.join(dir, "mascot.json"));
const orig = path.join(dir, "poses-original");
if (!fs.existsSync(orig)) fs.cpSync(path.join(dir, "poses"), orig, { recursive: true });
const src = (p) => [path.join(orig, `${p}.png`), path.join(orig, `${p}.webp`)].find((f) => fs.existsSync(f));
const from = meta.bodyOriginal || meta.body;
const tol = +(f.tol || 22);

if (f.preview) {
  const S = sharp(), c = 512, comps = [];
  for (const [i, p] of ["idle", "celebrate", "love"].entries()) {
    const img = I.recolour(await I.load(src(p)), from, target, tol);
    comps.push({ input: await S(Buffer.from(img.data.buffer), { raw: { width: img.w, height: img.h, channels: 4 } }).resize(c, c).png().toBuffer(), left: i * c, top: 0 });
  }
  await S({ create: { width: c * 3, height: c, channels: 4, background: "#EEEEF2" } }).composite(comps).png().toFile(path.resolve(f.preview));
  console.log(path.resolve(f.preview));
  process.exit(0);
}

let idle;
for (const p of POSE_IDS) {
  const img = I.recolour(await I.load(src(p)), from, target, tol);
  await I.save(img, path.join(dir, "poses", `${p}.png`));
  if (p === "idle") idle = img;
}
meta.bodyOriginal = from;
meta.brand = meta.brand || target;
meta.body = I.bodyColour(idle);
meta.palette = I.palette(idle);
delete meta.colours;
writeJSON(path.join(dir, "mascot.json"), meta);
console.log(`Recoloured to ${target} (body now ${meta.body.hex}). Next: make.mjs finish "${dir}"`);
