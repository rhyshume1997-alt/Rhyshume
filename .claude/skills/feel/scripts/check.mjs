#!/usr/bin/env node
// FEEL · check.mjs: read the code for motion that will feel wrong, before anyone runs it.
//
//   node check.mjs [project dir] [--changed] [--files a.tsx,b.css] [--json]
//
// --changed  only the files git says changed (what FEEL just wrote)
// Rules come from references/principles.md. "fix" = a person would feel it; "look" = judge it.
// Exit code 1 when anything is "fix".
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { walk, rel, lineOf } from "./lib/files.mjs";

const args = process.argv.slice(2);
const root = path.resolve(args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--files") || ".");
let files = walk(root);
const allFiles = files;
if (args.includes("--changed")) {
  const g = spawnSync("git", ["-C", root, "status", "--porcelain", "--untracked-files=all"], { encoding: "utf8" });
  if (g.status === 0) {
    const changed = new Set(g.stdout.split("\n").filter(Boolean).map((l) => path.resolve(root, l.slice(3).replace(/^"|"$/g, "").split(" -> ").pop())));
    files = files.filter((f) => changed.has(f));
  }
}
const fi = args.indexOf("--files");
if (fi >= 0 && args[fi + 1]) { const want = new Set(args[fi + 1].split(",").map((f) => path.resolve(root, f))); files = files.filter((f) => want.has(f)); }

const LAYOUT = "width|height|top|left|right|bottom|inset|margin(?:-[a-z]+)?|padding(?:-[a-z]+)?|max-height|max-width|min-height|font-size|letter-spacing|line-height";
const LOADER = /spin|loader|loading|skeleton|shimmer|pulse|marquee|ticker|blink|caret|progress|indeterminate|ping|bounce-dot|typing/i;
const findings = [];
const add = (file, text, index, sev, id, says, fix) => findings.push({ file: rel(root, file), line: lineOf(text, index), sev, id, says, fix });

const ms = (v, unit) => (unit === "s" ? parseFloat(v) * 1000 : parseFloat(v));
function cssRules(file, text) {
  // transition: all / no property
  const values = [...text.matchAll(/transition(?:-property)?\s*:\s*([^;}{"'`]+)/g), ...text.matchAll(/transition(?:Property)?\s*:\s*["'`]([^"'`]+)["'`]/g)];
  for (const m of values) {
    const v = m[1].trim();
    if (!v) continue;
    if (/^(none|inherit|initial|unset|var\()/.test(v)) continue;
    if (/(^|,)\s*all\b/.test(v) || /^\d/.test(v)) add(file, text, m.index, "fix", "transition-all", "transitions every property, so layout and colour changes animate by accident", "name what moves: transition: scale 120ms …, opacity …");
    const lay = v.match(new RegExp(`(?:^|[\\s,])(${LAYOUT})(?=[\\s,]|$)`));
    if (lay) add(file, text, m.index, /height/.test(lay[1]) ? "look" : "fix", "layout-transition", `animates ${lay[1]}: the browser redoes layout every frame (jank on phones)`, /height/.test(lay[1]) ? "for an accordion use grid-template-rows 0fr→1fr or interpolate-size; otherwise transform/opacity" : "move it with transform (translate/scale) and opacity");
    for (const d of v.matchAll(/(\d*\.?\d+)(ms|s)\b/g)) {
      const t = ms(d[1], d[2]);
      if (t > 60000) break; // the long-delay autofill trick, not motion
      if (t > 500) add(file, text, m.index, "look", "slow", `a ${t} ms transition (interface motion is 100–500 ms; only big page or hero moves go longer)`, "use --feel-slow or shorter");
      break;
    }
    if (/\bease-in\b(?!-out)/.test(v)) add(file, text, m.index, "look", "ease-in", "ease-in starts slowly, so a response to a tap feels late", "ease-out (--feel-out) for things arriving or answering; ease-in only for exits");
  }
  // animation durations and infinite loops
  for (const m of text.matchAll(/animation\s*:\s*([^;}{"'`]+)/g)) {
    const v = m[1];
    if (/^\s*(none|var\()/.test(v)) continue;
    const d = v.match(/(\d*\.?\d+)(ms|s)\b/);
    const t = d ? ms(d[1], d[2]) : 0;
    if (/infinite/.test(v)) { if (!LOADER.test(v)) add(file, text, m.index, "look", "infinite", "something animates forever: motion nobody asked for pulls the eye from the content", "keep endless motion for loaders; stop it otherwise"); continue; }
    if (t > 1000) add(file, text, m.index, "look", "slow", `a ${t} ms animation`, "interface motion is 100–500 ms");
  }
  // keyframes that animate layout
  for (const m of text.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)) {
    if (LOADER.test(m[1])) continue;
    const lay = m[2].match(new RegExp(`[{;\\s](${LAYOUT})\\s*:`));
    if (lay) add(file, text, m.index, "fix", "layout-keyframes", `@keyframes ${m[1]} animates ${lay[1]}`, "use transform and opacity");
    if (/(?:scale\s*:\s*0\s*[;}]|scale\(0\))/.test(m[2])) add(file, text, m.index, "look", "from-zero", `@keyframes ${m[1]} grows from nothing (scale 0): it reads as popping out of a hole`, "start at 0.9–0.96 with opacity 0");
  }
  // hover motion that sticks on touch screens
  if (/:hover[^{]*\{[^}]*(transform|translate|scale)\s*:/.test(text) && !/@media\s*\(\s*hover\s*:\s*hover/.test(text) && !/\(any-hover/.test(text)) {
    const i = text.search(/:hover[^{]*\{[^}]*(transform|translate|scale)\s*:/);
    add(file, text, i, "look", "sticky-hover", "a hover that moves things, not limited to devices that hover: on a phone it sticks after a tap", "wrap it in @media (hover: hover) and (pointer: fine)");
  }
  const wc = [...text.matchAll(/will-change\s*:\s*(?!auto)/g)];
  if (wc.length > 4) add(file, text, wc[4].index, "look", "will-change", `will-change on ${wc.length} rules: each one holds a GPU layer all the time`, "set it only while something moves, or not at all");
}

function tailwindRules(file, text) {
  for (const m of text.matchAll(/(?:class(?:Name)?=|cn\(|clsx\(|cva\(|tw`)[^>]{0,400}?\btransition-all\b/g)) add(file, text, m.index + m[0].indexOf("transition-all"), "fix", "transition-all", "transition-all: every property animates, layout included", "transition-[scale,opacity] or transition-transform, transition-colors");
  for (const m of text.matchAll(new RegExp(`\\btransition-\\[[^\\]]*\\b(${LAYOUT})\\b[^\\]]*\\]`, "g"))) add(file, text, m.index, /height/.test(m[1]) ? "look" : "fix", "layout-transition", `animates ${m[1]}`, "transform and opacity");
  for (const m of text.matchAll(/\bduration-(\d{3,4})\b/g)) { const t = +m[1]; if (t > 500) add(file, text, m.index, "look", "slow", `duration-${t}`, "interface motion is 100–500 ms"); }
  for (const m of text.matchAll(/(?<![\w-])ease-in(?![\w-])/g)) { if (/class|cn\(|clsx/.test(text.slice(Math.max(0, m.index - 300), m.index))) add(file, text, m.index, "look", "ease-in", "ease-in on something that responds to a tap feels late", "ease-out for arrivals, ease-in for exits only"); }
  for (const m of text.matchAll(/\b(?:data-\[state=open\]:)?(?:zoom-in-0|scale-0)\b/g)) add(file, text, m.index, "look", "from-zero", "grows from nothing (scale 0)", "start at 95% (zoom-in-95) with a fade");
}

function jsRules(file, text) {
  // motion / framer-motion
  for (const m of text.matchAll(/duration\s*:\s*(\d*\.?\d+)/g)) {
    const before = text.slice(Math.max(0, m.index - 160), m.index);
    if (!/transition|animate|withTiming|initial|exit|whileTap|spring|Animated\./.test(before)) continue;
    let v = parseFloat(m[1]);
    const isMs = v > 20 || /withTiming|Animated\./.test(before);
    const t = isMs ? v : v * 1000;
    if (t > 1000 && !LOADER.test(before)) add(file, text, m.index, "look", "slow", `a ${Math.round(t)} ms animation`, "interface motion is 100–500 ms");
  }
  for (const m of text.matchAll(/bounce\s*:\s*(0?\.\d+|1)/g)) if (parseFloat(m[1]) > 0.4) add(file, text, m.index, "look", "too-bouncy", `bounce ${m[1]}: things wobble after they arrive`, "0–0.3; edges (sheets, drawers) never bounce");
  for (const m of text.matchAll(/\.style\.(top|left|width|height|marginTop|marginLeft)\s*=/g)) {
    const around = text.slice(Math.max(0, m.index - 600), m.index);
    if (/requestAnimationFrame|pointermove|mousemove|touchmove|onDrag|scroll/.test(around)) add(file, text, m.index, "fix", "layout-from-script", `moves it by setting style.${m[1]} every frame`, "set style.transform = translate3d(…) instead");
  }
  if (/navigator\.vibrate/.test(text)) add(file, text, text.indexOf("navigator.vibrate"), "look", "vibrate", "navigator.vibrate does nothing on iPhone", "treat it as a bonus on Android only");
  for (const m of text.matchAll(/useNativeDriver\s*:\s*false/g)) add(file, text, m.index, "look", "js-driver", "an Animated animation on the JS thread: it stutters whenever JS is busy", "useNativeDriver: true for transform/opacity, or Reanimated");
  // A toast with no announcement
  if (/class(?:Name)?=["'`][^"'`]*\btoast\b/.test(text) && !/role=["'{]*(status|alert)|aria-live/.test(text) && !/sonner|react-hot-toast|react-toastify/.test(text)) {
    add(file, text, text.search(/class(?:Name)?=["'`][^"'`]*\btoast\b/), "fix", "toast-silent", "a toast screen readers never hear", "role=\"status\" (or aria-live=\"polite\") on the toast or its container");
  }
}

function swiftRules(file, text) {
  for (const m of text.matchAll(/\.animation\(\s*(\.[A-Za-z]+(?:\([^()]*\))?|nil|[A-Za-z.]+)\s*\)/g)) add(file, text, m.index, "fix", "animation-no-value", ".animation(_:) without value: is deprecated and animates every change in the view", ".animation(.snappy, value: thing) or withAnimation at the change");
  for (const m of text.matchAll(/withAnimation\(\s*\.linear/g)) add(file, text, m.index, "look", "linear", "a linear animation on interface: it starts and stops like a machine", ".snappy / .smooth, or a spring");
  for (const m of text.matchAll(/\.easeIn\b(?!Out)/g)) add(file, text, m.index, "look", "ease-in", ".easeIn on something the person triggered feels late", ".snappy or .easeOut");
  for (const m of text.matchAll(/(?:\.easeInOut|\.easeOut|\.easeIn|\.linear|\.smooth|\.snappy|\.bouncy|\.spring)\(duration:\s*(\d*\.?\d+)/g)) if (parseFloat(m[1]) > 0.6) add(file, text, m.index, "look", "slow", `a ${m[1]} s animation`, "0.2–0.45 s for interface");
  for (const m of text.matchAll(/\.spring\(response:\s*(\d*\.?\d+)/g)) if (parseFloat(m[1]) > 0.6) add(file, text, m.index, "look", "slow", `a spring with response ${m[1]}`, "0.3–0.5");
  for (const m of text.matchAll(/(?:extraBounce|bounce):\s*(0?\.\d+)/g)) if (parseFloat(m[1]) > 0.4) add(file, text, m.index, "look", "too-bouncy", `bounce ${m[1]}`, "0–0.3");
  for (const m of text.matchAll(/\.onTapGesture\s*\{/g)) {
    const before = text.slice(Math.max(0, m.index - 400), m.index);
    if (!/\.accessibilityAddTraits\(\.isButton\)/.test(text.slice(m.index, m.index + 400)) && !/Button\s*\{|Button\(/.test(before.slice(-120))) add(file, text, m.index, "look", "tap-gesture", "a tap gesture has no pressed state and VoiceOver doesn't call it a button", "Button(action:) { … }.buttonStyle(FeelPress())");
  }
}

for (const f of files) {
  let text;
  try { text = fs.readFileSync(f, "utf8"); } catch { continue; }
  if (/(^|[\\/])(feel\.css|feel\.global\.js|Feel\.swift|feel\.tsx)$|[\\/]feel[\\/](drag|spring|presence|nav|react)\.(ts|js)$/.test(f)) continue; // the kit itself
  if (/\.(css|scss|sass|less)$/.test(f)) cssRules(f, text);
  else if (/\.(vue|svelte|astro|html)$/.test(f)) { cssRules(f, text); tailwindRules(f, text); jsRules(f, text); }
  else if (/\.(tsx|jsx|ts|js|mjs)$/.test(f)) { tailwindRules(f, text); jsRules(f, text); if (/transition|animation|@keyframes|:hover/.test(text)) cssRules(f, text); }
  else if (f.endsWith(".swift")) swiftRules(f, text);
}

// Project-wide: does anything respect "reduce motion"?
const motionRe = /transition\s*:|animation\s*:|@keyframes|\banimate-|<motion\.|withAnimation|\.animation\(|withSpring|withTiming|Animated\.|\btransition-(?:all|transform|colors|opacity)/;
const reducedRe = /prefers-reduced-motion|motion-reduce:|motion-safe:|useReducedMotion|accessibilityReduceMotion|isReduceMotionEnabled|ReduceMotion|reducedMotion=/;
let anyMotion = false, anyReduced = false;
for (const f of allFiles) { let t; try { t = fs.readFileSync(f, "utf8"); } catch { continue; } if (motionRe.test(t)) anyMotion = true; if (reducedRe.test(t)) anyReduced = true; if (anyMotion && anyReduced) break; }
if (anyMotion && !anyReduced) findings.push({ file: "(whole app)", line: 0, sev: "fix", id: "no-reduced-motion", says: "nothing in the app respects \"reduce motion\"", fix: "feel.css / Feel.swift / feel.tsx handle it for their moves; anything else needs a prefers-reduced-motion / accessibilityReduceMotion / useReducedMotion branch" });

// Same finding many times in one file: keep the first three.
const seen = {};
const kept = findings.filter((x) => { const k = `${x.file}|${x.id}`; seen[k] = (seen[k] || 0) + 1; return seen[k] <= 3; });
const extra = Object.entries(seen).filter(([, n]) => n > 3);
if (args.includes("--json")) { console.log(JSON.stringify({ findings: kept, more: Object.fromEntries(extra) }, null, 2)); process.exit(kept.some((x) => x.sev === "fix") ? 1 : 0); }
const fixes = kept.filter((x) => x.sev === "fix"), looks = kept.filter((x) => x.sev === "look");
console.log(`FEEL check · ${files.length} file(s) read · ${fixes.length} to fix · ${looks.length} to look at`);
for (const x of [...fixes, ...looks]) console.log(`${x.sev === "fix" ? "✗ fix " : "· look"}  ${x.file}${x.line ? ":" + x.line : ""}  ${x.says}\n        → ${x.fix}`);
for (const [k, n] of extra) { const [f, id] = k.split("|"); console.log(`        (+${n - 3} more "${id}" in ${f})`); }
process.exit(fixes.length ? 1 : 0);
