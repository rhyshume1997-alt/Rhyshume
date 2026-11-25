"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkLogin, endSession, getOwner, startSession } from "@/lib/auth";
import { guardForm, minutes, rateLimit, visitorIp } from "@/lib/antispam";
import { multiLine, oneLine, stripLinks, tooManyLinks, LIMITS } from "@/lib/sanitize";
import { createOwnerEvent, deleteOwnerEvent } from "@/lib/events-store";

export type FormState = { ok?: boolean; error?: string; message?: string } | undefined;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get("name") || "").slice(0, 80);
  const guard = await guardForm(form, await visitorIp(), "login", { limit: 5, windowMs: 10 * 60_000 });
  if (!guard.ok) {
    if (guard.kind === "bot") {
      await wait(900);
      return { error: "That name or password is not right." }; // the same reply a real wrong password gets
    }
    return { error: guard.message };
  }
  // Also slow down one account being attacked from many addresses.
  const byName = rateLimit(`login:name:${name.toLowerCase()}`, 6, 15 * 60_000);
  if (!byName.ok) return { error: `Too many attempts. Please wait ${minutes(byName.retryAfterMs)} minutes and try again.` };
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
  const guard = await guardForm(form, await visitorIp(), "event", { limit: 10, windowMs: 10 * 60_000 });
  if (!guard.ok) return guard.kind === "bot" ? { ok: true, message: "Added." } : { error: guard.message };
  const title = stripLinks(oneLine(form.get("title"), LIMITS.title * 2)).slice(0, LIMITS.title);
  const description = multiLine(form.get("description"), LIMITS.message + 1);
  if (tooManyLinks(description)) return { error: "Please keep to two links or fewer in the description." };
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
