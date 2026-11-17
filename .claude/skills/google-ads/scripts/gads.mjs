#!/usr/bin/env node
// Google Ads skill · the engine. Node 18+, no packages, no network: it never talks to Google.
// It reads a file the person exported, and writes scripts the person runs.
//
//   node gads.mjs demo [--shop]             the check on an example account, nothing needed
//   node gads.mjs init                      make the ./gads folder for this business
//   node gads.mjs script                    write the read-only export script to paste into Google Ads
//   node gads.mjs check [--from file.json]  the check: settings against the brief, searches, keywords, ads
//   node gads.mjs searches [--from …] [--csv "Search terms report.csv"]   every search worth blocking, looking at or adding
//   node gads.mjs critic [--from …] | --draft ad.json                    every ad scored out of 20, or a draft before it goes live
//   node gads.mjs plan                      the settings sheet for a new campaign, from the brief
//   node gads.mjs fix <option numbers…> --ok "<the person's words>" [--skip "word, word"]
//                                           write the change script for the options they picked
//   node gads.mjs queries                   the read-only queries, for Google's connector or the API
//   node gads.mjs assemble <folder>         build an export from one JSON file per query
//
// The workspace is ./gads (or --dir <folder>, or GADS_DIR).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalize, check, render, since, briefOf, moneyFn, matchSay, RULES, GOALS } from "./engine.mjs";
import { critique, verdict, LIMITS } from "./critic.mjs";
import { exportScript, changeScript } from "./script.mjs";
import { QUERIES, ranges, fill, DAYS } from "./queries.mjs";
import { renderSheet, sheet, GOAL_LIST } from "./sheet.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const VERSION = "1.0.0";

const argv = process.argv.slice(2);
const flags = {}; const pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith("--")) { const k = a.slice(2); const nxt = argv[i + 1]; if (nxt === undefined || nxt.startsWith("--")) flags[k] = true; else { flags[k] = nxt; i++; } }
  else pos.push(a);
}
const cmd = pos[0];
function die(msg, code = 1) { console.error(msg); process.exit(code); }
if (+process.versions.node.split(".")[0] < 18) die(`Node ${process.versions.node} is too old: install Node 18 or newer from https://nodejs.org`);

const DIR = path.resolve(typeof flags.dir === "string" ? flags.dir : process.env.GADS_DIR || "gads");
const W = (...f) => path.join(DIR, ...f);
const readJson = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, "")); } catch { return d; } };
const today = () => new Date().toISOString().slice(0, 10);
const brief = () => readJson(W("brief.json"), {});
const log = (line) => { try { fs.mkdirSync(DIR, { recursive: true }); fs.appendFileSync(W("log.md"), `- ${new Date().toISOString().slice(0, 16).replace("T", " ")} · ${line}\n`); } catch {} };

/** The export to read: --from, or the newest .json in gads/exports. */
function findExport() {
  if (typeof flags.from === "string") { if (!fs.existsSync(flags.from)) die(`Can't find ${flags.from}.`); return flags.from; }
  const dir = W("exports");
  let files = [];
  try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => ({ f: path.join(dir, f), t: fs.statSync(path.join(dir, f)).mtimeMs })); } catch {}
  if (!files.length) die(`No export yet. Run "gads script", paste it into Google Ads (Tools → Bulk actions → Scripts), run it, and put the file it saves to your Drive in ${dir}. Or pass one with --from.`);
  return files.sort((a, b) => b.t - a.t)[0].f;
}
function load(file) {
  const exp = readJson(file);
  if (!exp) die(`${file} isn't readable JSON. Download it again from Google Drive (the file itself, not a preview of it).`);
  try { return { exp, model: normalize(exp) }; } catch (e) { die(e.message); }
}
function ageNote(exp) {
  if (!exp.made) return "";
  const days = Math.floor((Date.now() - Date.parse(exp.made)) / 86400000);
  return days >= 8 ? `This export is ${days} days old: run the export script again for today's picture.\n\n` : "";
}

