# The moves, and where they belong

Every mascot gets the same moves, mastered once (`runtime/motion.json`), identical in SwiftUI and on the web: squash and stretch around the feet, anticipation before every big move, overshoot and settle after, pose changes hidden inside the squash, blinks on their own clock, effects in the mascot's colours.

| Move | What it does | Put it on |
|---|---|---|
| `idle` | breathes, sways a hair, blinks every few seconds | wherever it rests; the default |
| `appear` | pops in with a stretch and sparkles (0.9 s, then idle) | first launch, a sheet or modal opening, a widget appearing |
| `hello` | anticipation squash, waves with its whole body (2 s, then idle) | onboarding, welcome back, sign-in done |
| `think` | hand on chin, floats a little, thought bubble with dots (loops) | waits over a second: loading, syncing, AI working |
| `celebrate` | crouch, jump, arms up, confetti, land, second hop (2.2 s, then idle) | success: saved, goal reached, purchase done, streak kept |
| `oops` | flinches, shakes, then stays a little worried (loops) | errors with a way out: no connection, failed payment, sync failed |
| `sleep` | sits, deep slow breaths, Zzz (loops) | empty states, nothing yet, offline, night mode |
| `point` | leans in, points, nudges "over here" every 2 s (loops); `side: .left` mirrors it | one tip at a time: a new feature, the next step, an empty field |
| `love` | hugs a heart that beats twice, hearts float up (loops) | thank you, rate us, upgrade done, a favourite saved |
| tap | a squish and a squeeze of the eyes, on top of any move | always on (turn off with `pokeable: false` / `poke="off"`) |

## Good manners

- **One mascot moment per screen.** It's a character, not wallpaper. Never in every row of a list.
- **Never in the way.** It sits beside the action, never on top of a button; a tap on it is a treat, not a requirement.
- **Earn the big moves.** `celebrate` only for real wins (not "settings saved"); if everything celebrates, nothing does.
- **Waits under a second get nothing.** Show `think` only if the wait is long enough to see it.
- **`oops` comes with the fix** ("Try again" right there), and the words take the blame ("I couldn't reach your bank"), never the person.
- **`point` once per feature**, then remember it was shown.
- **Sizes**: 160-240 pt on onboarding and empty states, 80-120 pt in cards and sheets, 44-64 pt inline. Below 44 pt use the still `idle` image.
- **Reduce Motion** is built in: poses still change (with a soft fade), nothing jumps, shakes or flies.
- **Sound** is off by default; if they add sounds, keep them under 0.3 s and never on idle.

## In code

SwiftUI:
```swift
@State private var move: PennyMove = .sleep          // empty state
PennyView(move: move)
  .frame(width: 200, height: 200)
// on save:
move = .think
do { try await save(); move = .celebrate } catch { move = .oops }
```
`.celebrate`, `.hello` and `.appear` return to idle by themselves; the `onFinish` closure tells you when.

Web:
```js
const m = document.querySelector("mascot-view");
m.play("think");
try { await save(); m.play("celebrate"); } catch { m.play("oops"); }
m.addEventListener("done", (e) => console.log(e.detail.state, "finished"));
```
