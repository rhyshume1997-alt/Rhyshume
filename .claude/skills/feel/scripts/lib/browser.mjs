// The person's own Chrome, Edge, Brave or Chromium, headless, with a throwaway profile,
// driven over the DevTools protocol through a pipe: no packages, no open ports.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const exists = (p) => { try { return fs.existsSync(p); } catch { return false; } };
const sh = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: "utf8" }); return { code: r.status, out: r.stdout || "" }; };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export function tmpProfile() { return fs.mkdtempSync(path.join(os.tmpdir(), "feel-chrome-")); }

export function findBrowser() {
  const env = process.env.FEEL_BROWSER || process.env.CHROME_PATH;
  if (env && exists(env)) return env;
  const c = [];
  if (process.platform === "darwin") {
    for (const app of ["Google Chrome", "Chromium", "Microsoft Edge", "Brave Browser", "Google Chrome Canary"])
      c.push(`/Applications/${app}.app/Contents/MacOS/${app}`, path.join(os.homedir(), `Applications/${app}.app/Contents/MacOS/${app}`));
  } else if (process.platform === "win32") {
    const roots = [process.env["PROGRAMFILES"], process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA].filter(Boolean);
    for (const r of roots) c.push(
      path.join(r, "Google", "Chrome", "Application", "chrome.exe"),
      path.join(r, "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(r, "BraveSoftware", "Brave-Browser", "Application", "brave.exe"),
      path.join(r, "Chromium", "Application", "chrome.exe"),
    );
  } else {
    for (const n of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge", "brave-browser"]) {
      const w = sh("which", [n]);
      if (w.code === 0 && w.out.trim()) c.push(w.out.trim());
    }
  }
  const pw = path.join(os.homedir(), process.platform === "darwin" ? "Library/Caches/ms-playwright" : process.platform === "win32" ? "AppData/Local/ms-playwright" : ".cache/ms-playwright");
  try {
    for (const d of fs.readdirSync(pw).filter((d) => d.startsWith("chromium")).sort().reverse()) {
      c.push(path.join(pw, d, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"), path.join(pw, d, "chrome-linux", "chrome"), path.join(pw, d, "chrome-win", "chrome.exe"));
    }
  } catch {}
  return c.find((p) => exists(p)) || null;
}

/** A minimal DevTools-protocol client over Chrome's --remote-debugging-pipe. */
export function launch(browser, profile, { headless = true } = {}) {
  const child = spawn(browser, [
    ...(headless ? ["--headless=new"] : []), "--remote-debugging-pipe", "--no-first-run", "--no-default-browser-check", "--force-color-profile=srgb",
    "--hide-scrollbars", "--mute-audio", "--disable-extensions", "--disable-background-networking", "--disable-component-update",
    "--disable-sync", "--disable-features=Translate,MediaRouter", `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe", "pipe", "pipe"], windowsHide: true });
  const out = child.stdio[3], inp = child.stdio[4];
  let buf = "", id = 0;
  const waiting = new Map();
  const listeners = new Set();
  inp.on("data", (d) => {
    buf += d.toString("utf8");
    let i;
    while ((i = buf.indexOf("\0")) >= 0) {
      const raw = buf.slice(0, i);
      buf = buf.slice(i + 1);
      let msg; try { msg = JSON.parse(raw); } catch { continue; }
      if (msg.id && waiting.has(msg.id)) {
        const { resolve, reject } = waiting.get(msg.id);
        waiting.delete(msg.id);
        msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      } else for (const l of listeners) l(msg);
    }
  });
  let dead = null;
  const fail = (e) => { dead = e; for (const { reject } of waiting.values()) reject(e); waiting.clear(); };
  child.on("error", fail);
  child.on("exit", () => fail(new Error("the browser closed")));
  out.on("error", () => {});
  const send = (method, params = {}, sessionId, timeout = 30000) => new Promise((resolve, reject) => {
    if (dead) return reject(dead);
    const mid = ++id;
    const t = setTimeout(() => { waiting.delete(mid); reject(new Error(`${method} took too long`)); }, timeout);
    waiting.set(mid, { resolve: (r) => { clearTimeout(t); resolve(r); }, reject: (e) => { clearTimeout(t); reject(e); } });
    out.write(JSON.stringify({ id: mid, method, params, ...(sessionId ? { sessionId } : {}) }) + "\0");
  });
  return { child, send, on: (fn) => listeners.add(fn), off: (fn) => listeners.delete(fn) };
}

