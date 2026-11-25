"use server";

import { redirect } from "next/navigation";
import { rateLimit, visitorIp } from "@/lib/antispam";
import { endMember, startDemo, type Tier } from "@/lib/members";

export async function demoSignIn(form: FormData): Promise<void> {
  if (!rateLimit(`member:${await visitorIp()}`, 20, 10 * 60_000).ok) redirect("/members");
  const t = String(form.get("tier"));
  if (t === "regular" || t === "legend") await startDemo(t as Tier);
  redirect("/members");
}

export async function memberSignOut(): Promise<void> {
  await endMember();
  redirect("/members");
}
