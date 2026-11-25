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
 * Limits are counted in memory, so on Vercel each running server instance counts for itself. That stops a script
 * hammering one instance, and it is a good first layer. For a hard global limit, switch rateLimit() to a shared store
 * (Upstash Redis through the Vercel Marketplace, or Vercel KV) or add a Vercel Firewall rate-limit rule. The rest of the
 * code does not need to change.
 */

const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterMs: number } {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false, retryAfterMs: windowMs - (now - recent[0]) };
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    if (hits.size > 5000) hits.clear();
  }
  return { ok: true, retryAfterMs: 0 };
}

export function clientIp(h: Headers): string {
  const fwd = h.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : h.get("x-real-ip") || "unknown").trim().slice(0, 64);
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
