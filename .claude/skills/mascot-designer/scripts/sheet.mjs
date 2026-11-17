#!/usr/bin/env node
/**
 * Mascot Designer · the character sheet: one poster with the name, what it
 * stands for, its palette, the hero pose and every move. 2400 x 1600 PNG.
 *
 *   node sheet.mjs <mascot folder> [--out file.png]
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SKILL, flags, readJSON, fileUrl } from "./lib/util.mjs";
import { launch } from "./lib/browser.mjs";
import { hsl2rgb, hex } from "./lib/image.mjs";
import { STYLES } from "./lib/prompts.mjs";

const f = flags();
const dir = path.resolve(f._[0] || ".");
const meta = readJSON(path.join(dir, "mascot.json"));
const out = path.resolve(f.out || path.join(dir, `${meta.name} character sheet.png`));
const { h, s } = meta.body;
const grey = s < 0.14;
const col = (sat, l) => hex(hsl2rgb(h, grey ? Math.min(sat, 0.12) : sat, l));
const poses = Object.fromEntries(["idle", "blink", "wave", "think", "celebrate", "oops", "sleep", "point", "love"].map((p) => [p, fileUrl(path.join(dir, "poses", `${p}.png`))]));
const facts = [];
if (meta.represents) facts.push(["Stands for", meta.represents]);
if (meta.personality) facts.push(["Personality", meta.personality]);
facts.push(["Look", STYLES[meta.style]?.name || meta.style]);
if (meta.app) facts.push(["Made for", meta.app]);
const sheet = {
  name: meta.name, role: meta.role, kicker: meta.app ? `${meta.app} · mascot` : "Mascot",
  facts, poses,
  palette: [...new Set([...(meta.brand ? [String(meta.brand).toLowerCase()] : []), ...(meta.palette || []).map((c) => c.hex)])].slice(0, 5),
  theme: { body: meta.body.hex, tint: col(0.85, 0.96), tint2: col(0.8, 0.88), deep: col(0.55, 0.27), ink: col(0.35, 0.13) },
};
const browser = await launch();
try {
  const page = await browser.newPage({ viewport: { width: 2400, height: 1600 }, deviceScaleFactor: 1 });
  await page.addInitScript((S) => { window.SHEET = S; }, sheet);
  await page.goto(fileUrl(path.join(SKILL, "demo", "sheet.html")), { waitUntil: "load" });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))); });
  await page.screenshot({ path: out, type: "png" });
} finally { await browser.close(); }
console.log(out);
