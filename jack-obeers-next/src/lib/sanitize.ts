/**
 * Cleaning up what people type. Pure functions, no imports, safe on the server and in tests.
 * Every public field gets a maximum length, is trimmed, and has control characters removed. Names lose their links.
 * Messages may hold at most two links. Anything that goes into an email is escaped first.
 */

export const LIMITS = {
  name: 80,
  email: 254,
  title: 100,
  message: 1000,
  maxLinks: 2,
} as const;

/** Trim, remove control characters (so no line breaks can sneak into an email header) and squeeze spaces. */
export function oneLine(s: unknown, max: number): string {
  return String(s ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001F\u007F\u2028\u2029]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, max);
}

/** Longer text: keep line breaks, remove other control characters, trim, cap the length. */
export function multiLine(s: unknown, max: number): string {
  return String(s ?? "")
    .replace(/\r\n?/g, "\n")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F\u2028\u2029]+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

const TLDS = "com|net|org|co|uk|io|info|biz|xyz|ru|cn|shop|online|site|top|link|click|app|dev|me|ly|store|live|club|vip|icu|cc|tv";
const LINK = new RegExp(`(?:https?:\\/\\/|www\\.)\\S+|\\b[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:${TLDS})\\b(?:\\/\\S*)?`, "gi");

export function countLinks(s: string): number {
  return (s.match(LINK) || []).length;
}

/** A name field never keeps links. */
export function stripLinks(s: string): string {
  return s.replace(LINK, " ").replace(/\s{2,}/g, " ").trim();
}

export function cleanName(s: unknown): string {
  return stripLinks(oneLine(s, LIMITS.name * 2)).slice(0, LIMITS.name);
}

/** True when a message has more links than allowed. Reject it rather than guess which to keep. */
export function tooManyLinks(s: string, max: number = LIMITS.maxLinks): boolean {
  return countLinks(s) > max;
}

const HTML: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML[c]);
}

/** A header value (subject, reply-to name) must be one clean line. */
export function headerSafe(s: unknown, max = 120): string {
  return oneLine(s, max);
}

const EMAIL = /^[^\s@<>"',;:()\[\]\\]+@[^\s@<>"',;:()\[\]\\]+\.[^\s@<>"',;:()\[\]\\]{2,}$/;
export function cleanEmail(s: unknown): string | null {
  const e = oneLine(s, LIMITS.email).toLowerCase();
  return e.length >= 6 && EMAIL.test(e) ? e : null;
}
