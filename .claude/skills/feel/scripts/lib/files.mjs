// Walk a project's own source files (never node_modules, builds, Pods or .git).
import fs from "node:fs";
import path from "node:path";

const SKIP = new Set(["node_modules", ".git", ".next", ".nuxt", ".svelte-kit", ".output", ".vercel", ".turbo", ".expo", "dist", "build", "out", "coverage", "Pods", "DerivedData", ".build", ".feel", ".cache", "vendor", "android", "ios-build", "storybook-static", ".idea", ".vscode", "compiled", "generated", "__generated__"]);
export const SOURCE = /\.(tsx|jsx|ts|js|mjs|vue|svelte|astro|html|css|scss|sass|less|swift)$/i;

export function walk(root, { max = 6000, maxBytes = 400_000 } = {}) {
  const out = [];
  const stack = [root];
  while (stack.length && out.length < max) {
    const d = stack.pop();
    let entries;
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.name.startsWith(".") && e.name !== ".storybook") { if (e.isDirectory()) continue; }
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!SKIP.has(e.name) && !e.name.endsWith(".xcassets")) stack.push(p); continue; }
      if (!SOURCE.test(e.name) || /\.(min|bundle|generated)\.|\.d\.ts$/.test(e.name)) continue;
      try { if (fs.statSync(p).size > maxBytes) continue; } catch { continue; }
      out.push(p);
    }
  }
  return out.sort();
}

export const rel = (root, p) => path.relative(root, p).split(path.sep).join("/");
export function readJson(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }
export function lineOf(text, index) { let n = 1; for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++; return n; }
