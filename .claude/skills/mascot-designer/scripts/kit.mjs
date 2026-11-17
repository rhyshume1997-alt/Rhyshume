#!/usr/bin/env node
/**
 * Mascot Designer · write the kit people drop into their app.
 *
 *   node kit.mjs <mascot folder> [--points 200]
 *
 * Reads poses/<pose>.png and mascot.json (from poses.mjs). Writes:
 *   ios/<Name>.xcassets            every pose at @1x @2x @3x, namespaced "<Name>/<pose>"
 *   ios/<Name>View.swift           SwiftUI view with every move (iOS 17+, macOS 14+)
 *   web/<slug>/<pose>.webp + mascot.json
 *   web/mascot.js                  the <mascot-view> element, movement library inside
 *   web/index.html                 try every move in the browser
 *   png/<pose>.png                 1024 px, transparent, for anything else
 * --points = the size the mascot is usually shown at, in points (default 200).
 */
import fs from "node:fs";
import path from "node:path";
import { SKILL, flags, readJSON, writeJSON, pascal, slug } from "./lib/util.mjs";
import { POSES, POSE_IDS } from "./lib/prompts.mjs";
import { resizeTo, rgb2hsl, hsl2rgb, hex } from "./lib/image.mjs";

const f = flags();
const dir = path.resolve(f._[0] || ".");
const meta = readJSON(path.join(dir, "mascot.json"));
const Name = pascal(meta.name);
const sl = slug(meta.name);
const pts = +(f.points || 200);
const motion = readJSON(path.join(SKILL, "runtime", "motion.json"));
for (const p of POSE_IDS) if (!fs.existsSync(path.join(dir, "poses", `${p}.png`))) { console.error(`Missing poses/${p}.png: run poses.mjs first.`); process.exit(2); }

// Colours for the effects, from the body colour.
const [h, s] = [meta.body.h, meta.body.s];
const grey = s < 0.14;
const ink = hex(hsl2rgb(h, grey ? 0.1 : 0.35, 0.16));
meta.colours = {
  ...(meta.colours || {}),
  body: meta.body.hex,
  ink,
  accent: meta.colours?.accent || "#FFC93C",
  confetti: meta.colours?.confetti || [meta.body.hex, "#FFC93C", "#4CC9F0", "#7BD88F", "#FF4F7B", "#FFFFFF"],
};
meta.ext = "webp";
meta.slug = sl;
writeJSON(path.join(dir, "mascot.json"), meta);

// ------------------------------------------------------------ png
fs.mkdirSync(path.join(dir, "png"), { recursive: true });
for (const p of POSE_IDS) fs.copyFileSync(path.join(dir, "poses", `${p}.png`), path.join(dir, "png", `${sl}-${p}.png`));

