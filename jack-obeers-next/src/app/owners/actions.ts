"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkLogin, endSession, getOwner, startSession } from "@/lib/auth";
import { checkGuard, minutes, rateLimit, visitorIp } from "@/lib/antispam";
import { createOwnerEvent, deleteOwnerEvent } from "@/lib/events-store";

export type FormState = { ok?: boolean; error?: string; message?: string } | undefined;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") || "");
  if (checkGuard(form) === "bot") {
    await wait(900);
    return { error: "That did not work. Please reload the page and try again." };
  }
  // Slow down guessing: per visitor address, and per account name so one account cannot be attacked from many addresses.
  const byIp = rateLimit(`login:ip:${await visitorIp()}`, 10, 10 * 60_000);
  const byName = rateLimit(`login:name:${name.toLowerCase().slice(0, 40)}`, 6, 15 * 60_000);
  if (!byIp.ok || !byName.ok) {
    return { error: `Too many attempts. Please wait ${minutes(Math.max(byIp.retryAfterMs, byName.retryAfterMs))} minutes and try again.` };
  }
  const owner = checkLogin(name, String(form.get("password") || ""));
  if (!owner) {
    await wait(700); // slows down guessing
    return { error: "That name or password is not right." };
  }
  await startSession(owner);
  redirect("/owners");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/owners");
}

export async function createEvent(_prev: FormState, form: FormData): Promise<FormState> {
  const owner = await getOwner();
  if (!owner) return { error: "Please sign in again." };
  if (checkGuard(form) === "bot") return { error: "That did not work. Please reload the page and try again." };
  if (!rateLimit(`event:${owner.name}`, 20, 60_000).ok) return { error: "Too many changes in a minute. Please wait a little." };
  const title = String(form.get("title") || "").trim();
  const description = String(form.get("description") || "").trim();
  const date = String(form.get("date") || "");
  const time = String(form.get("time") || "");
  const price = Number(String(form.get("price") || "").replace(",", "."));
  if (title.length < 3 || title.length > 100) return { error: "Give the event a name (3 to 100 characters)." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date + "T12:00:00").getTime())) return { error: "Choose a date." };
  if (date < new Date().toISOString().slice(0, 10)) return { error: "That date has already passed." };
  if (time && !/^\d{2}:\d{2}$/.test(time)) return { error: "The time should look like 19:00." };
  if (description.length > 1000) return { error: "Keep the description under 1000 characters." };
  if (!Number.isFinite(price) || price < 0 || price > 500) return { error: "The ticket price should be between 0 and 500 pounds." };
  try {
    await createOwnerEvent({ title, description, date, time, price: Math.round(price * 100) / 100 }, owner.name);
  } catch (e) {
    console.error("create event failed", e);
    return { error: "Shopify did not accept that. Nothing was added." };
  }
  revalidatePath("/events");
  revalidatePath("/owners");
  return { ok: true, message: `Added “${title}”.` };
}

export async function deleteEvent(form: FormData): Promise<void> {
  const owner = await getOwner();
  if (!owner) redirect("/owners");
  if (!rateLimit(`event:${owner.name}`, 20, 60_000).ok) redirect("/owners");
  const id = String(form.get("id") || "");
  if (id) {
    try { await deleteOwnerEvent(id); } catch (e) { console.error("delete event failed", e); }
  }
  revalidatePath("/events");
  revalidatePath("/owners");
  redirect("/owners");
}