// ---------------------------------------------------------------- search terms from the UI's CSV
export function parseNumber(v) {
  let s = String(v ?? "").replace(/[^\d.,-]/g, "");
  if (!s || s === "-" || s === "--") return 0;
  const c = s.lastIndexOf(","), d = s.lastIndexOf(".");
  if (c > -1 && d > -1) s = c > d ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  else if (c > -1) s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  const n = Number(s); return Number.isFinite(n) ? n : 0;
}
export function parseCsv(text) {
  const rows = []; let row = [], cell = "", inQ = false;
  const sep = (text.split(/\r?\n/).find((l) => /search term/i.test(l)) || "").includes("\t") ? "\t" : ",";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; } else cell += ch; }
    else if (ch === '"') inQ = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
/** Google Ads → Insights and reports → Search terms → Download (.csv), as an export the engine reads. */
export function termsCsvToExport(text) {
  const rows = parseCsv(text.replace(/^﻿/, ""));
  const h = rows.findIndex((r) => r.some((c) => /^search term$/i.test(c.trim())));
  if (h < 0) throw new Error('This isn\'t a Search terms report: no "Search term" column. In Google Ads: Campaigns → Insights and reports → Search terms → Download → .csv (set the language to English if the columns are translated).');
  const head = rows[h].map((c) => c.trim().toLowerCase());
  const col = (...names) => head.findIndex((c) => names.includes(c));
  const iTerm = col("search term"), iCamp = col("campaign"), iGroup = col("ad group"), iStatus = col("added/excluded"), iClicks = col("clicks"), iImpr = col("impr.", "impressions"), iCost = col("cost"), iConv = col("conversions", "conv."), iVal = col("conv. value", "conversion value"), iCur = col("currency code", "currency");
  if (iCost < 0 || iClicks < 0) throw new Error('The report needs the "Clicks" and "Cost" columns (and "Conversions"): add them with the Columns button, then download again.');
  const camps = new Map(); const terms = []; let currency = "";
  for (const r of rows.slice(h + 1)) {
    const term = (r[iTerm] || "").trim();
    if (!term || /^total/i.test(term) || r.length < head.length - 2) continue;
    const cname = iCamp > -1 ? (r[iCamp] || "").trim() || "All campaigns" : "All campaigns";
    if (!camps.has(cname)) camps.set(cname, String(camps.size + 1));
    if (iCur > -1 && /^[A-Z]{3}$/.test((r[iCur] || "").trim())) currency = r[iCur].trim();
    const st = iStatus > -1 ? (r[iStatus] || "").trim().toLowerCase() : "";
    terms.push({
      campaign: { id: camps.get(cname) }, adGroup: { id: `g${camps.get(cname)}`, name: iGroup > -1 ? r[iGroup] : "" },
      searchTermView: { searchTerm: term, status: st === "excluded" ? "EXCLUDED" : st === "added" ? "ADDED" : "NONE" },
      metrics: { costMicros: Math.round(parseNumber(r[iCost]) * 1e6), clicks: parseNumber(r[iClicks]), impressions: iImpr > -1 ? parseNumber(r[iImpr]) : 0, conversions: iConv > -1 ? parseNumber(r[iConv]) : 0, conversionsValue: iVal > -1 ? parseNumber(r[iVal]) : 0 },
    });
  }
  if (!terms.length) throw new Error("The report has the right columns and no rows.");
  const campaigns = [...camps].map(([name, id]) => ({ campaign: { id, name, status: "ENABLED", advertisingChannelType: "SEARCH" } }));
  const stats = [...camps].map(([, id]) => { const t = terms.filter((x) => x.campaign.id === id); const sum = (k) => t.reduce((s, x) => s + x.metrics[k], 0); return { campaign: { id }, metrics: { costMicros: sum("costMicros"), clicks: sum("clicks"), impressions: sum("impressions"), conversions: sum("conversions"), conversionsValue: sum("conversionsValue") } }; });
  return { format: "google-ads-export", v: 1, source: "csv", days: RULES.days, account: { currency }, data: { customer: [{ customer: { currencyCode: currency } }], campaigns, campaignStats: stats, searchTerms: terms }, errors: [] };
}

