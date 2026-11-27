/**
 * Dates in the shop's own time zone. Everything seasonal or weekly on this site is decided by the date in Europe/London,
 * not the visitor's time zone and not the server's, so the shop's Monday is everybody's Monday.
 * A "date key" is a plain string, YYYY-MM-DD, which sorts and compares correctly as text.
 */
export const SHOP_TZ = "Europe/London";

const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: SHOP_TZ, year: "numeric", month: "2-digit", day: "2-digit" });

/** The London calendar date of a moment, as YYYY-MM-DD. */
export function londonDate(now: Date | number = Date.now()): string {
  const p: Record<string, string> = {};
  for (const x of fmt.formatToParts(now)) p[x.type] = x.value;
  return `${p.year}-${p.month}-${p.day}`;
}

/** Move a date key by whole days. Done at midday UTC so clock changes can never skip or repeat a day. */
export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** The Monday-to-Sunday week that contains a date key. */
export function londonWeek(key: string): { start: string; end: string } {
  const dow = (new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7; // Monday is 0
  const start = addDays(key, -dow);
  return { start, end: addDays(start, 6) };
}

/** "Monday 7 to Sunday 13 December" style label for a week. */
export function weekLabel(w: { start: string; end: string }): string {
  const a = new Date(`${w.start}T12:00:00Z`);
  const b = new Date(`${w.end}T12:00:00Z`);
  const o = { timeZone: "UTC" } as const;
  const day = (d: Date) => d.toLocaleDateString("en-GB", { ...o, weekday: "short", day: "numeric" });
  const month = (d: Date) => d.toLocaleDateString("en-GB", { ...o, month: "long" });
  const am = month(a);
  const bm = month(b);
  return am === bm ? `${day(a)} to ${day(b)} ${bm}` : `${day(a)} ${am} to ${day(b)} ${bm}`;
}

export function prettyDate(key: string): string {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
