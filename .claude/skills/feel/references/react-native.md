# FEEL in React Native and Expo

The kit is `kit/react-native/feel.tsx`: copy it to the app's lib folder (`src/lib/feel.tsx`,
`lib/feel.tsx`). It needs `react-native-reanimated` (3.x or 4.x) and
`react-native-gesture-handler` (2.x or 3.x) with `<GestureHandlerRootView style={{ flex: 1 }}>` at
the root. Expo apps have both. If the app has neither, ask before adding them (they need a native
rebuild); without them, apply only what the native navigator and `Pressable` give you.
Call `setFeelTone("crisp" | "soft" | "lively")` once at startup.

Reanimated 4 needs the New Architecture and `react-native-worklets`; its `withSpring` defaults
changed (the kit passes duration + dampingRatio explicitly, so it behaves the same on 3 and 4).
Gesture Handler 3 prefers hooks (`usePanGesture`); `Gesture.Pan()` still works there, which is
what the kit uses so one file runs on 2 and 3.

## Press

- Replace `TouchableOpacity` / bare `Pressable` on buttons, cards and rows with `<PressableScale>`
  (`size="large"` for cards and rows). It keeps `onPress`, `disabled`, `hitSlop`,
  `accessibilityLabel`, and sets `accessibilityRole="button"`.
- Haptics: `haptic={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}` (expo-haptics)
  only on buttons that commit something; `Haptics.selectionAsync()` for toggles and pickers. On
  Android prefer `Haptics.performAndroidHapticsAsync` where available. iOS plays nothing in Low
  Power Mode: never rely on a haptic alone.

## Sheets and modals

- Expo Router / React Navigation native stack: `presentation: "formSheet"` with
  `sheetAllowedDetents: [0.5, 1]`, `sheetGrabberVisible: true` (iOS), `sheetCornerRadius`. Or
  `presentation: "modal"`. These are the platform's own sheets: they rise, drag and dismiss
  correctly. Prefer them to a JS sheet.
- `@gorhom/bottom-sheet` already in the app: keep it; set `enablePanDownToClose`, an
  `animationConfigs` spring from the tone (`{ duration: 350, dampingRatio: 1 }`), and a backdrop
  component that fades.
- Hand-made panel: show it with `entering={feelEnter.fade}` / an `exiting` preset, drag it with
  `useDragDismiss({ edge: "bottom", onDismiss })`:

```tsx
const { gesture, style, onLayout } = useDragDismiss({ edge: "bottom", onDismiss: () => setOpen(false) });
{open && (
  <GestureDetector gesture={gesture}>
    <Animated.View onLayout={onLayout} entering={SlideInDown.duration(feel().slow).easing(easeOut)} exiting={feelExit.fade} style={[styles.panel, style]}>
      …
    </Animated.View>
  </GestureDetector>
)}
```

## Toasts

- `sonner-native`, `burnt`, `react-native-toast-message` already there: keep; set the duration to
  4 s or more and the position away from the tab bar.
- Hand-made: `entering={feelEnter.toast}` (from the bottom; `toastTop` for top toasts),
  `exiting={feelExit.toast}`, swipe with `useDragDismiss({ edge: "bottom" })`, and announce it:
  `AccessibilityInfo.announceForAccessibility(text)`.

## Page change

- Native stack pushes are right. Don't use JS stack transitions.
- Expo Router `Stack` screen `animation`: leave the default on iOS (the system push). `fade` for
  tab-like switches. Note `slide_from_right` and `ios_from_right` change Android only; iOS keeps
  its own.
- Tabs: no slide between tabs. A crossfade of the content (`entering={feelEnter.fade}`) at most.

## Drag

- `useDragDismiss` for own panels and toasts (follows 1:1, rubber band, velocity, spring, `runOnJS`
  to close).
- Lists: `FlatList` momentum is native. Swipeable rows: Gesture Handler's `ReanimatedSwipeable`.
  Carousels: `FlatList horizontal pagingEnabled` or `snapToInterval`.

## Reduce motion

Reanimated's layout animations skip themselves when the person turned on Reduce Motion
(`ReduceMotion.System`, used by the kit's presets); `PressableScale` dims instead of shrinking;
`useDragDismiss` finishes with a short timing. `useReducedMotion()` reads the setting at app start.

## Checking

- `node scripts/check.mjs <app> --changed`, then the app's own `tsc --noEmit` and lint.
- FEEL can't tap the simulator. In the hand-over, list each move to try on a device, with Reduce
  Motion on once.
