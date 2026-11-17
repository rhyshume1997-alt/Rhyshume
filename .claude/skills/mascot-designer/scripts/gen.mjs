#!/usr/bin/env node
/**
 * Mascot Designer · make images with the person's own OpenAI account.
 *
 *   node gen.mjs --check                       which way this computer can draw (prints openai | codex | none)
 *   node gen.mjs "prompt" --out a.png [--ref master.png]
 *   node gen.mjs --jobs jobs.json [--parallel 4]
 *        jobs.json = [{ "prompt": "...", "out": "/abs/a.png", "refs": ["/abs/master.png"] }, ...]
 *
 * Ways to draw, in order:
 *   openai  OPENAI_API_KEY in the environment, or in ~/.mascot-designer/.env.
 *           The OpenAI Images API (gpt-image models), true transparent PNGs,
 *           edits keep the character with input_fidelity high.
 *   codex   The Codex CLI signed in with a ChatGPT account (`codex login`):
 *           no key needed, the same image model, about 1-2 minutes an image.
 *   none    Neither: exit 3. The skill then works from the ready-made library.
 *
 * Every image is retried once. Exit 0 = every image written.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { HOME, flags } from "./lib/util.mjs";

const f = flags();

for (const envFile of [path.join(HOME, ".env"), ".env"]) {
  if (!fs.existsSync(envFile)) continue;
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*(OPENAI_API_KEY|OPENAI_IMAGE_MODEL|MASCOT_CODEX_MODEL)\s*=\s*"?([^"#\s]+)"?/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const has = (bin) => spawnSync(process.platform === "win32" ? "where" : "which", [bin], { encoding: "utf8" }).status === 0;

export function provider() {
  const want = process.env.MASCOT_PROVIDER;
  if (want) return want;
  if (process.env.OPENAI_API_KEY) return "openai";
  if (has("codex") && fs.existsSync(path.join(codexHome, "auth.json"))) return "codex";
  return "none";
}

// ------------------------------------------------------------ codex
let codexModel = process.env.MASCOT_CODEX_MODEL || null; // learned on the first success
function codexModels() {
  const list = [codexModel];
  try {
    const cache = JSON.parse(fs.readFileSync(path.join(codexHome, "models_cache.json"), "utf8"));
    for (const m of cache.models || []) if (m.slug && !/reserve|review|codex-mini/.test(m.slug)) list.push(m.slug);
  } catch {}
  list.push("gpt-5.6-terra");
  return [...new Set(list)].slice(0, 6);
}
function newestGenerated(since, session) {
  const gen = path.join(codexHome, "generated_images");
  if (!fs.existsSync(gen)) return null;
  const files = [];
  for (const d of fs.readdirSync(gen, { withFileTypes: true })) {
    if (!d.isDirectory() || (session && d.name !== session)) continue;
    for (const x of fs.readdirSync(path.join(gen, d.name))) {
      const p = path.join(gen, d.name, x);
      if (/\.(png|webp|jpe?g)$/i.test(x) && fs.statSync(p).mtimeMs >= since) files.push(p);
    }
  }
  return files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0] || null;
}
function runCodex(args, input) {
  return new Promise((resolve) => {
    const child = spawn("codex", args, { stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    const timer = setTimeout(() => child.kill("SIGKILL"), 8 * 60_000);
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, out }); });
    child.stdin.end(input);
  });
}
async function viaCodex(job) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mascot-gen-"));
  const tmpOut = path.join(tmpDir, "out.png");
  const refs = job.refs || [];
  const instruction = [
    refs.length ? "Use your built-in image generation tool to EDIT the attached image (it is the reference). Do not write code and do not create any other file." : "Use your built-in image generation tool to create exactly one image. Do not write code and do not create any other file.",
    "",
    job.prompt,
    "",
    `When the image is ready, copy the generated PNG to exactly this path: ${tmpOut}`,
    "Reply with only that path.",
  ].join("\n");
  let last = "";
  for (const m of codexModels()) {
    const since = Date.now();
    const args = ["exec", "--skip-git-repo-check", "-s", "workspace-write", "-C", tmpDir, ...(m ? ["-m", m] : []), ...refs.flatMap((r) => ["-i", r]), "-"];
    const r = await runCodex(args, instruction);
    let got = fs.existsSync(tmpOut) ? tmpOut : null;
    if (!got) {
      // Codex made it but didn't copy it: take the image this very session generated
      // (never another job's: several run at once).
      const session = (r.out.match(/session id:\s*([0-9a-f-]+)/i) || [])[1];
      const fresh = session ? newestGenerated(since, session) : null;
      if (fresh) got = fresh;
    }
    if (got) {
      fs.mkdirSync(path.dirname(job.out), { recursive: true });
      fs.copyFileSync(got, job.out);
      fs.rmSync(tmpDir, { recursive: true, force: true });
      if (m) codexModel = m;
      return { ok: true };
    }
    last = (r.out || "").split("\n").filter((l) => /error|not supported|unauthor|login|limit|quota/i.test(l)).slice(-3).join(" ").slice(0, 400);
    if (/limit|quota|rate/i.test(last)) return { ok: false, error: last, limited: true };
    if (!/model/i.test(last)) break; // only a model problem is worth another model
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
  return { ok: false, error: last || "Codex finished without an image" };
}

// ------------------------------------------------------------ openai
async function viaOpenAI(job) {
  const models = [process.env.OPENAI_IMAGE_MODEL, "gpt-image-2", "gpt-image-1.5", "gpt-image-1"].filter(Boolean);
  let last = "";
  for (const model of models) {
    const base = { model, prompt: job.prompt, size: "1024x1024", background: "transparent", output_format: "png", quality: "high" };
    let res;
    try {
      if (job.refs?.length) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(base)) fd.append(k, v);
        fd.append("input_fidelity", "high");
        for (const r of job.refs) fd.append("image[]", new Blob([fs.readFileSync(r)], { type: "image/png" }), path.basename(r));
        res = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: fd });
      } else {
        res = await fetch("https://api.openai.com/v1/images/generations", { method: "POST", headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify(base) });
      }
    } catch (e) { last = e.message; continue; }
    const j = await res.json().catch(() => ({}));
    if (res.ok && j.data?.[0]?.b64_json) {
      fs.mkdirSync(path.dirname(job.out), { recursive: true });
      fs.writeFileSync(job.out, Buffer.from(j.data[0].b64_json, "base64"));
      return { ok: true };
    }
    last = `${model}: ${j.error?.message || res.status}`;
    // A parameter this model doesn't take, or a model this key can't use: try the next one.
    if (!/model|not found|does not exist|unsupported|invalid|parameter|verified/i.test(last)) break;
  }
  return { ok: false, error: last };
}

export async function generate(job, way = provider()) {
  if (way === "none") return { ok: false, error: "no image provider" };
  const run = way === "openai" ? viaOpenAI : viaCodex;
  let r = await run(job);
  if (!r.ok && !r.limited) r = await run(job);
  return r;
}

async function pool(jobs, n, way) {
  const results = new Array(jobs.length);
  let next = 0, done = 0;
  const t0 = Date.now();
  async function worker() {
    while (next < jobs.length) {
      const i = next++;
      results[i] = await generate(jobs[i], way);
      done++;
      const s = Math.round((Date.now() - t0) / 1000);
      console.error(`  ${results[i].ok ? "ok" : "!!"} ${path.basename(jobs[i].out)} (${done}/${jobs.length}, ${s}s)${results[i].ok ? "" : " " + results[i].error}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, jobs.length) }, worker));
  return results;
}

// ------------------------------------------------------------ cli
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("gen.mjs")) {
  const way = provider();
  if (f.check) { console.log(way); process.exit(way === "none" ? 3 : 0); }
  if (way === "none") {
    console.error("No OpenAI way to draw on this computer: no OPENAI_API_KEY and no signed-in Codex CLI. Use the ready-made library (library.mjs).");
    process.exit(3);
  }
  let jobs;
  if (f.jobs) jobs = JSON.parse(fs.readFileSync(f.jobs, "utf8"));
  else {
    const prompt = f._[0] || (f["prompt-file"] && fs.readFileSync(f["prompt-file"], "utf8"));
    if (!prompt || !f.out) { console.error('Usage: node gen.mjs "prompt" --out a.png [--ref master.png]'); process.exit(2); }
    jobs = [{ prompt, out: path.resolve(f.out), refs: [].concat(f.ref || []).map((r) => path.resolve(r)) }];
  }
  console.error(`Drawing ${jobs.length} image${jobs.length > 1 ? "s" : ""} with ${way === "openai" ? "the OpenAI API" : "Codex (ChatGPT account)"}…`);
  const res = await pool(jobs, +(f.parallel || (way === "openai" ? 5 : 4)), way);
  const bad = res.filter((r) => !r.ok).length;
  for (const j of jobs) if (fs.existsSync(j.out)) console.log(j.out);
  if (bad) { console.error(`${bad} of ${jobs.length} failed.`); process.exit(1); }
}
