import { headers } from "next/headers";
import { MESSAGES, verifyTurnstile } from "@/lib/turnstile";

/**
 * Anti-spam helpers for every public form and write endpoint. Server only.
 *
 * Three cheap layers, none of which needs an outside service or shows a puzzle to a real person:
 *  1. Rate limits, per visitor address and per account name.
 *  2. A honeypot field (people never see it, bots fill it in) and a minimum fill-in time (a form posted in under
 *     3 seconds was not typed by a person). Both come from <GuardFields />.
 *  3. For the JSON endpoint: the request must come from this site's own pages, be JSON, and be small.
 *
 * Limits are counted in memory, so on Vercel each running server instance counts for itself. A caller whose requests land on N warm
 * instances gets about N times the limit, and a new instance starts with an empty count. That stops a script hammering one instance and is a
 * good first layer, but it is NOT a global limit: measured against two instances, the same visitor was allowed the full limit on each
 * (see FOLLOW-UP-REVIEW.md). For a hard global limit, switch rateLimit() to a shared store (Upstash Redis through the Vercel Marketplace, or
 * Vercel KV) or add a Vercel Firewall rate-limit rule. Both change a live service, cost money or both, so they need Rhys's approval. The rest
 * of the code does not need to change.
 */

/**
 * What the counter keeps for one key: the times of its hits inside the window. The Map keeps insertion order, and a key is moved to the end
 * each time it is hit, so the front of the Map is always the least recently used.
 */
type Entry = { times: number[]; windowMs: number };
const hits = new Map<string, Entry>();

/** How many different keys one server instance tracks before it starts forgetting the least important ones. */
export const MAX_TRACKED_KEYS = 20_000;

/**
 * Forget keys to make room, in this order: keys whose window has fully passed (they are not limiting anyone), then the keys with the FEWEST
 * hits, oldest first. A key that is sitting at its limit has the most hits, so it is the last to go. This replaces an older rule that
 * emptied the whole table at 5,000 keys: anyone could send 5,001 requests under made-up names and so wipe every counter, including the
 * one counting wrong passwords for an owner's account.
 */
function makeRoom(now: number): void {
  for (const [k, e] of hits) if (now - e.times[e.times.length - 1] >= e.windowMs) hits.delete(k);
  if (hits.size <= MAX_TRACKED_KEYS) return;
  const order = [...hits.entries()].map(([k, e], i) => ({ k, n: e.times.length, i })).sort((x, y) => x.n - y.n || x.i - y.i);
  for (const { k } of order) {
    if (hits.size <= MAX_TRACKED_KEYS * 0.9) break;
    hits.delete(k);
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const recent = (hits.get(key)?.times || []).filter((t) => now - t < windowMs);
  hits.delete(key); // put it back at the end: most recently used
  if (recent.length >= limit) {
    hits.set(key, { times: recent, windowMs });
    return { ok: false, retryAfterMs: windowMs - (now - recent[0]) };
  }
  recent.push(now);
  hits.set(key, { times: recent, windowMs });
  if (hits.size > MAX_TRACKED_KEYS) makeRoom(now);
  return { ok: true, retryAfterMs: 0 };
}

/**
 * The visitor's address, for rate limits. Prefer what the hosting platform sets itself: on Vercel, x-vercel-forwarded-for and x-real-ip
 * hold the connecting client's address and cannot be chosen by the visitor. The first value of x-forwarded-for CAN be chosen by a visitor on
 * any host that does not overwrite it, and anyone who changes it per request gets a fresh allowance every time, so it is only the last
 * resort (local runs and tests, where no platform header exists).
 */
export function clientIp(h: Headers): string {
  const platform = h.get("x-vercel-forwarded-for") || h.get("x-real-ip");
  const fwd = h.get("x-forwarded-for");
  const raw = platform || (fwd ? fwd.split(",")[0] : "") || "unknown";
  return raw.split(",")[0].trim().slice(0, 64) || "unknown";
}

export async function visitorIp(): Promise<string> {
  return clientIp(await headers());
}

// Not a name browsers autofill (no "website", "email", "phone", "address").
export const HONEYPOT = "contact_pref_zq";
export const FILLED_AT = "_t";
const MIN_FILL_MS = 3000;
const MAX_FILL_MS = 12 * 60 * 60 * 1000;

/** "bot" if the honeypot was filled in, the timer is missing or forged, or the form was sent too fast. */
export function checkGuard(form: FormData, now = Date.now()): "ok" | "bot" {
  if (String(form.get(HONEYPOT) || "").length > 0) return "bot";
  const t = Number(form.get(FILLED_AT));
  if (!Number.isFinite(t) || t <= 0) return "bot";
  const took = now - t;
  if (took < MIN_FILL_MS || took > MAX_FILL_MS) return "bot";
  return "ok";
}

/** True when a browser request came from one of this site's own pages. */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export const minutes = (ms: number) => Math.max(1, Math.ceil(ms / 60000));

export type Outcome =
  | { ok: true }
  | { ok: false; kind: "bot" }
  | { ok: false; kind: "rate"; status: 429; message: string; retryAfterMs: number }
  | { ok: false; kind: "turnstile"; status: 400 | 503; message: string };

/**
 * One call that protects a public form, in this order, and returns before anything is sent or written:
 *  1. rate limit for this visitor address on this endpoint (counts every try, bots included),
 *  2. honeypot and minimum fill time. A "bot" outcome should get a normal-looking success reply, so it does not retry,
 *  3. the Cloudflare Turnstile token, checked on the server.
 */
export async function guardForm(form: FormData, ip: string, endpoint: string, opts: { limit?: number; windowMs?: number } = {}): Promise<Outcome> {
  const rl = rateLimit(`${endpoint}:${ip}`, opts.limit ?? 5, opts.windowMs ?? 10 * 60_000);
  if (!rl.ok) return { ok: false, kind: "rate", status: 429, message: MESSAGES.rate, retryAfterMs: rl.retryAfterMs };
  if (checkGuard(form) === "bot") return { ok: false, kind: "bot" };
  const v = await verifyTurnstile(form.get("cf-turnstile-response"), ip);
  if (!v.ok) return { ok: false, kind: "turnstile", status: v.reason === "unavailable" ? 503 : 400, message: v.reason === "missing" ? MESSAGES.missing : v.reason === "unavailable" ? MESSAGES.unavailable : MESSAGES.failed };
  return { ok: true };
}