function renderSearches(r) {
  const money = moneyFn(r.account.currency); const g = r.goal; const L = [];
  if (!r.searches.length) return "No search terms in this export.";
  for (const s of r.searches) {
    L.push(`"${s.campaign.name}" · ${money(s.sum.cost)} across ${s.shown} searches · ${money(s.zeroCost)} on searches with 0 ${g.many}`);
    if (s.negs.length) { L.push("  Block (they spent and brought nothing):"); for (const n of s.negs) L.push(`    ${(n.match === "PHRASE" ? `"${n.text}"` : `[${n.text}]`).padEnd(34)} ${money(n.cost).padStart(8)} · ${n.clicks} clicks · ${n.why}${n.sample.length ? ` · e.g. ${n.sample.map((x) => `"${x}"`).join(", ")}` : ""}`); }
    if (s.look.length) { L.push("  Look (on topic or not? the numbers alone don't say):"); for (const t of s.look) L.push(`    "${t.text}" · ${money(t.cost)} · ${t.clicks} clicks · 0 ${g.many}`); }
    if (s.winners.length) { L.push("  Add as [exact] keywords (they convert and aren't keywords yet):"); for (const w of s.winners) L.push(`    [${w.text}] · ${Math.round(w.conv * 10) / 10} ${w.conv === 1 ? g.one : g.many} at ${money(w.cost / w.conv, true)}`); }
    if (!s.negs.length && !s.look.length) L.push("  Nothing has spent enough with nothing back to block.");
    L.push("");
  }
  L.push('A phrase negative ("word") blocks every search containing it; an [exact] one blocks only that search. Negatives don\'t cover plurals or synonyms: add those yourself.');
  return L.join("\n");
}

function renderCritique(res, head) {
  const L = [`${head} · ${res.score}/20 · ${verdict(res.score)}`];
  for (const c of res.checks) L.push(`  ${c.points === 2 ? "✓" : c.points === 1 ? "~" : "✗"} ${c.points}/2  ${c.name}: ${c.note}`);
  for (const n of res.notes) L.push(`  · ${n}`);
  return L.join("\n");
}

// ---------------------------------------------------------------- commands
const main = !!process.argv[1] && (() => { try { return fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url)); } catch { return false; } })();
if (main) run();

