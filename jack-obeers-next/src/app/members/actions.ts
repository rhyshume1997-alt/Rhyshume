"use server";

import { redirect } from "next/navigation";
import { endMember, startDemo, type Tier } from "@/lib/members";

export async function demoSignIn(form: FormData): Promise<void> {
  const t = String(form.get("tier"));
  if (t === "regular" || t === "legend") await startDemo(t as Tier);
  redirect("/members");
}

export async function memberSignOut(): Promise<void> {
  await endMember();
  redirect("/members");
}
