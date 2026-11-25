# Proving it feels right (web)

`scripts/try.mjs` uses the running app the way a person would, in the person's own Chrome
(headless, a throwaway profile: no logins, no extensions): it presses, taps, drags and navigates,
records every frame, judges each move against `principles.md`, does it all again with Reduce
Motion on, and saves a filmstrip of each move. You write the plan; it does the rest.

## The plan: `.feel/plan.json`

```json
{
  "url": "http://localhost:3000",
  "device": "phone",
  "steps": [
    { "move": "press", "page": "/", "target": "Add to bag" },
    { "move": "press", "page": "/", "target": ".product-card", "name": "product card" },
    { "move": "sheet", "page": "/", "open": "Filters", "close": "Escape" },
    { "move": "sheet", "page": "/", "open": "Account", "close": "Account", "sheet": "[role=menu]", "name": "account menu" },
    { "move": "drag",  "page": "/", "open": "Filters", "dy": 320, "expect": "dismiss" },
    { "move": "drag",  "page": "/", "open": "Filters", "dy": 60, "expect": "return" },
    { "move": "toast", "page": "/item/1", "trigger": "Add to bag" },
    { "move": "page",  "page": "/", "go": "Linen shirt", "expect": "/item/1" },
    { "move": "page",  "page": "/item/1", "go": "All items", "expect": "/", "name": "back" }
  ]
}
```

- `url`: the running app. `device`: `phone` (390×844, touch, iPhone user agent) or `desktop` (1280×800).
- `page`: the path to open first (a fresh load for every step).
- Elements are named by **the words on them** (`"Add to bag"`, matched like a person would: exact
  first, then contains) or by a **CSS selector** (`".product-card"`, `"[data-testid=filters]"`).
- `before`: steps to get there first, e.g. `"before": [{ "tap": "Accept cookies" }, { "wait": 300 }]`
  (also `{ "key": "Escape" }`, `{ "scroll": 600 }`).
- `name`: a label for the report when the target's words aren't clear.

| move | fields | what it measures |
|---|---|---|
| `press` | `target`, `hold` (ms, default 260) | answers within 100 ms of the press (not the click); how deep it sinks (0.95–0.98); how long down and back; whether it jumps in one frame; reduce motion: no shrinking |
| `sheet` | `open`, `close` (`"Escape"`, `"backdrop"`, or the words/selector of a close control), `sheet` (selector, when it isn't a dialog/role=dialog/`[class*=sheet]`/`[class*=modal]`) | enters over frames and from its edge (bottom sheets from below, no rise past rest); enter time; focus moves in; closes; exit animated and quicker than enter; focus returns to the trigger; reduce motion: no travel |
| `toast` | `trigger`, `toast` (selector if not found), `wait` (ms to watch for it leaving, default 8000) | announced (role=status/alert/aria-live); enters over frames from its edge; stays ≥ 3 s (aim 4+); leaves animated; reduce motion: no travel |
| `page` | `go` (link words/selector), `expect` (part of the new URL) | navigated; a transition played (View Transition, or CSS on arrival); its length; reduce motion: no sliding |
| `drag` | `target` (or `open` to open a sheet first and drag that), `handle`, `dx`/`dy` (px), `ms` or `fast: true`, `expect`: `dismiss` \| `return` \| `resist` | follows the finger (1:1 in its free direction); thrown away past the line or with speed, without jumping back first; or springs back to rest without snapping |

- A "return" drag must stay well under the dismiss line: the kit dismisses past 30% of the
  element's size, so use `dy` under 20% of its height (40 px for a 200 px sheet). A "dismiss" drag
  goes past 40%, or use `fast: true`.
- To drag something that isn't a sheet (a toast), get it on screen first:
  `{ "move": "drag", "page": "/", "before": [{ "tap": "Save" }, { "wait": 500 }], "target": ".toast", "dx": 200, "fast": true, "expect": "dismiss" }`.
- Drags start on the element's handle when it has one (`data-feel-handle`, a "grab"/"handle"
  class), otherwise 24 px below its top edge; set `handle` to be exact.

Write one step per **kind** of thing, not per instance: the main button, a card, each different
sheet or dialog component, the menu, the toast, one push and one back, one drag per draggable kind.
Six to twelve steps is normal.

## Running it

```bash
node <skill>/scripts/try.mjs <app> --label before          # before changing anything
node <skill>/scripts/try.mjs <app> --label after --compare before
node <skill>/scripts/try.mjs <app> --only 3,5               # just those steps
node <skill>/scripts/try.mjs <app> --slow                   # 4x slower CPU, like a mid-range phone
node <skill>/scripts/try.mjs <app> --device desktop
```

It needs the app running (start the dev server in the background first) and Chrome, Edge, Brave
or Chromium installed (`FEEL_BROWSER=/path/to/browser` if it isn't found). Output:
`.feel/<label>/report.md`, `report.json`, one strip per step (`01-press.png` …), and with
`--compare` one before/after picture per step in `.feel/`.

Exit code 0 = all good, 1 = something to fix, 2 = something could not be tested (a missing
element, the app not running: fix the plan or the app, don't skip it).

## Reading the results

- **FIX** lines are things a person feels: fix every one, then run the step again.
- **LOOK** lines need judgement: fix them unless there is a reason (say the reason in the hand-over).
- **CAN'T** means the step never ran: an element wasn't found, or the app didn't respond. Correct the
  plan (a better selector, a `before` step) and run it again.
- **Open the strips and look at them.** Numbers can pass while something looks wrong (a sheet
  arriving from the wrong side, a toast under the tab bar, two things animating at once).
- Frame timing in a headless browser is a rough guide. "Slow frames" lines are worth a look with
  `--slow`, not a verdict.

## What it can't check

- Native apps (SwiftUI, React Native): it only drives web pages. Check those by building them, and
  list the moves for the person to try by hand.
- Haptics, sound, and how a real finger's speed feels on glass.
- Safari's and Firefox's own quirks: it runs Chromium. The kit is written for all three; the
  support notes in `web.md` say where Firefox and Safari differ.
- Pages behind a login: add `before` steps that sign in with a test account, or test a page that
  doesn't need one and say what wasn't covered.
