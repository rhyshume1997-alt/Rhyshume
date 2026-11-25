import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Draught Club members. Server only.
 *
 * REAL SIGN-IN IS NOT BUILT. It will use Shopify customer accounts (sign in on Shopify's own page) and read the
 * member's tier from their account once the subscription is set up in Shopify. Until then MEMBERS_DEMO=true lets
 * you preview the pages as a Regular or a Legend member. Never set it on the live site.
 */

export type Tier = "regular" | "legend";
export type Member = { name: string; tier: Tier; demo: boolean };

const COOKIE = "jo_member";
const secret = () => (process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32 ? process.env.SESSION_SECRET : null);
const sign = (b: string) => createHmac("sha256", secret() || "").update(b).digest("base64url");

export const demoOn = () => process.env.MEMBERS_DEMO === "true" && !!secret();

export async function startDemo(tier: Tier): Promise<void> {
  if (!demoOn()) return;
  const body = Buffer.from(JSON.stringify({ t: tier, e: Date.now() + 3600_000 })).toString("base64url");
  (await cookies()).set(COOKIE, `${body}.${sign(body)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 3600 });
}

export async function endMember(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function getMember(): Promise<Member | null> {
  if (!secret()) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const want = sign(body);
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if (p.e < Date.now() || (p.t !== "regular" && p.t !== "legend")) return null;
    return { name: "Demo member", tier: p.t, demo: true };
  } catch {
    return null;
  }
}
