---
name: feel
description: Makes an app feel good to use by adding interaction motion into the app's own code, for web (any framework, React, Next.js, Vue, Svelte, plain HTML), SwiftUI and React Native / Expo. Five moves done properly everywhere they belong - press (things answer the instant the finger lands), sheets/dialogs/menus (come from where they belong, exits animated, focus right), toasts (from their edge, announced, long enough), page changes (direction, crossfade for tabs, shared element), and drag (1:1 with the finger, rubber band, thrown with the finger's speed). One tone for the whole app (crisp, soft or lively) written once as tokens; reduce motion respected; no new dependency. Then it proves it - a static check of the code, and on the web a real-browser run that presses, drags and opens each thing, measures every frame, repeats with reduce motion, and saves before/after filmstrips. Use for "/feel", "make it feel better", "add animations", "add micro-interactions", "it feels dead/static/cheap", "make it feel native", "press feedback", "animate the modal/sheet/drawer/toast", "page transitions", "drag to dismiss", "swipe to close", "spring animations", "polish the interactions", "it feels janky", and "/feel check" (an audit with no changes).
---

# FEEL

The look of an app is what people see; the feel is what happens under their finger. FEEL adds the
second into the app's own code and proves it works. Rules and numbers: `references/principles.md`.
How, per stack: `references/web.md`, `references/swiftui.md`, `references/react-native.md`.
Proof: `references/verify.md`. Scripts are in `scripts/` (Node 18+, no packages). `<skill>` below
means this skill's folder.

**What the person typed after /feel**: nothing = the whole app. A part ("the checkout", "only the
sheets") = that part, every place it appears. A tone ("make it lively") = that tone. "check" = audit
only: steps 1, 2 and 6, then the report, and change nothing.

Don't ask questions you can answer by reading the code. Ask only before something that costs the
person: adding a dependency (React Native without Reanimated), or changing how something behaves
rather than how it moves.

## 1. Read the app

```bash
node <skill>/scripts/scan.mjs <app>
```

It prints the stack, the motion and UI libraries already there, every place the five moves live
(with files and counts), the durations and curves already in use, and whether reduce motion is
respected; and writes `.feel/map.json` (adds `.feel/` to `.gitignore`). Then open the files it
lists: the shared Button, the Dialog/Sheet/Drawer components, the toast, the layout and router, the
global CSS. Know how each one works before changing it.

- Flutter, or no app found: say so and stop for that part.
- FEEL's kit already in the project: tune it; never add a second one.

## 2. Pick the tone and say it

From what the product is and who uses it, pick one (`principles.md`, "One feel"): **crisp** (tools,
money, work), **soft** (calm, reading, wellness, premium), **lively** (consumer, social, fun). Say it
in one line with the reason ("Lively: it's a social app for friends"). Don't ask. The person can say
"softer" later and it's one word to change.

## 3. Before (web)

Start the app if it isn't running (its dev script in the background; note the URL). Write
`.feel/plan.json` (`verify.md`): one step per *kind* of thing the scan found, 6–12 steps. Run:

```bash
node <skill>/scripts/try.mjs <app> --label before --no-reduced
```

Keep its strips: they're the "before" in the hand-over. A step that says CAN'T needs a better
selector or a `before` step, not deleting.

Native apps: no browser run. Note how each move behaves now from the code.

## 4. Put the kit in, once

Follow the stack's reference, section 1. Web: `feel.css` imported globally, `data-feel-tone` on
`<html>`, the iOS touch listener, and only the helpers you'll use, copied into the app's lib folder.
SwiftUI: `Feel.swift` into the target, `Feel.tone` set at launch. React Native: `feel.tsx` and
`setFeelTone`. If the app already uses `motion`, Reanimated or SwiftUI animations, the tokens go
into what it has (`web.md` §2); don't stack two systems on one element.

## 5. The five moves, everywhere they belong

In this order, each one across **every** place the scan found, through the shared components where
there are any (one Button change beats forty call sites):

1. **Press**: every button, card and row; real buttons where there were clickable divs.
2. **Sheets, dialogs, drawers, menus**: from their place, exits animated, backdrop, focus in and back,
   Escape. Remove the old enter/exit classes on the same elements.
3. **Toasts**: from their edge, announced, ≥ 4 s, swipe away, exit.
4. **Page change**: forward/back with direction, crossfade for tabs, shared element only where it's
   truly the same object; header and tab bar still.
5. **Drag**: sheets and drawers (dismiss), toasts (swipe), and only what already looks movable.

While there, fix what `check.mjs` would flag in the same components: `transition: all`, animated
width/height/top/left, `ease-in` on responses, scale from 0, 1 s interface animations, deprecated
SwiftUI `.animation(_:)`. Leave unrelated decorative motion (a landing hero, a loader) alone.

Keep the app working exactly as before: same handlers, same props, same routes, same text. Motion
is added around behaviour, never in place of it. Never delay an action until an animation ends.

## 6. Prove it

1. `node <skill>/scripts/check.mjs <app> --changed`: fix every "fix" in the files you touched.
   (Without `--changed` it reads the whole app: use that for "/feel check".)
2. The project's own checks: type check, lint and build (`npm run build`, `tsc --noEmit`,
   `xcodebuild`, whatever it has). Fix what you broke; say what was already broken. If the project
   has none, say so and check the files you touched parse (`node --check`, `tsc --noEmit`).
3. Web: `node <skill>/scripts/try.mjs <app> --label after --compare before`. Every FIX fixed and
   the step re-run; every CAN'T resolved; LOOKs fixed or explained. Then **open the strips** (and the
   `compare-*.png` pictures) and look at them like the person will.
4. Native: you can't tap a simulator. Compile if the tools are there; otherwise say it wasn't
   compiled. List the moves to try by hand.

Don't call it done while a FIX or CAN'T is open.

## 7. Hand-over

Short, in the person's language, no filler:

- **Tone**: the one picked, and that changing it is one word in one file (say which).
- **What moves now**: per move, where (e.g. "Press: every Button and the 3 product cards").
- **Proof**: try.mjs results (all steps, normal and reduce motion) and the paths of the before/after
  pictures; check.mjs; the build. For native: compiled or not, and the list to try by hand.
- **Not done, and why**: anything skipped, anything that couldn't be tested (Safari, Firefox,
  logged-in pages, haptics), anything already broken before.
- One line: "Change the feel any time: /feel softer, /feel lively, or /feel the checkout."
