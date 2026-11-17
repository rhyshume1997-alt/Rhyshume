// Shared bits: where things live, names, small helpers.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const VERSION = "1.0";
export const SKILL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
/** The runtime (playwright-core, sharp) lives here, never system-wide. */
export const HOME = process.env.MASCOT_HOME || path.join(os.homedir(), ".mascot-designer");
export const fileUrl = (p) => pathToFileURL(p).href;

/** Where mascots are written: ~/Desktop/Mascots, or the home folder if there's no Desktop. */
export function outRoot() {
  if (process.env.MASCOT_OUT) return process.env.MASCOT_OUT;
  const desk = path.join(os.homedir(), "Desktop");
  return path.join(fs.existsSync(desk) ? desk : os.homedir(), "Mascots");
}

export const slug = (s) => String(s || "mascot").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "mascot";
/** "pip" → "Pip" (Swift type names, asset folders). */
export const pascal = (s) => slug(s).split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join("");

export function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { if (fallback !== undefined) return fallback; throw new Error(`Can't read ${file}`); }
}
export const writeJSON = (file, v) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(v, null, 2) + "\n"); };

export function flags(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) out[k] = true;
      else { out[k] = out[k] === undefined ? next : [].concat(out[k], next); i++; }
    } else out._.push(a);
  }
  return out;
}

/** sharp from ~/.mascot-designer (installed by doctor --fix), else from the skill or cwd. */
import { createRequire } from "node:module";
let _sharp;
export function sharp() {
  if (_sharp) return _sharp;
  for (const base of [HOME, SKILL, process.cwd()]) {
    try { _sharp = createRequire(path.join(base, "package.json"))("sharp"); return _sharp; } catch {}
  }
  console.error(`The image runtime isn't installed. Run once:\n  node "${path.join(SKILL, "scripts", "doctor.mjs")}" --fix`);
  process.exit(2);
}