// ------------------------------------------------------------ web
const web = path.join(dir, "web"), wm = path.join(web, sl);
fs.mkdirSync(wm, { recursive: true });
let webBytes = 0;
for (const p of POSE_IDS) webBytes += await resizeTo(path.join(dir, "poses", `${p}.png`), path.join(wm, `${p}.webp`), 768, { webp: true, quality: 86 });
const pub = { name: meta.name, ground: meta.ground, anchors: meta.anchors, shadow: meta.shadow, colours: meta.colours, ext: "webp" };
writeJSON(path.join(wm, "mascot.json"), pub);
let js = fs.readFileSync(path.join(SKILL, "runtime", "mascot.js"), "utf8");
js = js.replace(/\/\/ MOTION:BEGIN[\s\S]*?\/\/ MOTION:END/, `const MOTION = ${JSON.stringify(stripAbout(motion))};`);
fs.writeFileSync(path.join(web, "mascot.js"), js);
// React 19 / Next.js with TypeScript: drop this anywhere in the project (types/ or next to the component).
fs.writeFileSync(path.join(web, "mascot-view.d.ts"), `// <mascot-view> for TypeScript + React 19 (Next.js App Router included).
import "react";
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "mascot-view": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string; state?: string; side?: "left" | "right"; poke?: "on" | "off"; shadow?: "on" | "off"; lazy?: boolean | ""; poses?: string;
      };
    }
  }
}
`);
const moves = Object.keys(motion.states);
fs.writeFileSync(path.join(web, "index.html"), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${meta.name} · every move</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 50% 60%,#fff,${tint(0.95)});font:16px/1.4 ui-rounded,system-ui,sans-serif;color:${ink}}
  main{text-align:center;padding:24px}
  mascot-view{width:min(360px,80vw)}
  nav{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:620px;margin:8px auto 0}
  button{font:inherit;font-weight:700;border:0;border-radius:999px;padding:10px 16px;background:#fff;color:${ink};box-shadow:0 0 0 1.5px ${meta.body.hex}55,0 6px 16px -10px #0005;cursor:pointer}
  button[aria-pressed=true]{background:${meta.body.hex};color:#fff}
  p{opacity:.6;margin-top:18px}
</style></head>
<body><main>
  <mascot-view id="m" src="./${sl}" state="appear"></mascot-view>
  <nav>${moves.map((m) => `<button data-move="${m}">${m}</button>`).join("")}<button data-side="left">point left</button></nav>
  <p>Tap ${meta.name} for a squish. This page needs a local server (npx serve) because browsers don't load files from file://.</p>
</main>
<script type="module">
  import "./mascot.js";
  const m = document.getElementById("m");
  const bs = [...document.querySelectorAll("button")];
  for (const b of bs) b.onclick = () => { m.play(b.dataset.move || "point", { side: b.dataset.side || "right" }); bs.forEach((x) => x.setAttribute("aria-pressed", x === b)); };
</script></body></html>
`);

// ------------------------------------------------------------ iOS / macOS
const ios = path.join(dir, "ios"), cat = path.join(ios, `${Name}.xcassets`), ns = path.join(cat, Name);
fs.rmSync(cat, { recursive: true, force: true });
fs.mkdirSync(ns, { recursive: true });
writeJSON(path.join(cat, "Contents.json"), { info: { author: "xcode", version: 1 } });
writeJSON(path.join(ns, "Contents.json"), { info: { author: "xcode", version: 1 }, properties: { "provides-namespace": true } });
let iosBytes = 0;
for (const p of POSE_IDS) {
  const set = path.join(ns, `${p}.imageset`);
  fs.mkdirSync(set, { recursive: true });
  const images = [];
  for (const sc of [1, 2, 3]) {
    const file = `${sl}-${p}${sc > 1 ? `@${sc}x` : ""}.png`;
    iosBytes += await resizeTo(path.join(dir, "poses", `${p}.png`), path.join(set, file), Math.min(1024, pts * sc));
    images.push({ filename: file, idiom: "universal", scale: `${sc}x` });
  }
  writeJSON(path.join(set, "Contents.json"), { images, info: { author: "xcode", version: 1 } });
}
fs.writeFileSync(path.join(ios, `${Name}View.swift`), swift());

// ------------------------------------------------------------ guide
const guide = `# ${meta.name}

${meta.role ? meta.role + "\n\n" : ""}## The moves

| Move | Use it for |
|---|---|
${[["idle", "Always: breathing and blinking"], ["appear", "Arriving: first launch, a sheet opening"], ...POSES.filter((p) => !["idle", "blink"].includes(p.id)).map((p) => [{ wave: "hello" }[p.id] || p.id, p.use[0].toUpperCase() + p.use.slice(1)])].map(([m, u]) => `| \`${m}\` | ${u} |`).join("\n")}

Tap = a squish, on top of any move.

## In Xcode (iOS 17+, macOS 14+)

1. Drag \`ios/${Name}.xcassets\` and \`ios/${Name}View.swift\` into your project (tick your app target).
2. Use it:

\`\`\`swift
${Name}View(move: .hello)
    .frame(width: ${pts}, height: ${pts})

// switch moves as things happen
@State var move: ${Name}Move = .idle
${Name}View(move: move) { finished in /* a one-shot ended, it's back to idle */ }
Button("Save") { move = .think; save { ok in move = ok ? .celebrate : .oops } }
\`\`\`

## On the web

Copy \`web/mascot.js\` and the \`web/${sl}\` folder to your site:

\`\`\`html
<script type="module" src="/mascot.js"></script>
<mascot-view src="/${sl}" state="idle" style="width:${pts}px"></mascot-view>
<script type="module">
  document.querySelector("mascot-view").play("celebrate");
</script>
\`\`\`

React / Next.js: put \`mascot.js\` and \`${sl}/\` in \`public/\`, load the script once in the root layout (\`<Script type="module" src="/mascot.js" strategy="afterInteractive" />\` from next/script), copy \`web/mascot-view.d.ts\` into the project for TypeScript, then render \`<mascot-view src="/${sl}" state={move} />\` in a client component. For one-shots, call \`.play("celebrate")\` on a ref.

Open \`web/index.html\` through a local server (\`npx serve web\`) to try every move.
`;
fs.writeFileSync(path.join(dir, "HOW TO USE.md"), guide);

console.log(`Kit written in ${dir}`);
console.log(`  ios/${Name}.xcassets (${(iosBytes / 1024 / 1024).toFixed(1)} MB) + ios/${Name}View.swift`);
console.log(`  web/mascot.js + web/${sl}/ (${Math.round(webBytes / 1024)} KB for all 9 poses)`);
console.log(`  png/ (1024 px) and HOW TO USE.md`);

// ------------------------------------------------------------ helpers
function tint(l) { return hex(hsl2rgb(h, grey ? 0.1 : 0.8, l)); }
function stripAbout(m) { const c = JSON.parse(JSON.stringify(m)); delete c.about; for (const s of Object.values(c.states)) delete s.about; delete c.poke.about; return c; }
function swiftColour(hx) { const [r, g, b] = hx.replace("#", "").match(/../g).map((x) => (parseInt(x, 16) / 255).toFixed(3)); return `Color(red: ${r}, green: ${g}, blue: ${b})`; }
function num(v) { return Number.isInteger(v) ? v.toFixed(1) : String(v); }
function keys(arr) { const E = { linear: 0, in: 1, out: 2, inOut: 3 }; return `[${arr.map(([t, v, e]) => `.init(t: ${num(t)}, v: ${num(v)}, e: ${E[e] ?? 0})`).join(", ")}]`; }
function swift() {
  const m = stripAbout(motion);
  const states = Object.entries(m.states).map(([id, s]) => {
    const tracks = Object.entries(s.tracks || {}).map(([k, v]) => `"${k}": ${keys(v)}`).join(",\n            ");
    return `        "${id}": __NAME__State(duration: ${num(s.duration)}, loop: ${s.loop === undefined ? "nil" : num(s.loop)}, next: ${s.next ? `"${s.next}"` : "nil"}, blink: ${!!s.blink},
            frames: [${s.frames.map(([t, p]) => `(${num(t)}, "${p}")`).join(", ")}],
            tracks: [${tracks ? "\n            " + tracks + "\n            " : ":"}],
            fx: [${(s.fx || []).map(([t, x]) => `(${num(t)}, "${x}")`).join(", ")}], loopFx: ${s.loopFx ? `"${s.loopFx}"` : "nil"})`;
  }).join(",\n");
  const body = `    static let blend = ${num(m.blend)}
    static let crossfade = ${num(m.crossfade)}
    static let blinkDuration = ${num(m.blink.duration)}
    static let blinkEvery: [Double] = [${m.blink.every.map(num).join(", ")}]
    static let pokeDuration = ${num(m.poke.duration)}
    static let pokeEyes = (${num(m.poke.eyes[0])}, ${num(m.poke.eyes[1])})
    static let pokeSy: [__NAME__Key] = ${keys(m.poke.tracks.sy)}
    static let pokeSx: [__NAME__Key] = ${keys(m.poke.tracks.sx)}
    static let states: [String: __NAME__State] = [
${states}
    ]`;
  let src = fs.readFileSync(path.join(SKILL, "runtime", "MascotView.swift"), "utf8");
  const A = meta.anchors;
  const rep = {
    __MOTION__: body,
    __DISPLAY__: meta.name.replace(/"/g, '\\"'),
    __GROUND__: num(meta.ground),
    __SHADOWW__: meta.shadow ? num(meta.shadow.w) : "nil",
    __SHADOW__: meta.shadow ? "true" : "false",
    __CX__: num(A.cx), __TOP__: num(A.top), __LEFT__: num(A.left), __RIGHT__: num(A.right),
    __INK__: swiftColour(ink), __SPARK__: swiftColour(meta.colours.accent),
    __CONFETTI__: `[${meta.colours.confetti.map(swiftColour).join(", ")}]`,
  };
  for (const [k, v] of Object.entries(rep)) src = src.split(k).join(v);
  return src.split("__NAME__").join(Name);
}
