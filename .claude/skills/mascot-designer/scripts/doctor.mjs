#!/usr/bin/env node
/**
 * Mascot Designer · doctor: can this computer do the job, and the fix if not.
 *
 *   node doctor.mjs          check
 *   node doctor.mjs --fix    install what's missing into ~/.mascot-designer:
 *                            sharp (pictures), playwright-core (films, sheets),
 *                            ffmpeg-static (only if there's no ffmpeg), and a
 *                            private Chromium only if no Chrome or Edge starts.
 *                            Nothing is installed system-wide.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { SKILL, HOME, VERSION } from "./lib/util.mjs";

const FIX = process.argv.includes("--fix");
const WIN = process.platform === "win32";
let ok = true;
const line = (state, msg) => console.log(`  ${state === true ? "ok  " : state === false ? "!!  " : "--  "} ${msg}`);
const need = (good, msg) => { line(good, msg); if (!good) ok = false; };
const npm = (argv) => spawnSync(WIN ? "npm.cmd" : "npm", [...argv, "--no-audit", "--no-fund", "--loglevel", "error", "--cache", path.join(HOME, ".npm-cache")], { cwd: HOME, stdio: "inherit", shell: WIN });
const req = (name) => { try { return createRequire(path.join(HOME, "package.json"))(name); } catch { return null; } };

console.log(`Mascot Designer ${VERSION} doctor · ${os.type()} ${os.release()} (${process.arch}) · node ${process.versions.node}\n`);
const [maj, min] = process.versions.node.split(".").map(Number);
need(maj > 18 || (maj === 18 && min >= 17), `Node ${process.versions.node}${maj >= 18 ? "" : " (need 18.17 or newer: https://nodejs.org)"}`);

fs.mkdirSync(HOME, { recursive: true });
const pkg = JSON.parse(fs.readFileSync(path.join(SKILL, "package.json"), "utf8"));
const hasFfmpeg = spawnSync("ffmpeg", ["-version"]).status === 0;
if (!hasFfmpeg) pkg.dependencies["ffmpeg-static"] = "^5.2.0";
const want = Object.keys(pkg.dependencies);
let missing = want.filter((d) => !req(d));
if (missing.length && FIX) {
  fs.writeFileSync(path.join(HOME, "package.json"), JSON.stringify(pkg, null, 2));
  console.log(`  > npm install ${missing.join(" ")} (in ${HOME})`);
  npm(["install"]);
  missing = want.filter((d) => !req(d));
}
need(!missing.length, missing.length ? `missing: ${missing.join(", ")}. Run: node "${path.join(SKILL, "scripts", "doctor.mjs")}" --fix` : "pictures (sharp) and browser runtime installed");
need(hasFfmpeg || !!req("ffmpeg-static"), hasFfmpeg ? "ffmpeg (system)" : req("ffmpeg-static") ? "ffmpeg (private copy)" : "no ffmpeg for the film (run --fix)");

let browser = null;
const pw = req("playwright-core");
if (pw) {
  if (fs.existsSync(path.join(HOME, "browsers"))) process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(HOME, "browsers");
  const tryLaunch = async (opts) => { try { const b = await pw.chromium.launch({ headless: true, ...opts }); await b.close(); return true; } catch { return false; } };
  for (const [label, opts] of [["Google Chrome", { channel: "chrome" }], ["Microsoft Edge", { channel: "msedge" }], ["Chromium", {}]]) if (!browser && await tryLaunch(opts)) browser = label;
  if (!browser && FIX) {
    const dir = path.join(HOME, "browsers");
    fs.mkdirSync(dir, { recursive: true });
    console.log("  > installing a private Chromium (about 150 MB, once)");
    spawnSync(WIN ? "npx.cmd" : "npx", ["--yes", "playwright-core", "install", "chromium"], { cwd: HOME, stdio: "inherit", shell: WIN, env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: dir, npm_config_cache: path.join(HOME, ".npm-cache") } });
    process.env.PLAYWRIGHT_BROWSERS_PATH = dir;
    if (await tryLaunch({})) browser = "Chromium (private)";
  }
  need(!!browser, browser ? `browser: ${browser}` : "no Chrome, Edge or Chromium could start (install Google Chrome, or run --fix)");
}

// The image provider.
const g = spawnSync(process.execPath, [path.join(SKILL, "scripts", "gen.mjs"), "--check"], { encoding: "utf8" });
const way = (g.stdout || "").trim();
line(way === "none" ? null : true, way === "openai" ? "drawing: your OpenAI API key" : way === "codex" ? "drawing: Codex, signed in with your ChatGPT account" : "drawing: no OpenAI account found (the 20 ready-made mascots still work; for your own: `codex login` or OPENAI_API_KEY in ~/.mascot-designer/.env)");
const xc = spawnSync("xcrun", ["--find", "swiftc"], { encoding: "utf8" }).status === 0;
line(xc ? true : null, xc ? "Xcode tools: the Swift view gets type-checked" : "no Xcode tools (fine: the Swift file is still made, just not type-checked here)");

if (ok && browser) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "mascot-doctor-"));
  const r = spawnSync(process.execPath, [path.join(SKILL, "scripts", "selftest.mjs"), tmp], { encoding: "utf8" });
  need(r.status === 0, r.status === 0 ? "smoke test: cleaned, aligned and exported a test mascot" : "smoke test failed:\n" + (r.stdout + r.stderr).slice(-800));
  fs.rmSync(tmp, { recursive: true, force: true });
}
console.log(ok ? "\nReady." : "\nNot ready: fix the !! lines above (or run with --fix).");
process.exit(ok ? 0 : 1);
