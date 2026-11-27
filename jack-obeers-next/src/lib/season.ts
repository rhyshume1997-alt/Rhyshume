import { londonDate } from "@/lib/london";

/**
 * THE one place that decides whether the Christmas decorations are on.
 * On from 1 December 2026 00:00 Europe/London, off from 1 January 2027 00:00 Europe/London. The dates are in the
 * year, so December 2027 is OFF until someone chooses to set new dates here (that needs the owner's approval).
 *
 * Why this runs in the browser: the pages are cached, so a server decision could be a day stale. A tiny script in
 * <head> (seasonScript below) sets <html data-xmas="on|off"> before the first paint, and SeasonWatcher re-checks while
 * the page stays open, so a site left open over midnight switches on its own. No deployment, no stored flag.
 * Everything festive in the CSS is gated on html[data-xmas="on"].
 */
export const SEASON = { from: "2026-12-01", until: "2027-01-01" } as const;

/** True when the shop's date (Europe/London) is inside the season. `until` is the first day it is OFF. */
export function christmasOn(now: Date | number = Date.now()): boolean {
  const d = londonDate(now);
  return d >= SEASON.from && d < SEASON.until;
}

/**
 * The same rule as christmasOn, as a self-contained script for <head>. A test proves the two always agree.
 * `allowOverride` is true on previews only: ?xmas=on or ?xmas=off forces the look for testing before December.
 * On the live site that code is not sent at all, so no one can switch the decorations on early.
 */
export function seasonScript(allowOverride: boolean): string {
  const override = allowOverride
    ? "var m=location.search.match(/[?&]xmas=(on|off)/),o=m?m[1]:sessionStorage.getItem('jo_xmas');if(m)sessionStorage.setItem('jo_xmas',o);if(o==='on'||o==='off'){h.dataset.xmas=o;h.dataset.xmasOverride='1';return}"
    : "";
  return `(function(){var h=document.documentElement;try{${override}var q={};new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/London',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).forEach(function(x){q[x.type]=x.value});var d=q.year+'-'+q.month+'-'+q.day;h.dataset.xmas=d>='${SEASON.from}'&&d<'${SEASON.until}'?'on':'off'}catch(e){h.dataset.xmas='off'}})()`;
}
