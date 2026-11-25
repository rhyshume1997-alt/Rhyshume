import { HOURS } from "@/lib/brand";
import { OPENING } from "@/lib/site";

/**
 * Is the shop open right now? Always works in UK time (Europe/London, so the clocks going back and forward are handled),
 * never the visitor's own clock. Hours come from HOURS in brand.ts: Wednesday to Monday 11am to 7pm, closed Tuesday.
 * Bank holidays are not known, so the Google listing stays the place to check. [Michael to confirm the hours]
 */
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const OPEN = mins(OPENING.opens);
const CLOSE = mins(OPENING.closes);

export function ukNow(d: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  return { day: DAY_NAMES.indexOf(get("weekday")), minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

const isOpenDay = (day: number) => !!HOURS.find((h) => h.day === DAY_NAMES[day])?.open;
const clock = (m: number) => { const h = Math.floor(m / 60); return `${h > 12 ? h - 12 : h}${h >= 12 ? "pm" : "am"}`; };

export type Status = { open: boolean; text: string };

export function openStatus(now: Date = new Date()): Status {
  const { day, minutes } = ukNow(now);
  if (isOpenDay(day) && minutes >= OPEN && minutes < CLOSE) return { open: true, text: `Open now, closes ${clock(CLOSE)}` };
  if (isOpenDay(day) && minutes < OPEN) return { open: false, text: `Opens ${clock(OPEN)} today` };
  for (let i = 1; i <= 7; i++) {
    const next = (day + i) % 7;
    if (isOpenDay(next)) return { open: false, text: `${isOpenDay(day) ? "" : "Closed today. "}Opens ${clock(OPEN)} ${i === 1 ? "tomorrow" : DAY_NAMES[next]}` };
  }
  return { open: false, text: "Closed" };
}
