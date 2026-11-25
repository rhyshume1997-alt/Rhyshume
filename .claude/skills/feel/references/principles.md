# How an app should feel

The rules FEEL applies, with the numbers. Every check in `check.mjs` and `try.mjs` comes from here.
Motion in an interface has one job: to show the person that the app heard them, and where things
went. It is not decoration. When in doubt, less, faster, and from where the finger is.

## One feel for the whole app

Pick one tone from what the product is, write it once as tokens, and never type a raw duration or
curve anywhere else. The same kind of thing moves the same way everywhere.

| tone | for | press sinks to | fast / base / slow | springs |
|---|---|---|---|---|
| **crisp** | tools, dashboards, money, B2B, anything used all day | 0.97 | 100 / 180 / 260 ms | no bounce |
| **soft** | calm, wellness, reading, premium, editorial | 0.98 | 140 / 240 / 340 ms | no bounce |
| **lively** | consumer, social, games, kids, anything meant to be fun | 0.95 | 100 / 220 / 320 ms | a little bounce (0.15–0.35) on press release, menus, toasts |

- **fast** = press, toggles, small state changes. **base** = menus, popovers, toasts. **slow** = sheets, dialogs, pages.
- **Leaving is quicker than arriving**: exits take about 70% of the enter time. The person has already moved on.
- **Arrive with ease-out** (fast start, soft landing): `cubic-bezier(0.22, 1, 0.36, 1)`. **Leave with an
  accelerating curve**: `cubic-bezier(0.4, 0, 1, 1)`. **On-screen to on-screen** (a thing moving from A to
  B, both visible): ease-in-out `cubic-bezier(0.65, 0, 0.35, 1)`. Never `linear` for interface motion
  (fine for a progress bar or a loop). Never `ease-in` on something the person triggered: it starts
  slowly, so the app feels late.
- **Anything a finger moves, or that can be interrupted, finishes with a spring**, so it keeps the
  speed it already had. A spring is described by how long it takes to feel done and how much it bounces.

Why these numbers: about 100 ms reads as instant (Miller, Card, Nielsen); interface motion lives
between 100 and 500 ms and 500 ms already feels slow (NN/g); Material 3 puts small changes at
50–200 ms and medium ones at 250–400 ms; Apple asks for motion that is brief, can be cancelled,
and stays out of the way of things people do often.

## The five moves

### 1. Press: every tappable thing answers the moment the finger lands

- It reacts on **press**, not on release or click: within one frame, and never later than 100 ms.
- Buttons sink to the tone's scale; cards and rows (big surfaces) half as far; icon-only buttons may
  tint instead. Links in running text change colour, they don't move.
- Down is quick (fast token, ease-out); back up is a spring, a little slower than down.
- Disabled things don't respond. Hover effects that move things only apply on devices that hover
  (`@media (hover: hover) and (pointer: fine)`), or they stick after a tap on a phone.
- On a phone, a **light haptic** only on the few presses that commit something (buy, send, save,
  a toggle). Never on every tap: haptics everywhere become noise.
- Reduce motion: no sinking; the press dims or tints instead. Feedback stays.

### 2. Sheets, dialogs, drawers, menus: they come from where they belong and go back there

- A **bottom sheet** rises from the bottom edge and leaves downwards. It never rises past its resting
  place: anything attached to an edge lands without bounce (overshoot shows a gap under it).
- A **side drawer** slides from its side. A **centred dialog** grows a little (0.96 → 1) while fading in,
  with a few pixels of rise. A **menu or popover** grows out of the thing that opened it (its
  transform-origin is the trigger), from 0.95, never from 0.
