# Christmas look, "What's Happening This Week" and "Events" (built on the development branch)

Status: built and tested on `claude/jack-obeers-beers`. Not merged, not deployed, checkout still off, nothing changed in the live Shopify store.

**Scope.** Michael's request (a Christmas look, a weekly section and a permanent Events section) has not been confirmed as inside the £2,000 scope. It is recorded here as **additional scope for Rhys to agree with Michael**. Nothing in this file claims it is included.

## 1. Christmas look (temporary)

- **When.** On from 1 December 2026 00:00 Europe/London, off from 1 January 2027 00:00 Europe/London. It is off again in December 2027 and every later year until new dates are chosen (that needs approval).
- **One rule.** `src/lib/season.ts` (`christmasOn`, `SEASON`). The same rule is sent to the browser as a tiny script in `<head>` (`seasonScript`), which sets `<html data-xmas="on|off">` before the page paints. A test proves the script and `christmasOn` agree on every date.
- **Why in the browser.** The pages are cached, so the server could be a day out. The browser decides from the shop's London date. `SeasonWatcher` re-checks every 30 seconds and when the tab comes back, so a page left open over midnight switches by itself. No deployment, no switch, no stored setting.
- **Preview-only override.** `?xmas=on` or `?xmas=off` (remembered for the tab) works on preview builds only. The override code is not sent on the live site, and a test checks that `?xmas=on` does nothing there.
- **What shows.** The supplied finished Christmas logos replace the normal ones for the season: the standing logo on the phone hero sign and the About section, the lying logo on the desktop hero, and a hat-and-circle crop of the standing logo for the small header mark (`public/media/jack-christmas-*.png`, resized from the supplied files; the supplied files and the original logos are untouched). Both versions are in the page and CSS shows one; the Christmas pictures are not downloaded outside the season. The homepage hero also gets the supplied garland with fairy lights, a slow-drifting sparkle and snowflake layer, a holly corner, and a small "Christmas at Jack O’Beers" label; the two permanent sections get a holly corner too. Elsewhere only the header logo changes. Nothing is added to product cards, the basket or navigation. The earlier SVG hat overlay, drawn garland, bulbs and CSS snow were removed.
- **Motion.** One very slow sparkle drift; it stops with reduced motion.
- **Not done.** The animated bull in the live-site opening has no hat (it is a frame-by-frame image). The three corner and garland files are decoration only and carry no text. No Christmas products, hampers, offers, dates or prices are named: none have been supplied or approved.

## 2. What's Happening This Week (permanent, all year)

Always on the homepage, high up. Short shop updates, written by Michael in Shopify with no code.

**Source: a Shopify blog with the handle `this-week`** (Online Store, Blog posts). One blog post is one update.

| Field | Use |
|---|---|
| Title | Card heading |
| Excerpt | Short text (if empty, the start of the post) |
| Featured image | Card picture (optional) |
| Tags (all optional) | `from:2026-12-07` and `to:2026-12-13` (dates to show; if missing, the Monday to Sunday of the week it was published), a label (`tasting`, `new-drink`, `on-tap`, `beer-club`, `announcement`), and a link (`product:<handle>`, `events`, or `club`) |

- The week is Monday to Sunday, London time. An update disappears by itself after its last day. A post with neither dates nor a publish date is never shown.
- With no updates for the week the section shows a plain message (no example content).
- Events happening this week (from the Events data) are listed in one line under the updates.

**Needs approval / set-up from Rhys (not done, store untouched):**
1. Create the blog `this-week` in Shopify (free, built in; no app).
2. Give the Storefront API token the **Read content** permission (`unauthenticated_read_content`). Not verified yet. Without it the section simply shows its empty state.

Alternative if preferred: a metaobject definition (more tidy fields, a little more set-up). Not built.

## 3. Events (permanent, all year)

A separate section titled "Events", further down the page (after the best sellers), so it never sits next to the weekly section. It reuses the existing events data (`getPublicEvents`, Shopify products of type "Event Tickets" with `date:` and `time:` tags). It shows up to three upcoming events: date and time, picture if there is one, short description, ticket price if above zero, and **View details** (to that event on the Events page). **View All Events** goes to `/events`. Expired, undated and sample events are never shown; Draft and Archived products are never returned by Shopify. With none, it says so. No new ticketing, booking or payment code. Buying still follows the Events page rules (checkout is off).

## 4. Tests

`tests/season.spec.ts` (live build) and `tests/xmas.spec.ts` (preview build): the date rule on 30 Nov, 1 Dec, 15 Dec, 31 Dec 2026, 1 Jan 2027 and 1 Dec 2027 (off); script and rule agree; the live site ignores the override; a page left open over midnight switches on and off; weekly updates with, without, and across a new week; events future, expired and undated; both sections present with Christmas off, in December and in January; narrow phones (320px); reduced motion.
