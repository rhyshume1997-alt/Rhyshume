/**
 * Cloudflare Turnstile, checked on the server before any email is sent or anything is written.
 *
 *  - Keys: NEXT_PUBLIC_TURNSTILE_SITE_KEY (public, shown to the browser) and TURNSTILE_SECRET_KEY (server only).
 *    No key is ever written in the code.
 *  - Preview and local: if a key is missing, Cloudflare's published test keys are used, so forms still work. Those keys
 *    are public documentation values (https://developers.cloudflare.com/turnstile/troubleshooting/testing/), not secrets.
 *  - Production (VERCEL_ENV=production): a missing key means every submit is rejected, and a clear error is logged.
 *    Off Vercel, NODE_ENV=production also counts as production. Set TURNSTILE_ALLOW_TEST_KEYS=true to test a production
 *    build on your own computer.
 *  - TURNSTILE_VERIFY_URL exists only so tests can point at a local stand-in. Leave it unset in Vercel.
 */

const TEST_SITE_KEY = "1x00000000000000000000AA"; // always passes
const TEST_SECRET_KEY = "1x0000000000000000000000000000000AA"; // always passes
const VERIFY_URL = process.env.TURNSTILE_VERIFY_URL || "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export const MESSAGES = {
  failed: "We couldn’t check that you’re a real person. Please try again.",
  missing: "Please wait a moment for the check to finish, then try again.",
  unavailable: "This form isn’t available right now. Please try again later.",
  rate: "That’s a few too many tries. Please wait a few minutes and try again.",
} as const;

function testKeysAllowed(): boolean {
  const env = process.env.VERCEL_ENV;
  if (env === "production") return false;
  if (env === "preview" || env === "development") return true;
  return process.env.NODE_ENV !== "production" || process.env.TURNSTILE_ALLOW_TEST_KEYS === "true";
}

let warned = false;
function logMissing(what: string) {
  if (warned) return;
  warned = true;
  console.error(`[turnstile] ${what} is missing in production, so every form submit is being rejected. Add it in Vercel (Production) and redeploy.`);
}

/** The public key for the widget, or null when forms must stay closed. */
export function turnstileSiteKey(): string | null {
  const k = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (k) return k;
  if (testKeysAllowed()) return TEST_SITE_KEY;
  logMissing("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  return null;
}

export type Verdict = { ok: true } | { ok: false; reason: "missing" | "failed" | "unavailable" };

export async function verifyTurnstile(token: unknown, ip: string): Promise<Verdict> {
  const secret = process.env.TURNSTILE_SECRET_KEY || (testKeysAllowed() ? TEST_SECRET_KEY : "");
  if (!secret) {
    logMissing("TURNSTILE_SECRET_KEY");
    return { ok: false, reason: "unavailable" };
  }
  const t = typeof token === "string" ? token.trim() : "";
  if (!t) return { ok: false, reason: "missing" };
  if (t.length > 2048) return { ok: false, reason: "failed" };
  try {
    const body = new URLSearchParams({ secret, response: t });
    if (ip && ip !== "unknown") body.set("remoteip", ip);
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!res.ok) {
      console.error(`[turnstile] verification service answered ${res.status}`);
      return { ok: false, reason: "unavailable" };
    }
    const json = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (json.success === true) return { ok: true };
    const codes = json["error-codes"] || [];
    if (codes.includes("missing-input-secret") || codes.includes("invalid-input-secret")) {
      console.error("[turnstile] Cloudflare rejected TURNSTILE_SECRET_KEY. Check it matches the widget's site key.");
      return { ok: false, reason: "unavailable" };
    }
    return { ok: false, reason: "failed" };
  } catch (e) {
    console.error("[turnstile] could not reach Cloudflare", e instanceof Error ? e.message : e);
    return { ok: false, reason: "unavailable" };
  }
}