- The backdrop fades in with the sheet and out with it.
- **Exits are animated.** A sheet that vanishes in one frame feels broken. In React and similar, the
  element has to stay mounted while it leaves (usePresence, AnimatePresence, Radix's own presence).
- Focus moves into a dialog when it opens and back to the button that opened it when it closes.
  Escape closes it. The page behind doesn't scroll.
- A sheet that can be dragged follows the finger (see Drag). Its close button stays: dragging is
  an extra, never the only way.
- Reduce motion: they fade, they don't travel or grow.

### 3. Toasts: they arrive from their edge, say it, stay long enough, and leave

- Enters from the edge it sits on (bottom toasts from below, top from above), with a fade and a
  slight scale (0.96 → 1); lively apps may let it bounce a little.
- Stays at least **4 seconds**, plus about one second for every 15 words past ten; stays while hovered
  or focused; errors that need action stay until dismissed.
- Announced to screen readers without taking focus: `role="status"` / `aria-live="polite"` (errors:
  `role="alert"`). On iOS, `AccessibilityNotification.Announcement`.
- Can be swiped away in its direction (or sideways), with the finger's speed.
- One at a time unless the app already stacks them; a new one replaces the old.
- Leaves with a quick fade (and a little scale or slide back toward its edge).
- Reduce motion: fade in, fade out.

### 4. Page change: it says where you went

- **Deeper** (a list into a detail, a step forward): the new page comes from the trailing side
  (from the right in left-to-right languages) while the old one drifts a little the other way and
  fades. **Back** is the mirror. The travel is short: 24–40 px with a fade, not a full-width slide.
- **Same place, other content** (tabs, filters, a segmented control, the next photo): a crossfade.
  Tabs are not deeper: they never slide like a push.
- **The same object on both pages** (a card that opens into its detail, a thumbnail into a hero):
  it morphs from one to the other (shared element / zoom). This is the strongest move: use it where
  the object really is the same.
- Fixed things (the header, the tab bar) stay still while content moves.
- The transition never delays the new page's data, and the person can tap during it.
- On native platforms the system push, pop and back-swipe are already right: don't replace them.
- Reduce motion: crossfade, or nothing.

### 5. Drag: what looks movable moves with the finger, and keeps its speed when let go

- **1:1 while held**: the element is exactly under the finger; no transition, no lag, no easing
  while dragging.
- **Past its limits it resists** like iOS's rubber band (the further past, the harder it pulls back),
  instead of stopping dead.
- **On release the finger's speed decides**, not only the distance: a short fast flick dismisses; a
  long slow drag that comes back a little doesn't. The thing continues with that speed into a spring
  (to rest, to a snap point, or off screen).
- **Grabbing it mid-flight catches it where it is**: no jump.
- It must not steal scrolling: a sheet whose list is scrolled scrolls the list; only at the top
  does pulling down move the sheet. A drag starts after a few pixels of movement in its own
  direction, so taps and sideways scrolls still work.
- Where to add a drag: sheets and drawers (to dismiss), toasts (to swipe away), cards in a carousel
  the app already has, rows the app already lets you delete or reorder. Don't invent gestures on
  content that people expect to scroll.

## Where motion stays out

- **What people do hundreds of times** (typing, keyboard shortcuts, switching a list selection with
  the arrow keys, a command palette opened from the keyboard): instant, or a fade under 100 ms.
  Keyboard-triggered actions skip the travel.
- **No motion nobody caused.** Things on screen don't wobble, pulse or float on their own (loaders
  and progress are the exception). Lists don't stagger in on every visit.
- **Motion never makes the person wait.** Navigation doesn't wait for an animation to finish; a
  button works again while it's still springing back; everything can be interrupted.
- **Only transform and opacity move.** Animating width, height, top, left, margin or padding redoes
  the layout every frame and stutters on phones. Move with translate and scale; for an accordion
  use `grid-template-rows: 0fr → 1fr` (or `interpolate-size`).
- **No new dependency for motion.** Use what the app already has (motion / framer-motion, Radix's
  data-state, Sonner, Reanimated, SwiftUI). If it has nothing, the kit is a few small files.
- **Reduce motion is respected everywhere** FEEL touches: travel becomes a fade, bounces go, press
  feedback stays as a tint. Nothing that tells the person what happened is removed.
