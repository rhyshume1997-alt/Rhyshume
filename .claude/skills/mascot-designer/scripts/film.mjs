#!/usr/bin/env node
/**
 * Mascot Designer · the film: the mascot living inside a real-looking app,
 * on iPhone and on Mac, doing every move. Rendered frame by frame (exact, no
 * dropped frames) with the person's own Chrome, encoded with ffmpeg.
 *
 *   node film.mjs <mascot folder> [--fps 30] [--out file.mp4] [--frames 0,4.2,9.1]
 *
 * Needs the kit (kit.mjs) first: it plays web/<slug>/. Words come from
 * mascot.json (app, role, lines). --frames writes stills at those seconds
 * to qa/ instead of a film, for checking.
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawnSync, spawn } from "node:child_process";
import { SKILL, flags, readJSON, slug } from "./lib/util.mjs";
import { launch } from "./lib/browser.mjs";

const f = flags();
const dir = path.resolve(f._[0] || ".");
const meta = readJSON(path.join(dir, "mascot.json"));
const sl = meta.slug || slug(meta.name);
if (!fs.existsSync(path.join(dir, "web", sl, "idle.webp"))) { console.error("No web kit yet: run kit.mjs first."); process.exit(2); }
const fps = +(f.fps || 30);
const out = path.resolve(f.out || path.join(dir, `${meta.name}.mp4`));

// ffmpeg: the system one, else ffmpeg-static from the runtime folder
function ffmpegBin() {
  for (const c of [process.env.FFMPEG, "ffmpeg"]) if (c && spawnSync(c, ["-version"]).status === 0) return c;
  try { const p = path.join(process.env.MASCOT_HOME || path.join(process.env.HOME || process.env.USERPROFILE, ".mascot-designer"), "node_modules", "ffmpeg-static", process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"); if (fs.existsSync(p)) return p; } catch {}
  return null;
}

// A tiny server: the skill at /skill, the mascot at /m (browsers won't fetch from file://).
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".webp": "image/webp", ".png": "image/png", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const [root, rest] = u.startsWith("/skill/") ? [SKILL, u.slice(7)] : u.startsWith("/m/") ? [path.join(dir, "web"), u.slice(3)] : [null, null];
  const file = root && path.join(root, rest);
  if (!file || !file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const browser = await launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
const film = { src: `/m/${sl}`, mascot: { name: meta.name, app: meta.app, role: meta.role, lines: meta.lines || {}, body: meta.body, brand: meta.brand, ext: "webp" } };
await page.addInitScript((F) => { window.FILM = F; }, film);
await page.goto(`http://127.0.0.1:${port}/skill/demo/film.html?render=1`, { waitUntil: "load" });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 }).catch(() => {});
if (!(await page.evaluate(() => window.__ready))) { console.error("The film page didn't get ready:\n  " + errors.join("\n  ")); await browser.close(); server.close(); process.exit(1); }
const dur = await page.evaluate(() => window.__duration);

if (f.frames) {
  const qa = path.join(dir, "qa");
  fs.mkdirSync(qa, { recursive: true });
  const times = String(f.frames).split(",").map(Number);
  // step up to each time so every event fires in order
  let t = 0;
  for (const target of times.sort((a, b) => a - b)) {
    while (t < target) { t = Math.min(target, t + 1 / fps); await page.evaluate((x) => window.__seek(x), t); }
    const file = path.join(qa, `film-${target.toFixed(2)}.jpg`);
    await page.screenshot({ path: file, type: "jpeg", quality: 85 });
    console.log(file);
  }
  await browser.close(); server.close();
  if (errors.length) console.error("!! page errors:\n  " + errors.join("\n  "));
  process.exit(0);
}

const ff = ffmpegBin();
if (!ff) { console.error("ffmpeg isn't installed: run doctor.mjs --fix"); await browser.close(); server.close(); process.exit(2); }
const total = Math.ceil(dur * fps);
const enc = spawn(ff, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "mjpeg", "-i", "-",
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-f", "mp4", out + ".part"], { stdio: ["pipe", "inherit", "inherit"] });
const t0 = Date.now();
for (let i = 0; i < total; i++) {
  await page.evaluate((x) => window.__seek(x), i / fps);
  const buf = await page.screenshot({ type: "jpeg", quality: 92 });
  if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once("drain", r));
  if (i % (fps * 5) === 0) process.stderr.write(`  ${Math.round((i / total) * 100)}%\r`);
}
enc.stdin.end();
const code = await new Promise((r) => enc.on("close", r));
if (code === 0) fs.renameSync(out + ".part", out); // never a half-written film at the real name
else { console.error("ffmpeg failed to encode the film."); process.exit(1); }
await browser.close(); server.close();
if (errors.length) console.error("!! page errors:\n  " + errors.join("\n  "));
console.log(`${out}  (${dur.toFixed(1)} s, ${total} frames, rendered in ${Math.round((Date.now() - t0) / 1000)} s)`);