function run() {
  if (!cmd || cmd === "help" || flags.help) {
    const src = fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(1);
    console.log(src.slice(0, src.findIndex((l) => !l.startsWith("//"))).map((l) => l.slice(3)).join("\n"));
    return;
  }
  if (cmd === "version") return console.log(VERSION);

  if (cmd === "demo") {
    const file = path.join(HERE, "demo", flags.shop ? "shop.json" : "plumber.json");
    const exp = readJson(file); if (!exp) die("The demo file is missing: install the skill again.");
    const r = check(normalize(exp), exp.brief);
    if (flags.json) return console.log(JSON.stringify(r, null, 2));
    return console.log(render(r, { note: "example account, made-up numbers" }));
  }

  if (cmd === "init") {
    for (const d of ["exports", "changes", "plans"]) fs.mkdirSync(W(d), { recursive: true });
    if (!fs.existsSync(W("brief.json"))) fs.writeFileSync(W("brief.json"), JSON.stringify({ business: "", goal: "", target_cost: null, target_roas: null, monthly_budget: null, where: [], reach: "there", languages: [], brand: [], hours: null, allow: { search_partners: false, display_network: false, ai_max: false, ai_text: false, url_expansion: false, auto_apply: false }, targets: {}, keep: [] }, null, 2) + "\n");
    if (!fs.existsSync(W("notes.md"))) fs.writeFileSync(W("notes.md"), "# What we learned about this account\n\n");
    console.log(`  ok   ${DIR} is ready: brief.json (what you want), exports/ (files from Google Ads), changes/ (scripts to run), plans/.`);
    return;
  }

  if (cmd === "script") {
    fs.mkdirSync(DIR, { recursive: true });
    const f = W("export-script.js");
    fs.writeFileSync(f, exportScript());
    console.log(`  ok   ${f}\n       Read-only. Paste it in Google Ads → Tools → Bulk actions → Scripts → + → Authorize → Run.\n       It saves google-ads-export-<account>-<date>.json to your Google Drive: put that file in ${W("exports")}.`);
    log("export script written");
    return;
  }

  if (cmd === "queries") {
    const r = ranges(new Date(), DAYS);
    return console.log(JSON.stringify({ days: DAYS, range: r, queries: QUERIES.map((q) => ({ name: q.name, core: !!q.core, gaql: fill(q.gaql, r) })) }, null, 2));
  }

  if (cmd === "assemble") {
    const dir = pos[1]; if (!dir || !fs.existsSync(dir)) die("gads assemble <folder with one <query name>.json per query>");
    const data = {}; const errors = [];
    for (const q of QUERIES) {
      const got = readJson(path.join(dir, `${q.name}.json`));
      const rows = Array.isArray(got) ? got : Array.isArray(got?.results) ? got.results : Array.isArray(got?.rows) ? got.rows : null;
      if (rows) data[q.name] = rows; else errors.push({ query: q.name, message: "no file", ...(q.quiet ? { quiet: true } : {}) });
    }
    const missing = QUERIES.filter((q) => q.core && !data[q.name]).map((q) => q.name);
    if (missing.length) die(`Missing the parts the check can't do without: ${missing.join(", ")}.`);
    const r = ranges(new Date(), DAYS);
    const out = { format: "google-ads-export", v: 1, source: "assembled", made: new Date().toISOString(), days: DAYS, range: r, names: readJson(path.join(dir, "names.json"), { geo: {}, languages: {} }), data, errors };
    fs.mkdirSync(W("exports"), { recursive: true });
    const f = W("exports", `google-ads-export-assembled-${today()}.json`);
    fs.writeFileSync(f, JSON.stringify(out));
    return console.log(`  ok   ${f} (${Object.keys(data).length} of ${QUERIES.length} parts)`);
  }

  if (cmd === "check") {
    const file = findExport(); const { exp, model } = load(file);
    const r = check(model, brief());
    if (flags.json) return console.log(JSON.stringify(r, null, 2));
    const last = readJson(W("last-check.json"));
    const delta = last && last.account === r.account.id && last.export !== path.basename(file) ? since(last.keys, r) : null;
    let out = ageNote(exp) + render(r, { limit: flags.all ? 50 : 8, all: !!flags.all });
    if (delta && (delta.fixed.length || delta.fresh.length)) out = out.replace("\n\n", `\nSince the last check (${last.made}): ${delta.fixed.length} fixed, ${delta.fresh.length} new.\n\n`);
    console.log(out);
    try {
      fs.mkdirSync(DIR, { recursive: true });
      fs.writeFileSync(W("last-check.json"), JSON.stringify({ made: today(), export: path.basename(file), account: r.account.id, accountName: r.account.name, currency: r.account.currency, keys: since([], r).keys, options: r.options.map(({ n, key, title, why, ops, hand }) => ({ n, key, title, why, ops, hand })) }, null, 2));
      log(`check on ${path.basename(file)}: ${r.count.wrong} wrong, ${r.count.check} to check, ${r.options.length} options`);
    } catch {}
    return;
  }

  if (cmd === "searches") {
    let model;
    if (typeof flags.csv === "string") {
      if (!fs.existsSync(flags.csv)) die(`Can't find ${flags.csv}.`);
      try {
        const exp = termsCsvToExport(fs.readFileSync(flags.csv, "utf8"));
        // A report without a currency column: the account's own, from the last check or --currency.
        if (!exp.account.currency) { const cur = typeof flags.currency === "string" ? flags.currency : readJson(W("last-check.json"))?.currency || "USD"; exp.account.currency = cur; exp.data.customer[0].customer.currencyCode = cur; }
        model = normalize(exp);
      } catch (e) { die(e.message); }
    } else model = load(findExport()).model;
    const r = check(model, brief());
    if (flags.json) return console.log(JSON.stringify(r.searches.map((s) => ({ campaign: s.campaign.name, negs: s.negs, look: s.look, winners: s.winners, wasted: s.wasted })), null, 2));
    console.log(renderSearches(r));
    if (typeof flags.csv === "string") console.log("\nFrom a report file: I can't see your keywords here, so read the list before blocking anything. A word that is part of what you sell must stay.");
    return;
  }

  if (cmd === "critic") {
    const b = briefOf(brief());
    if (typeof flags.draft === "string") {
      const d = readJson(flags.draft); if (!d) die(`${flags.draft} isn't readable JSON. Shape: { "keywords": ["…"], "ads": [ { "group": "…", "headlines": ["…"], "descriptions": ["…"], "finalUrl": "https://…", "path1": "", "path2": "" } ] }`);
      const list = Array.isArray(d.ads) ? d.ads : [d];
      let fail = 0;
      for (const ad of list) {
        const res = critique(ad, { keywords: ad.keywords || d.keywords || [], brand: b.brand, where: b.where, group: ad.group || "" });
        console.log(renderCritique(res, `Draft${ad.group ? ` · "${ad.group}"` : ""}`));
        const over = [...(ad.headlines || []).map((h) => [h.text ?? h, LIMITS.headline]), ...(ad.descriptions || []).map((x) => [x.text ?? x, LIMITS.description])].filter(([t, max]) => [...String(t)].length > max);
        const open = res.errors.filter((e) => /\[bracket\]/.test(e)).length + (/placeholder/.test(res.checks.find((c) => c.id === "page")?.note || "") ? 1 : 0);
        const refused = res.errors.filter((e) => !/\[bracket\]|characters, the limit/.test(e)).length;
        const ok = res.score >= RULES.ad_pass && !over.length && !open && !refused;
        if (!ok) fail++;
        const why = [over.length ? `${over.length} line(s) over the character limit` : "", open ? `${open} [bracket] or placeholder still to fill` : "", refused ? `${refused} thing(s) Google would refuse` : "", res.score < RULES.ad_pass ? `needs ${RULES.ad_pass}/20` : ""].filter(Boolean).join("; ");
        if (res.errors.length) for (const e of res.errors) console.log(`  ✗ ${e}`);
        console.log(ok ? `  → passes (${RULES.ad_pass} or more, nothing over the limits, nothing Google would refuse)\n` : `  → not yet: ${why}\n`);
      }
      process.exitCode = fail ? 2 : 0;
      return;
    }
    const r = check(load(findExport()).model, brief());
    if (flags.json) return console.log(JSON.stringify(r.scored.map((a) => ({ campaign: a.campaign, group: a.group, adId: a.ad.id, score: a.score, checks: a.checks, notes: a.notes, headlines: a.ad.headlines, descriptions: a.ad.descriptions, finalUrl: a.ad.finalUrl, keywords: a.keywords })), null, 2));
    if (!r.scored.length) return console.log("No responsive search ads in this export.");
    const money = moneyFn(r.account.currency);
    for (const a of r.scored) {
      console.log(renderCritique(a, `"${a.group}" in "${a.campaign}"${a.ad.cost ? ` · ${money(a.ad.cost)} spent` : ""}`));
      console.log(`  Headlines: ${a.ad.headlines.map((h) => `"${h.text}"${h.pinned && !/UNSPEC/.test(h.pinned) ? ` (pinned ${h.pinned.replace("HEADLINE_", "position ")})` : ""}`).join(" | ")}`);
      console.log(`  Descriptions: ${a.ad.descriptions.map((h) => `"${h.text}"`).join(" | ")}`);
      console.log(`  Goes to: ${a.ad.finalUrl || "no page"} · keywords: ${a.keywords.join(", ") || "none read"}\n`);
    }
    const avg = r.scored.reduce((s, a) => s + a.score, 0) / r.scored.length;
    console.log(`${r.scored.length} ad${r.scored.length > 1 ? "s" : ""} · average ${avg.toFixed(1)}/20 · ${r.weak.length} under ${RULES.ad_pass}`);
    return;
  }

  if (cmd === "plan") {
    const raw = brief(); const b = briefOf(raw);
    if (flags.json) return console.log(JSON.stringify({ goals: GOAL_LIST, sheet: Object.fromEntries(GOAL_LIST.map((g) => [g.id, sheet(g.id)])) }, null, 2));
    if (!raw.goal) die(`No goal in ${W("brief.json")} yet. Fill the brief first (goal: leads, sales, calls or visits).`);
    const last = readJson(W("last-check.json"));
    const own = typeof flags.budget === "string" ? Number(flags.budget) : null;
    if (typeof flags.budget === "string" && !(own > 0)) die("--budget takes this campaign's own monthly amount, e.g. --budget 500");
    const text = renderSheet(b, typeof flags.currency === "string" ? flags.currency : last?.currency || "USD", { budget: own });
    try { fs.mkdirSync(W("plans"), { recursive: true }); fs.writeFileSync(W("plans", `${today()}-settings.md`), "```\n" + text + "\n```\n"); } catch {}
    console.log(text);
    console.log(`\nSaved to ${W("plans", `${today()}-settings.md`)}. Check every draft ad before it goes in: gads critic --draft <file>.`);
    return;
  }

  if (cmd === "fix") {
    const last = readJson(W("last-check.json"));
    if (!last) die('Run "gads check" first: the options come from the check.');
    const want = pos.slice(1).flatMap((x) => x.split(",")).map((x) => parseInt(x, 10)).filter((n) => n > 0);
    if (!want.length) die('Which options? e.g. gads fix 1 3 --ok "do 1 and 3"');
    if (typeof flags.ok !== "string" || flags.ok.trim().length < 2) die('Pass the person\'s own words: --ok "<what they wrote>". No words, no script.');
    const picked = want.map((n) => last.options.find((o) => o.n === n) || die(`There is no option ${n} in the last check (it has ${last.options.length}).`));
    const clean = (x) => String(x).trim().toLowerCase().replace(/^[\s"'“”‘’\[]+|[\s"'“”‘’\]]+$/g, "");
    const skip = typeof flags.skip === "string" ? flags.skip.split(",").map(clean).filter(Boolean) : [];
    const all = picked.flatMap((o) => o.ops);
    const negTexts = all.filter((op) => op.type === "negative").map((op) => String(op.text).toLowerCase());
    const unknown = skip.filter((w) => !negTexts.includes(w));
    if (unknown.length) die(`Nothing called ${unknown.map((w) => `"${w}"`).join(", ")} is in those options, so nothing was written. The negative keywords in them are: ${negTexts.map((w) => `"${w}"`).join(", ") || "none"}.`);
    const seen = new Set();
    const ops = all.filter((op) => !(op.type === "negative" && skip.includes(String(op.text).toLowerCase()))).filter((op) => { const k = JSON.stringify([op.type, op.campaignId, op.text, op.match, op.adGroupId, op.criterionId, op.field]); if (seen.has(k)) return false; seen.add(k); return true; });
    // What they said to leave alone is remembered: the next check won't propose it again.
    if (skip.length) { const bf = brief(); bf.keep = [...new Set([...(bf.keep || []), ...skip])]; try { fs.writeFileSync(W("brief.json"), JSON.stringify(bf, null, 2) + "\n"); } catch {} }
    const hand = picked.filter((o) => !o.ops.length);
    console.log(`For account ${last.account}${last.accountName ? ` (${last.accountName})` : ""}:`);
    if (ops.length) {
      fs.mkdirSync(W("changes"), { recursive: true });
      let f = W("changes", `${today()}-changes.js`); let i = 2;
      while (fs.existsSync(f)) f = W("changes", `${today()}-changes-${i++}.js`);
      fs.writeFileSync(f, changeScript(ops, { accountId: last.account, accountName: last.accountName, made: today(), words: flags.ok }));
      console.log(`  ok   ${f} · ${ops.length} change${ops.length > 1 ? "s" : ""}:`);
      for (const op of ops) console.log(`         - ${op.say}`);
      console.log("       Paste it in Google Ads → Tools → Bulk actions → Scripts → + → press PREVIEW (nothing changes), read the Changes tab, then RUN.");
    }
    if (skip.length) console.log(`  left out, and kept off future lists: ${skip.join(", ")}`);
    for (const o of hand) console.log(`  by hand  ${o.n}. ${o.title}\n           ${o.hand}`);
    log(`fix ${want.join(", ")}: ${ops.length} change(s) written${hand.length ? `, ${hand.length} by hand` : ""}. Their words: "${flags.ok}"`);
    return;
  }

  die(`Unknown command "${cmd}". Try: node gads.mjs help`);
}

export { GOALS };
