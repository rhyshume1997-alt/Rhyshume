#!/usr/bin/env node
/**
 * Mascot Designer · the whole job, step by step. Every step reads and writes
 * the mascot's folder (~/Desktop/Mascots/<Name>/), so any step can be re-run.
 *
 *   node make.mjs concepts <folder> [--count 3]   draw concepts from brief.json  -> concepts/1.png …, concepts/sheet.png
 *   node make.mjs pick <folder> <n>               concept n becomes the mascot (raw/idle.png)
 *   node make.mjs poses <folder> [--only think,hello] [--note "keep it standing"]
 *        draw the other 8 poses from raw/idle.png (or just those, steered by the note; the
 *        earlier attempt is kept in raw/attempts/), then clean + align them
 *   node make.mjs restore <folder> <pose> <n>     bring back raw/attempts/<pose>-<n>.png
 *   node make.mjs check <folder>                  the pose sheet + numbers to look at (qa/)
 *   node make.mjs finish <folder>                 kit + character sheet + film
 *
 * brief.json (written by Claude after the interview):
 *   { "name", "app", "style", "character", "colour", "feature", "personality",
 *     "represents", "role",
 *     "concepts": [ { "character", "colour", "feature", "role"? }, …3 different ideas ],
 *     "lines": { hello, empty, think, success, toast, oops, tip, loveTitle, love, items[3], macTitle, macSub, sync, synced } }
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { SKILL, flags, readJSON, writeJSON } from "./lib/util.mjs";
import { masterPrompt, posePrompt, POSE_IDS, POSE_ALIAS, CONCEPT_TWISTS, STYLES } from "./lib/prompts.mjs";
import { provider } from "./gen.mjs";

const f = flags();
const [cmd, folder, arg] = f._;
if (!cmd || !folder) { console.error("Usage: node make.mjs concepts|pick|poses|restore|check|finish <folder>"); process.exit(2); }
const dir = path.resolve(folder);
const node = (script, ...a) => {
  const r = spawnSync(process.execPath, [path.join(SKILL, "scripts", script), ...a], { stdio: "inherit" });
  if (r.status !== 0) { console.error(`${script} failed.`); process.exit(r.status || 1); }
};
const brief = () => {
  const b = readJSON(path.join(dir, "brief.json"));
  if (!STYLES[b.style]) { console.error(`brief.json: style must be one of ${Object.keys(STYLES).join(", ")}`); process.exit(2); }
  for (const k of ["name", "character"]) if (!b[k]) { console.error(`brief.json needs "${k}"`); process.exit(2); }
  return b;
};
function syncMeta(b) {
  const m = readJSON(path.join(dir, "mascot.json"), {});
  Object.assign(m, { name: b.name, app: b.app, style: b.style, role: b.role, represents: b.represents, personality: b.personality, brand: b.brand || m.brand, lines: b.lines || m.lines });
  writeJSON(path.join(dir, "mascot.json"), m);
}
function needDrawing() {
  const way = provider();
  if (way === "none") { console.error("No OpenAI account on this computer (no OPENAI_API_KEY, no signed-in Codex). Use the ready-made library: library.mjs."); process.exit(3); }
  return way;
}

if (cmd === "concepts") {
  const b = brief();
  needDrawing();
  // Three genuinely different ideas (brief.concepts), each drawn once. Without
  // them, the one character is drawn three times with a push each time.
  const ideas = Array.isArray(b.concepts) && b.concepts.length ? b.concepts.slice(0, 4) : null;
  const n = ideas ? ideas.length : Math.max(1, Math.min(4, +(f.count || 3)));
  fs.mkdirSync(path.join(dir, "concepts"), { recursive: true });
  for (const p of fs.readdirSync(path.join(dir, "concepts"))) if (/^\d+\.png$/.test(p)) fs.rmSync(path.join(dir, "concepts", p));
  const jobs = Array.from({ length: n }, (_, i) => ({
    prompt: ideas ? masterPrompt(ideas[i].style || b.style, { ...b, ...ideas[i] }) : masterPrompt(b.style, b) + (CONCEPT_TWISTS[i] ? `\n${CONCEPT_TWISTS[i]}` : ""),
    out: path.join(dir, "concepts", `${i + 1}.png`),
  }));
  const jf = path.join(dir, "concepts", "jobs.json");
  writeJSON(jf, jobs);
  node("gen.mjs", "--jobs", jf, "--parallel", String(n));
  // A sheet with numbers to choose from.
  const { sharp } = await import("./lib/util.mjs");
  const S = sharp(), c = 640;
  const have = jobs.filter((j) => fs.existsSync(j.out));
  const svg = (k) => Buffer.from(`<svg width="${c}" height="${c}"><circle cx="54" cy="54" r="34" fill="#111"/><text x="54" y="67" font-size="38" font-family="Helvetica" font-weight="700" fill="#fff" text-anchor="middle">${k}</text></svg>`);
  const comps = [];
  for (const [i, j] of have.entries()) {
    comps.push({ input: await S(j.out).resize(c, c, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: i * c, top: 0 });
    comps.push({ input: svg(path.basename(j.out, ".png")), left: i * c, top: 0 });
  }
  await S({ create: { width: c * have.length, height: c, channels: 4, background: "#EEEEF2" } }).composite(comps).png().toFile(path.join(dir, "concepts", "sheet.png"));
  syncMeta(b);
  console.log(path.join(dir, "concepts", "sheet.png"));
}

else if (cmd === "pick") {
  const src = path.join(dir, "concepts", `${arg}.png`);
  if (!fs.existsSync(src)) { console.error(`No concepts/${arg}.png`); process.exit(2); }
  fs.mkdirSync(path.join(dir, "raw"), { recursive: true });
  fs.copyFileSync(src, path.join(dir, "raw", "idle.png"));
  // The chosen idea becomes the brief's character (its look, colour, feature, and its name if it has one).
  const bf = path.join(dir, "brief.json");
  const b = readJSON(bf, {});
  const idea = Array.isArray(b.concepts) ? b.concepts[+arg - 1] : null;
  if (idea) { for (const k of ["character", "colour", "feature", "style", "name", "role", "represents"]) if (idea[k]) b[k] = idea[k]; b.picked = +arg; writeJSON(bf, b); syncMeta(b); }
  console.log(`Concept ${arg} is the mascot${idea ? `: ${idea.name ? idea.name + ", " : ""}${idea.character.slice(0, 90)}${idea.character.length > 90 ? "…" : ""}` : ""}.`);
}

else if (cmd === "poses") {
  const b = brief();
  needDrawing();
  const master = path.join(dir, "raw", "idle.png");
  if (!fs.existsSync(master)) { console.error("No raw/idle.png yet: pick a concept first."); process.exit(2); }
  const only = f.only ? String(f.only).split(",").map((p) => POSE_ALIAS[p.trim()] || p.trim()) : POSE_IDS.filter((p) => p !== "idle");
  const bad = only.filter((p) => !POSE_IDS.includes(p) || p === "idle");
  if (bad.length) { console.error(`Unknown pose: ${bad.join(", ")}. Poses: ${POSE_IDS.filter((p) => p !== "idle").join(", ")} (or hello, thinking, sleeping, pointing).`); process.exit(2); }
  // A redo keeps the earlier attempt (raw/attempts/<pose>-<n>.png), so the best can come back.
  for (const p of only) {
    const cur = path.join(dir, "raw", `${p}.png`);
    if (!fs.existsSync(cur)) continue;
    fs.mkdirSync(path.join(dir, "raw", "attempts"), { recursive: true });
    let n = 1; while (fs.existsSync(path.join(dir, "raw", "attempts", `${p}-${n}.png`))) n++;
    fs.renameSync(cur, path.join(dir, "raw", "attempts", `${p}-${n}.png`));
    console.log(`  kept the earlier ${p} as raw/attempts/${p}-${n}.png`);
  }
  const note = typeof f.note === "string" ? f.note : "";
  const jobs = only.map((p) => ({ prompt: posePrompt(b.style, p, note), out: path.join(dir, "raw", `${p}.png`), refs: [master] }));
  const jf = path.join(dir, "raw", "jobs.json");
  writeJSON(jf, jobs);
  const r = spawnSync(process.execPath, [path.join(SKILL, "scripts", "gen.mjs"), "--jobs", jf, "--parallel", String(Math.min(8, jobs.length))], { stdio: "inherit" });
  if (r.status !== 0) console.error("Some poses failed: run `make.mjs poses <folder> --only <those>` again.");
  syncMeta(b);
  node("poses.mjs", dir, "--sheet");
}

else if (cmd === "restore") {
  // make.mjs restore <folder> <pose> <n>: bring back an earlier attempt
  const p = POSE_ALIAS[arg] || arg, n = f._[3];
  const src = path.join(dir, "raw", "attempts", `${p}-${n}.png`);
  if (!fs.existsSync(src)) { console.error(`No raw/attempts/${p}-${n}.png. Attempts: ${fs.existsSync(path.join(dir, "raw", "attempts")) ? fs.readdirSync(path.join(dir, "raw", "attempts")).join(", ") : "none"}`); process.exit(2); }
  fs.copyFileSync(src, path.join(dir, "raw", `${p}.png`));
  node("poses.mjs", dir, "--sheet");
}

else if (cmd === "check") {
  node("poses.mjs", dir, "--sheet");
  console.log("Look at qa/sheet.png (same character in every pose?) and qa/overlay.png (feet on the red line, bodies stacked).");
}

else if (cmd === "finish") {
  if (fs.existsSync(path.join(dir, "brief.json"))) syncMeta(brief());
  node("kit.mjs", dir, ...(f.points ? ["--points", String(f.points)] : []));
  node("sheet.mjs", dir);
  node("film.mjs", dir);
}

else { console.error(`Unknown step "${cmd}"`); process.exit(2); }
