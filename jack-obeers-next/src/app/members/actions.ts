"use server";

import { redirect } from "next/navigation";
import { guardForm, visitorIp } from "@/lib/antispam";
import { endMember, startDemo, type Tier } from "@/lib/members";

export async function demoSignIn(form: FormData): Promise<void> {
  const guard = await guardForm(form, await visitorIp(), "members", { limit: 5, windowMs: 10 * 60_000 });
  if (!guard.ok) redirect(guard.kind === "bot" ? "/members" : "/members?check=failed");
  const t = String(form.get("tier"));
  if (t === "regular" || t === "legend") await startDemo(t as Tier);
  redirect("/members");
}

export async function memberSignOut(): Promise<void> {
  await endMember();
  redirect("/members");
}
