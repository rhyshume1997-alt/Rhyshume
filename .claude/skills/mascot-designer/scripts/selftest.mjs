#!/usr/bin/env node
/**
 * Mascot Designer · self-test (run by doctor.mjs): draws a stand-in mascot,
 * then runs the real pipeline on it: clean + align + blink splice (poses.mjs)
 * and the kit (kit.mjs). No image model, no network.
 *
 *   node selftest.mjs <empty folder>
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { SKILL, sharp } from "./lib/util.mjs";
import { POSE_IDS } from "./lib/prompts.mjs";

const dir = path.resolve(process.argv[2] || fs.mkdtempSync("mascot-selftest-"));
fs.mkdirSync(path.join(dir, "raw"), { recursive: true });
const S = sharp();
// A round coral body with feet and eyes; the blink closes the eyes; poses shift arms.
const body = (eyes, arm = 0) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024">
  <ellipse cx="400" cy="900" rx="60" ry="40" fill="#d0583f"/><ellipse cx="624" cy="900" rx="60" ry="40" fill="#d0583f"/>
  <circle cx="512" cy="600" r="290" fill="#e8735a"/>
  <ellipse cx="${250 - arm}" cy="${640 - arm * 2}" rx="60" ry="100" fill="#d0583f"/><ellipse cx="774" cy="640" rx="60" ry="100" fill="#d0583f"/>
  ${eyes ? '<ellipse cx="420" cy="560" rx="34" ry="44" fill="#1b1b1b"/><ellipse cx="604" cy="560" rx="34" ry="44" fill="#1b1b1b"/>'
         : '<path d="M386 566 q34 -24 68 0" stroke="#1b1b1b" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M570 566 q34 -24 68 0" stroke="#1b1b1b" stroke-width="14" fill="none" stroke-linecap="round"/>'}
  <path d="M470 660 q42 30 84 0" stroke="#5a1f14" stroke-width="12" fill="none" stroke-linecap="round"/>
</svg>`;
for (const p of POSE_IDS) {
  const svg = p === "blink" ? body(false) : body(true, p === "wave" ? 60 : p === "point" ? -40 : 0);
  await S(Buffer.from(svg)).png().toFile(path.join(dir, "raw", `${p}.png`));
}
fs.writeFileSync(path.join(dir, "mascot.json"), JSON.stringify({ name: "Testy", style: "clay" }));
const run = (s, ...a) => spawnSync(process.execPath, [path.join(SKILL, "scripts", s), ...a], { encoding: "utf8" });
let r = run("poses.mjs", dir);
if (r.status !== 0) { console.error(r.stdout + r.stderr); process.exit(1); }
if (!/blink spliced/.test(r.stdout)) { console.error("blink was not spliced:\n" + r.stdout); process.exit(1); }
r = run("kit.mjs", dir, "--points", "120");
if (r.status !== 0) { console.error(r.stdout + r.stderr); process.exit(1); }
const must = ["poses/idle.png", "ios/Testy.xcassets/Testy/celebrate.imageset/Contents.json", "ios/TestyView.swift", "web/mascot.js", "web/testy/mascot.json", "web/testy/love.webp", "HOW TO USE.md"];
const gone = must.filter((m) => !fs.existsSync(path.join(dir, m)));
if (gone.length) { console.error("missing: " + gone.join(", ")); process.exit(1); }
const swift = fs.readFileSync(path.join(dir, "ios", "TestyView.swift"), "utf8");
if (/__[A-Z]+__/.test(swift)) { console.error("unfilled placeholders in the Swift view"); process.exit(1); }
const xc = spawnSync("xcrun", ["--find", "swiftc"], { encoding: "utf8" });
if (xc.status === 0) {
  const t = spawnSync("xcrun", ["--sdk", "macosx", "swiftc", "-typecheck", "-target", `${process.arch === "arm64" ? "arm64" : "x86_64"}-apple-macos14.0`, path.join(dir, "ios", "TestyView.swift")], { encoding: "utf8" });
  if (t.status !== 0) { console.error("Swift view doesn't type-check:\n" + t.stderr.slice(0, 1500)); process.exit(1); }
}
console.log("selftest ok");
