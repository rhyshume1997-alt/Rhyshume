// A headless browser: the person's own Chrome or Edge when there is one.
// doctor --fix installs a private Chromium only if neither starts.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { SKILL, HOME, fileUrl } from "./util.mjs";

if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync(path.join(HOME, "browsers"))) process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(HOME, "browsers");

let pw;
export function playwright({ quiet = false } = {}) {
  if (pw) return pw;
  for (const base of [HOME, SKILL, process.cwd()]) {
    try { pw = createRequire(path.join(base, "package.json"))("playwright-core"); return pw; } catch {}
  }
  if (quiet) return null;
  console.error(`The browser runtime isn't installed. Run once:\n  node "${path.join(SKILL, "scripts", "doctor.mjs")}" --fix`);
  process.exit(2);
}

const LINUX = ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium", "/usr/bin/google-chrome-stable", "/usr/bin/microsoft-edge"];

export async function launch({ soft = false } = {}) {
  const { chromium } = playwright();
  const tries = [];
  if (process.env.TEARDOWN_BROWSER) tries.push({ executablePath: process.env.TEARDOWN_BROWSER });
  tries.push({ channel: "chrome" }, { channel: "msedge" }, {});
  for (const p of LINUX) if (fs.existsSync(p)) tries.push({ executablePath: p });
  const errors = [];
  for (const opts of tries) {
    try { return await chromium.launch({ headless: true, args: ["--hide-scrollbars", "--disable-blink-features=AutomationControlled"], ...opts }); }
    catch (e) { errors.push(String(e.message).split("\n")[0]); }
  }
  if (soft) return null;
  console.error("No Chrome, Edge or Chromium could start:\n  " + errors.join("\n  ") + `\nInstall Google Chrome, or run: node "${path.join(SKILL, "scripts", "doctor.mjs")}" --fix`);
  process.exit(2);
}

/** Render an HTML file to an image, waiting for fonts and images. */
export async function render(htmlFile, out, { width, height, scale = 2, fullPage = false } = {}) {
  const browser = await launch();
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: scale });
    await page.goto(fileUrl(htmlFile), { waitUntil: "load" });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
    });
    const report = await page.evaluate(() => (window.__report ? window.__report() : null));
    await page.screenshot({ path: out, fullPage, type: out.endsWith(".jpg") ? "jpeg" : "png", ...(out.endsWith(".jpg") ? { quality: 90 } : {}) });
    return report;
  } finally { await browser.close(); }
}
