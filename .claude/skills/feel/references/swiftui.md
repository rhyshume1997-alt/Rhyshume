# FEEL in SwiftUI (iOS 17+)

The kit is `kit/swiftui/Feel.swift`: copy it into the app target (same folder as the other views).
It needs no package. Set the tone once, at launch: `Feel.tone = .lively` in the `App` init.
Read `references/principles.md` first; this file is the *how*.

The system already moves well: pushes, pops, back-swipe, `.sheet`, menus, `confirmationDialog`,
`Picker`, `Toggle`. FEEL tunes those and adds what's missing; it never rebuilds them by hand.

## Press

- Every `Button` gets `.buttonStyle(FeelPress())`; cards and rows `FeelPress(size: .large)`; the few
  that commit something (buy, send, save) `FeelPress(haptic: true)`. To do it app-wide, apply
  `.buttonStyle(FeelPress())` once on a container (it inherits) and override where needed.
- A view with `.onTapGesture` that acts like a button becomes `.feelPressable { action }` (it is a
  real Button: pressed state, VoiceOver "button", keyboard and pointer support). Keep
  `.onTapGesture` only for taps that aren't buttons (dismissing a keyboard, a canvas).
- Buttons inside a `List` row: the row highlight is the system's; use `.buttonStyle(FeelPress(size: .large))`
  only on custom rows outside `List`.
- Toggles, pickers, steppers: leave them; add `.sensoryFeedback(.selection, trigger: value)` where
  the change matters.

## Sheets, dialogs, menus

- Use the system: `.sheet(item:)` / `.sheet(isPresented:)`. Tune it:
  `.presentationDetents([.medium, .large])` for sheets that can sit halfway,
  `.presentationDragIndicator(.visible)` when there is more than one detent,
  `.presentationCornerRadius(…)` (iOS 16.4) to match the app,
  `.presentationBackgroundInteraction(.enabled(upThrough: .medium))` (iOS 16.4) for a sheet that
  lets the map or list behind it stay usable.
- `.fullScreenCover` only for flows that take over (camera, onboarding).
- Menus: `Menu { … }` and `.contextMenu` already grow from their source. Don't build popovers
  from `ZStack` + `if`.
- Your own overlay panel (a bottom card that isn't a sheet, a mini player): show it with
  `if show { panel.transition(.move(edge: .bottom).combined(with: .opacity)) }` animated with
  `withAnimation(Feel.panel) { show = true }`, and add `.feelDragToDismiss { show = false }`.
  Remove it in `onDismiss`: it stays where it was thrown.
- Centred custom dialog: `.transition(.scale(scale: 0.96).combined(with: .opacity))` with `Feel.pop`.
- `@Environment(\.accessibilityReduceMotion)`: when true, use `.opacity` transitions and
  `Feel.reduced`. The kit's own pieces already do.

## Toasts

`content.feelToast($toast)` once at the root; `toast = FeelToastMessage("Saved", kind: .success)`
anywhere that can reach the binding (pass it down, or keep it in an `@Observable` app model). It
slides up from the bottom, is announced to VoiceOver (`AccessibilityNotification.Announcement`),
gives a success/error haptic, stays 4 s or longer for long text, can be swiped down, and is replaced
by the next one. If the app already has a toast or banner view, keep its look and move it the same
way: `.transition(.move(edge:).combined(with: .opacity))`, `Feel.toast`, the announcement, the time.

## Page change

- `NavigationStack` push and pop are right as they are. Don't replace them.
- **Card → detail (iOS 18)**: `@Namespace var ns`; on the card `.feelZoomSource(id: item.id, in: ns)`,
  on the destination view `.feelZoomDestination(id: item.id, in: ns)`. On iOS 17 it is the normal
  push. Only where the card really becomes the detail (a photo, a product, a note).
- **Tabs, segmented controls, steps** (same place, other content): `.feelSwap(on: selection)` on the
  content, or `.transition(.opacity)` + `.animation(Feel.swap, value: selection)`.
- Inside one screen, things that move from A to B: `matchedGeometryEffect(id:in:)` with `Feel.pop`.

## Drag

- System sheets drag themselves. Detents give them resting points.
- Own panels: `.feelDragToDismiss(edge: .bottom) { … }` (edges `.top`, `.leading`, `.trailing` too).
  It follows 1:1, rubber-bands the other way, and throws with the finger's speed
  (`DragGesture.Value.velocity`, iOS 17) into a spring.
- Swipe actions on rows: `List` + `.swipeActions`: native, don't rebuild.
- Reorder: `List` + `.onMove`.
- Carousels: `ScrollView(.horizontal)` + `.scrollTargetBehavior(.viewAligned)` (iOS 17) +
  `.scrollTargetLayout()`: native momentum and snapping.

## Animations to fix while you're there

- `.animation(.something)` without `value:` is deprecated and animates *every* change in that view:
  give it the value it should follow, or use `withAnimation` at the change.
- `withAnimation(.linear…)` and `.easeIn` on things the person triggered: use `Feel.*`.
- Durations over 0.6 s on interface: shorten.
- `withAnimation` everywhere with different curves: replace with the `Feel` tokens so the app has
  one feel.

## iOS 26

On iOS 26 the system controls get Liquid Glass and their own press response; `FeelPress` still works
on custom buttons. Glass elements that should merge and split when they move go in a
`GlassEffectContainer` with `.glassEffectID(_:in:)`; system toolbar buttons can be the source of a
zoom transition. Use these only if the app already targets iOS 26.

## Checking

- `node scripts/check.mjs <app> --changed` reads the Swift for the problems above.
- Build it: `xcodebuild -scheme <Scheme> -destination 'generic/platform=iOS Simulator' build`
  (needs Xcode). Without Xcode: `swiftc -typecheck` the files can't see the iOS SDK; say that the
  code was not compiled.
- FEEL can't press buttons in the simulator for you. In the hand-over, list the moves to try by
  hand (press, open each sheet, drag, toast, push) and turn on Settings → Accessibility → Motion →
  Reduce Motion once to see the fades.
