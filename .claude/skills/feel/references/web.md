# FEEL on the web

The kit is in `kit/web/` (the skill's folder). Read `references/principles.md` first: this file is
only the *how*, per setup. Use what the app already has; add the kit only for what's missing.

## 1. Install the kit (once)

| file | what | where it goes |
|---|---|---|
| `feel.css` | the tokens and every move in CSS (press, sheet, drawer, dialog, pop, toast, backdrop, page, reduced motion) | next to the global stylesheet, imported once, after the reset/Tailwind import |
| `ts/drag.ts` (or `js/drag.js`) | follow the finger, rubber band, throw with the finger's speed | the project's lib folder, e.g. `lib/feel/` |
| `ts/presence.ts` | `settled(el)`: wait for an element's exit animation | same |
| `ts/react.ts` | `usePresence`, `useDrag` for React | same (React apps only) |
| `ts/nav.ts` | `go(update, "forward"\|"back"\|"fade")`: page changes as View Transitions | same (apps that route in the browser, not Next) |
| `ts/spring.ts` | the spring maths drag.ts uses | same, whenever drag.ts goes in |
| `feel.global.js` | all of it as one `<script>` (window.Feel) | plain HTML sites without a bundler |

Copy `.ts` files into TypeScript projects, `js/*.js` into JavaScript ones (they import each other
with `./x.js`). Copy only what you use. Keep the file names and the header comments.

- **Tone**: `<html data-feel-tone="crisp|soft|lively">` (Next: on `<html>` in `app/layout.tsx`).
- **Where the CSS goes**: Next App Router → `import "./feel.css"` in `app/layout.tsx` (or
  `@import "./feel.css";` at the end of `globals.css`); Vite/React → `main.tsx`; Nuxt → `css: [...]`
  in nuxt.config; SvelteKit → `+layout.svelte`; Astro → the base layout; plain HTML → `<link>`.
- **Tailwind v4**: keep `feel.css` *outside* any `@layer`: utilities live in `@layer utilities`, and
  unlayered rules win, so the kit's transitions aren't overridden by `transition-colors` & co.
- **iOS Safari press**: `:active` only applies on iPhone when the page listens for touches. Add once,
  on the client: `document.addEventListener("touchstart", () => {}, { passive: true });` (Next: a
  tiny `"use client"` component in the root layout with a `useEffect`).
- **Tune later in one place**: the token block at the top of `feel.css`. Never retype a duration.

## 2. If the app already uses `motion` (or `framer-motion`)

Keep it for React moves and give it the same tokens instead of adding the CSS moves on top. Put
this in `lib/feel/motion.ts` (import from `motion/react`, or `framer-motion` if that's what's installed):

```ts
// FEEL tokens for motion. crisp | soft | lively: change TONE only.
const TONE = "crisp" as "crisp" | "soft" | "lively";
const T = {
  crisp:  { press: 0.97, fast: 0.1,  base: 0.18, slow: 0.26, bounce: 0 },
  soft:   { press: 0.98, fast: 0.14, base: 0.24, slow: 0.34, bounce: 0 },
  lively: { press: 0.95, fast: 0.1,  base: 0.22, slow: 0.32, bounce: 0.25 },
}[TONE];
export const out = [0.22, 1, 0.36, 1] as const, inn = [0.4, 0, 1, 1] as const;
export const feel = {
  press: { whileTap: { scale: T.press }, transition: { type: "spring", visualDuration: 0.25, bounce: T.bounce } },
  sheet: { initial: { y: "100%" }, animate: { y: 0, transition: { duration: T.slow, ease: out } }, exit: { y: "100%", transition: { duration: T.slow * 0.7, ease: inn } } },
  dialog: { initial: { opacity: 0, scale: 0.96, y: 8 }, animate: { opacity: 1, scale: 1, y: 0, transition: { type: "spring", visualDuration: T.base, bounce: T.bounce * 0.6 } }, exit: { opacity: 0, scale: 0.98, transition: { duration: T.base * 0.7, ease: inn } } },
  pop: { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1, transition: { type: "spring", visualDuration: T.base, bounce: T.bounce * 0.6 } }, exit: { opacity: 0, scale: 0.97, transition: { duration: T.base * 0.7, ease: inn } } },
  toast: { initial: { opacity: 0, y: 24, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", visualDuration: T.base + 0.08, bounce: T.bounce } }, exit: { opacity: 0, scale: 0.96, transition: { duration: T.base * 0.7, ease: inn } } },
  backdrop: { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: T.slow, ease: out } }, exit: { opacity: 0, transition: { duration: T.slow * 0.7, ease: inn } } },
};
```

- Wrap the app once in `<MotionConfig reducedMotion="user">`: it drops transform and layout
  animations for people who asked, and keeps opacity.
- Exits need `<AnimatePresence>` around the conditional element (`mode="popLayout"` when siblings
  should close the gap smoothly).
- `whileTap` fires on pointer down: that is the press. It also fires on Enter for keyboard users.
- Drag: `drag="y"`, `dragConstraints={{ top: 0, bottom: 0 }}`, `dragElastic={{ top: 0.1, bottom: 0.6 }}`,
  and in `onDragEnd(_, info)` dismiss when `info.offset.y > height * 0.3 || info.velocity.y > 450`
  (px/s), else let it spring back. Put `dragListener={false}` + `useDragControls` on a handle if the
  sheet's content scrolls.
- In motion only `opacity`, `filter`, `clipPath` and a whole `transform` string run off the main
  thread; `x`/`y`/`scale` run on its frame loop. That's fine for these moves; keep pages light while
  they play.
- motion's `transition.duration` is in **seconds**.

## 3. Press

Plain CSS (tokens, reduced motion and the release spring included):

```html
<button data-feel="press">Add to cart</button>
<a class="card" data-feel="press" data-feel-size="large" href="/item/3">…</a>
```

- With a shared Button component (shadcn's `components/ui/button.tsx`, the app's own `<Button>`),
  put `data-feel="press"` on its root once: every button gets it. Same for `Card` if it's clickable.
- The kit sets `transition` on scale *and* the colour properties a button usually animates; if
  the element's own class sets a `transition` that loads after `feel.css`, list `scale` in it too
  (otherwise the press snaps). `try.mjs` reports "jumps down in one frame" when that happens.
- Tailwind, if the team prefers classes over attributes: `active:scale-[0.97] transition-[scale,background-color] duration-100 ease-out motion-reduce:active:scale-100 motion-reduce:active:opacity-70`
  (v4's `scale-*` uses the `scale` property; v3's uses `transform`).
- Things that only *look* like buttons (`div onClick`) should become `<button>`s while you're there:
  only real buttons get keyboard and screen-reader behaviour.

## 4. Sheets, dialogs, drawers, menus

Find the library first (scan.mjs lists it) and use the matching row:

| the app uses | do this |
|---|---|
| **Radix / shadcn** (`Dialog`, `Sheet`, `Drawer`, `Popover`, `DropdownMenu`, `Select`, `HoverCard`, `Tooltip`) | Put `data-feel="sheet"` (bottom), `"drawer"` (+ `data-feel-side="left"` if left), `"dialog"` (centred) or `"pop"` (menus/popovers/selects) on the **Content**, and `data-feel="backdrop"` on the **Overlay**. **Remove** the `data-[state=open]:animate-in … slide-in-from-* zoom-in-95` classes from those same elements: two animations fight. Radix waits for CSS **keyframe** animations before unmounting, and feel.css uses keyframes, so exits play. Menus open out of their trigger by themselves (Radix's `--radix-*-transform-origin`). |
| **Headless UI v2** | Add the `transition` prop to `DialogPanel`/`DialogBackdrop`/`MenuItems`/`PopoverPanel` and the matching `data-feel`. The kit reads `data-closed` / `data-enter` / `data-leave`. |
| **Native `<dialog>`** | `data-feel="sheet"` (or dialog/drawer) on the `<dialog>`, open it with `showModal()`. Enter uses `@starting-style`; exit keeps it on screen with `transition-behavior: allow-discrete` (Chrome 117+, Safari 18+; Firefox shows the enter but closes at once). |
| **`[popover]`** | `data-feel="pop"`; set `--feel-origin` to the side of the trigger (`top left`, `bottom right` …). |
| **Vaul** | It already rises, drags and throws. Leave it (it is unmaintained, but working). Only check the close timing and that a backdrop fades. |
| **motion** | `AnimatePresence` + the `feel.sheet / dialog / pop / backdrop` variants above. |
| **Hand-made** (`{open && <div className="modal">}`) | React: `usePresence` from `react.ts` and `data-feel-state={state}` (example below). Other frameworks: set `data-feel-state="closed"`, `await settled(el)`, then remove it. Vue: `<Transition>` with `:css="false"` is not needed: use the same attribute approach, or `<Transition name="feel-…">`. Svelte: `transition:` directives with the tokens. |

Hand-made React sheet, complete:

```tsx
"use client";
import { useRef } from "react";
import { usePresence, useDrag } from "@/lib/feel/react";

export function FilterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const sheet = useRef<HTMLDivElement>(null), backdrop = useRef<HTMLDivElement>(null), grab = useRef<HTMLDivElement>(null);
  const { mounted, state } = usePresence(open, sheet);
  useDrag(sheet, { axis: "y", dismiss: 1, handle: grab, fade: backdrop, onDismiss: onClose }, mounted && open);
  if (!mounted) return null;
  return (
    <>
      <div ref={backdrop} className="backdrop" data-feel="backdrop" data-feel-state={state} onClick={onClose} />
      <div ref={sheet} role="dialog" aria-modal="true" aria-label="Filters" className="sheet" data-feel="sheet" data-feel-state={state}>
        <div ref={grab} className="grabber" data-feel-handle />
        …
      </div>
    </>
  );
}
```

Also, for any hand-made dialog: move focus inside on open (the dialog itself with `tabIndex={-1}`,
or its first control), close on Escape, return focus to the trigger on close, and stop the page
behind from scrolling (`overscroll-behavior: contain` on the sheet's scroll area; lock the body if
the app already has a helper). Libraries above do all of this already.

## 5. Toasts

| the app uses | do this |
|---|---|
| **Sonner** | Keep it. `<Toaster position="bottom-center" duration={4000} />` (or top on phones if the app has a bottom bar); `swipeDirections` if needed. Don't add the kit's toast move. |
| **react-hot-toast / react-toastify / Chakra / MUI Snackbar** | Keep them. Check the duration (≥ 4 s) and that it isn't `role="alert"` for normal messages. |
| **Radix Toast** | `data-feel="toast"` on `Toast.Root` (it uses data-state). Radix handles swipe; set `swipeDirection`. |
| **Hand-made** | A host with `role="status" aria-live="polite"` that is always in the page; each toast `data-feel="toast"` (+ `data-feel-from="top"` if it sits at the top); `usePresence` or `settled()` before removing; `drag(toast, { axis: "x", dismiss: "both", onDismiss })` (or `axis: "y", dismiss: 1` for a bottom toast); 4 s plus about 1 s per 15 words past ten; pause the timer on hover and focus. |

## 6. Page change

| setup | do this |
|---|---|
| **Next.js 16.3+ (App Router)** | No config. Create `app/template.tsx` (a template remounts on every navigation, so its `<ViewTransition>` enters and exits): `import { ViewTransition } from "react"; export default function Template({ children }) { return <ViewTransition enter={{ "feel-forward": "feel-forward", "feel-back": "feel-back", default: "feel-fade" }} exit={{ "feel-forward": "feel-forward", "feel-back": "feel-back", default: "feel-fade" }} default="none"><div>{children}</div></ViewTransition>; }` (if a template exists, wrap its content instead). Tag links: deeper → `<Link transitionTypes={["feel-forward"]}>`, up/back → `["feel-back"]`, tabs and anything sideways → no type (crossfade). `router.push(href, { transitionTypes: [...] })` too. The header in the layout stays outside, so it holds still. |
| **Next.js 16.2** | Same, plus `experimental: { viewTransition: true }` in `next.config`. (Tested on Next 16.2.7.) |
| **Next.js 13–16.1** | `app/template.tsx` that renders `<div data-feel="page">{children}</div>` (an arrival on every navigation; no exit, no direction). Say so in the hand-over. |
| **Next.js Pages Router** | Leave page changes alone, or the `data-feel="page"` arrival on the page root. |
| **React Router 6.22+ / 7, Remix** | `<Link viewTransition>` / `navigate(to, { viewTransition: true })`, and the `::view-transition-*(root)` rules in feel.css with `data-feel-nav` set by `go()` for direction; simplest is calling `go(() => navigate(to), "forward")`. |
| **SvelteKit** | `onNavigate((n) => { if (!document.startViewTransition) return; return new Promise((res) => document.startViewTransition(async () => { res(); await n.complete; })); })` in the root layout; direction via `document.documentElement.dataset.feelNav`. |
| **Vue Router / Nuxt** | Nuxt: `experimental: { viewTransition: true }`; Vue Router: wrap `router.push` in `go()`. |
| **Astro** | `<ClientRouter />` in the head, or the cross-document rule below. |
| **Plain multi-page site** | Add `@view-transition { navigation: auto; }` to every page's CSS. The transition is drawn by the **new** page, so set the direction there, in a script in its `<head>`: `addEventListener("pagereveal", (e) => { if (!e.viewTransition) return; const a = window.navigation?.activation; const back = a?.navigationType === "traverse" && a.from && a.entry.index < a.from.index; document.documentElement.dataset.feelNav = back ? "back" : "forward"; e.viewTransition.finished.finally(() => delete document.documentElement.dataset.feelNav); });` (for an "up" link like "← All items", mark it and check `document.referrer`, or use the page's depth). Chrome 126+, Safari 18.2+ (no Navigation API there before Safari 26: it slides forward); Firefox loads pages normally. |
| **Client-routed app, anything else** | `go(() => router.push(to), "forward")`; tabs: `go(() => setTab(t), "fade")`. |

- Browser support: same-document View Transitions Chrome 111, Safari 18, Firefox 144 (types:
  Chrome 125, Safari 18.2, Firefox 147). Without support the page changes normally: no fallback code.
- Keep the header and tab bar still: give them `view-transition-name: site-header` (or React
  `style={{ viewTransitionName: "site-header" }}`) and `::view-transition-group(site-header) { animation: none; }`.
- Shared element (card → detail): the same `view-transition-name` (React: `<ViewTransition name={"item-" + id} share="feel-morph">`)
  on the thumbnail and on the detail image. Only where it is literally the same picture. Give the
  morph the tone's timing and draw it **above** the sliding pages, or on the way back the picture
  is hidden under the incoming page for a moment:
  `::view-transition-group(.feel-morph) { animation-duration: var(--feel-slow); animation-timing-function: var(--feel-out); z-index: 1; }`
  Open the page strips to check it: the numbers can't see layering.
- The browser's own back button and swipe-back carry no direction type: they crossfade. That's fine.
- React's `<ViewTransition>` does not check reduced motion; feel.css's reduced-motion keyframes do.

## 7. Drag

`drag(el, options)` (or `useDrag(ref, options, active)` in React) from the kit:

| thing | options |
|---|---|
| bottom sheet | `{ axis: "y", dismiss: 1, handle: grabberOrHeader, fade: backdrop, onDismiss: close }` |
| side drawer (right) | `{ axis: "x", dismiss: 1, fade: backdrop, onDismiss: close }` (left: `dismiss: -1`) |
| toast | `{ axis: "x", dismiss: "both", onDismiss: remove }` or bottom: `{ axis: "y", dismiss: 1, … }` |
| sheet with a half and a full height | `{ axis: "y", dismiss: 1, snaps: [-(fullHeight - halfHeight)], onSettle }` |
| a card that only wiggles back (playful) | `{ axis: "x" }` (no dismiss: it always returns) |

- The handle gets `touch-action: none` from the kit (`data-feel-handle` is set for you). When the
  **whole element** is the handle (no `handle` option: a toast, a sheet without a grabber), give it
  `touch-action: none` yourself (or `pan-x` for a vertical drag that should still let sideways
  scrolls through), or phones start scrolling the page and cancel the drag. Exception: a sheet with
  a scrolling list inside: leave the list alone; the kit moves the sheet only when the list is at
  its top.
- A thrown sheet sets `data-feel-dragged="out"` so its CSS exit doesn't play a second time; the kit
  resets it when the sheet opens again.
- Carousels: prefer CSS scroll snapping (`scroll-snap-type: x mandatory`) over a JS drag: the
  browser's own momentum is the best drag there is.
- Don't put a drag on anything that already scrolls in the same direction.

## 8. Vue, Svelte, Angular, Solid

The CSS moves work anywhere (they read attributes). `drag`, `settled` and `go` are plain functions:
call them from `onMounted`/`onMount`/`ngAfterViewInit` and return/destroy the cleanup. For exits,
set `data-feel-state="closed"`, `await settled(el)`, then remove the element.
