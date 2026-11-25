import { NextResponse } from "next/server";
import { clientIp, guardForm, sameOrigin } from "@/lib/antispam";
import { cleanEmail } from "@/lib/sanitize";

/**
 * Newsletter sign-up. Protected in this order, before anything is stored or sent:
 * own pages only, small body, rate limit per visitor (5 per 10 minutes), honeypot and fill time, Cloudflare Turnstile.
 *
 * No mailing service is connected yet, so a sign-up is checked and then NOT stored. The answer says so. When a service
 * is chosen, call it in deliver() below, after the checks, and set NEWSLETTER_LIVE to true.
 */
const NEWSLETTER_LIVE = false;
const DEMO = "Thank you. (Demonstration only: nothing was sent.)";

async function deliver(email: string): Promise<void> {
  // Put the mailing-list call here. Everything in the email must go through escapeHtml() and headerSafe() first.
  void email;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, message: "That did not work. Please reload the page and try again." }, { status: 403 });
  if (Number(req.headers.get("content-length") || 0) > 10_000) return NextResponse.json({ ok: false, message: "That did not work." }, { status: 413 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, message: "That did not work." }, { status: 400 });
  }
  const guard = await guardForm(form, clientIp(req.headers), "newsletter", { limit: 5, windowMs: 10 * 60_000 });
  if (!guard.ok) {
    // A bot gets the normal success reply so it does not try again.
    if (guard.kind === "bot") return NextResponse.json({ ok: true, message: NEWSLETTER_LIVE ? "Thank you. You’re on the list." : DEMO });
    const headers: Record<string, string> = guard.kind === "rate" ? { "Retry-After": String(Math.ceil(guard.retryAfterMs / 1000)) } : {};
    return NextResponse.json({ ok: false, message: guard.message }, { status: guard.status, headers });
  }
  const email = cleanEmail(form.get("email"));
  if (!email) return NextResponse.json({ ok: false, message: "Please enter a valid email address." }, { status: 400 });
  if (form.get("consent") !== "on") return NextResponse.json({ ok: false, message: "Please tick the box so we know you are happy to hear from us." }, { status: 400 });
  await deliver(email);
  return NextResponse.json({ ok: true, message: NEWSLETTER_LIVE ? "Thank you. You’re on the list." : DEMO });
}
