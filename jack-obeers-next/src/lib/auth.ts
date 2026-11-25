import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Owner sign-in for Michael and Tanya. Server only.
 *
 * - Passwords are never stored. OWNER_USERS holds scrypt hashes, written as name:salt:hash and separated by ;
 *   Make one with: node scripts/hash-password.mjs michael   (it asks for the password on your own screen)
 * - A session is a signed cookie (HMAC with SESSION_SECRET, at least 32 characters) that lasts 8 hours.
 * - OWNER_DEMO=true allows a demo user (demo / demo-preview) so the pages can be tried before real logins exist.
 *   Never set it on the live site.
 * Every page and every action must call getOwner() itself. Hiding a button is not security.
 */

const COOKIE = "jo_owner";
const MAX_AGE = 60 * 60 * 8;

export type Owner = { name: string; demo: boolean };

function secret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

function users(): Record<string, { salt: string; hash: string }> {
  const out: Record<string, { salt: string; hash: string }> = {};
  for (const part of (process.env.OWNER_USERS || "").split(";")) {
    const [name, salt, hash] = part.trim().split(":");
    if (name && salt && hash) out[name.toLowerCase()] = { salt, hash };
  }
  return out;
}

export function authStatus(): { ready: boolean; demo: boolean } {
  const demo = process.env.OWNER_DEMO === "true";
  const real = Object.keys(users()).length > 0;
  return { ready: !!secret() && (real || demo), demo };
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")): { salt: string; hash: string } {
  return { salt, hash: scryptSync(password, Buffer.from(salt, "hex"), 64).toString("hex") };
}

export function checkLogin(nameRaw: string, password: string): Owner | null {
  const name = nameRaw.trim().toLowerCase();
  if (!name || !password || password.length > 200) return null;
  const u = users()[name];
  // always do one hash so a wrong name and a wrong password take about the same time
  const probe = hashPassword(password, u ? u.salt : "00".repeat(16)).hash;
  if (u && probe.length === u.hash.length && timingSafeEqual(Buffer.from(probe), Buffer.from(u.hash))) return { name, demo: false };
  if (process.env.OWNER_DEMO === "true" && name === "demo" && password === "demo-preview") return { name: "demo", demo: true };
  return null;
}

function sign(body: string): string {
  return createHmac("sha256", secret() || "").update(body).digest("base64url");
}

export async function startSession(owner: Owner): Promise<void> {
  if (!secret()) throw new Error("SESSION_SECRET is not set");
  const body = Buffer.from(JSON.stringify({ n: owner.name, d: owner.demo, e: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  (await cookies()).set(COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function getOwner(): Promise<Owner | null> {
  if (!secret()) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const want = sign(body);
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if (typeof p.e !== "number" || p.e < Date.now() || typeof p.n !== "string") return null;
    return { name: p.n, demo: !!p.d };
  } catch {
    return null;
  }
}
