// FEEL · feel.tsx (React Native / Expo)
// How the app moves, in one file: the tokens and the moves, on the UI thread.
// Needs react-native-reanimated (3.x or 4.x) and react-native-gesture-handler (2.x or 3.x),
// with <GestureHandlerRootView style={{ flex: 1 }}> at the root. Haptics are yours to pass in
// (expo-haptics: haptic={() => Haptics.selectionAsync()}), so this file needs no other package.
//
//   setFeelTone("lively")                                          // once, at startup
//   <PressableScale onPress={add} haptic={light}>…</PressableScale>
//   const { gesture, style } = useDragDismiss({ edge: "bottom", onDismiss: close });
//   <GestureDetector gesture={gesture}><Animated.View style={[styles.panel, style]}>…</Animated.View></GestureDetector>
//   <Animated.View entering={feelEnter.toast} exiting={feelExit.toast}>…</Animated.View>
//
// Native stacks, modals and formSheets already move and drag correctly: FEEL sets their options
// (references/react-native.md) instead of rebuilding them.
import React from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
  SlideInDown,
  SlideInUp,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture } from "react-native-gesture-handler";

export type FeelTone = "crisp" | "soft" | "lively";
const TONES = {
  crisp: { press: 0.97, fast: 110, base: 200, slow: 280, release: { duration: 300, dampingRatio: 1 }, pop: { duration: 320, dampingRatio: 1 } },
  soft: { press: 0.98, fast: 150, base: 260, slow: 360, release: { duration: 400, dampingRatio: 1 }, pop: { duration: 420, dampingRatio: 1 } },
  lively: { press: 0.95, fast: 110, base: 240, slow: 340, release: { duration: 420, dampingRatio: 0.7 }, pop: { duration: 380, dampingRatio: 0.8 } },
} as const;
let tone: FeelTone = "crisp";
/** crisp: tools, money, work. soft: calm, reading, wellness. lively: consumer, social, games. */
export function setFeelTone(t: FeelTone) { tone = t; }
export const feel = () => TONES[tone];
/** Arrive: fast start, soft landing. Leave: gathers speed. */
export const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
export const easeIn = Easing.bezier(0.4, 0, 1, 1);

// ── Press ────────────────────────────────────────────────────────────────────
type PressableScaleProps = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
  /** "large" for cards and rows: they sink half as far. */
  size?: "regular" | "large";
  /** Called on press-in: pass a light haptic for the few buttons that commit something. */
  haptic?: () => void;
  children?: React.ReactNode;
};

/** A button that sinks under the finger the moment it lands and springs back on release. */
export function PressableScale({ style, size = "regular", haptic, onPressIn, onPressOut, disabled, children, ...rest }: PressableScaleProps) {
  const reduce = useReducedMotion();
  const down = useSharedValue(0);
  const t = feel();
  const depth = size === "large" ? 1 - (1 - t.press) / 2 : t.press;
  const animated = useAnimatedStyle(() => (reduce
    ? { opacity: 1 - down.value * 0.3 }
    : { transform: [{ scale: 1 - down.value * (1 - depth) }] }));
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      accessibilityRole={rest.accessibilityRole ?? "button"}
      onPressIn={(e) => {
        down.value = withTiming(1, { duration: reduce ? 80 : t.fast, easing: easeOut });
        if (haptic && !disabled) haptic();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        down.value = reduce ? withTiming(0, { duration: 120 }) : withSpring(0, { ...t.release, reduceMotion: ReduceMotion.System });
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}

// ── Drag ─────────────────────────────────────────────────────────────────────
type DragOptions = {
  /** The edge it lives on and leaves through. */
  edge?: "bottom" | "top" | "left" | "right";
  /** Released past this share of its size, it goes. */
  distance?: number;
  /** Released faster than this (points per second) toward its edge, it goes. */
  speed?: number;
  /** Its size along the drag (height for top/bottom). Measured with onLayout if you pass `layout`. */
  size?: number;
  onDismiss?: () => void;
};

/**
 * Your own panel (bottom card, mini player, banner, toast) follows the finger 1:1, resists the
 * wrong way like iOS, and on release springs back or is thrown away with the finger's speed.
 * Spread `onLayout` on the Animated.View so it knows its size.
 */
export function useDragDismiss({ edge = "bottom", distance = 0.3, speed = 700, size: fixed, onDismiss }: DragOptions = {}) {
  const reduce = useReducedMotion();
  const offset = useSharedValue(0);
  const size = useSharedValue(fixed ?? 300);
  const vertical = edge === "bottom" || edge === "top";
  const sign = edge === "bottom" || edge === "right" ? 1 : -1;
  const lively = tone === "lively";

  const from = useSharedValue(0);
  const gesture = Gesture.Pan()
    .activeOffsetY(vertical ? [-6, 6] : [-1000, 1000])
    .activeOffsetX(vertical ? [-1000, 1000] : [-6, 6])
    .onStart(() => { from.value = offset.value; }) // caught mid-spring: carry on from where it is
    .onUpdate((e) => {
      const raw = from.value + (vertical ? e.translationY : e.translationX);
      // Toward the edge: 1:1. Away from it: iOS's rubber band.
      if (raw * sign >= 0) offset.value = raw;
      else { const a = Math.abs(raw); offset.value = -sign * (1 - 1 / ((a * 0.55) / size.value + 1)) * size.value; }
    })
    .onEnd((e) => {
      const v = vertical ? e.velocityY : e.velocityX;
      const away = offset.value * sign > size.value * distance && v * sign > -100;
      if (away || v * sign > speed) {
        const target = sign * (size.value + 60);
        const done = (finished?: boolean) => { "worklet"; if (finished && onDismiss) runOnJS(onDismiss)(); };
        offset.value = reduce ? withTiming(target, { duration: 160 }, done) : withSpring(target, { duration: 300, dampingRatio: 1, velocity: v, overshootClamping: true }, done);
      } else {
        offset.value = reduce ? withTiming(0, { duration: 160 }) : withSpring(0, { duration: 350, dampingRatio: lively ? 0.8 : 1, velocity: v });
      }
    });

  const style = useAnimatedStyle(() => ({ transform: vertical ? [{ translateY: offset.value }] : [{ translateX: offset.value }] }));
  const onLayout = (e: { nativeEvent: { layout: { width: number; height: number } } }) => {
    if (fixed == null) size.value = vertical ? e.nativeEvent.layout.height : e.nativeEvent.layout.width;
    // Shown again after it was thrown away: start from rest.
    if (Math.abs(offset.value) > size.value) offset.value = 0;
  };
  return { gesture, style, onLayout, offset };
}

// ── Enter and exit presets (Reanimated layout animations) ─────────────────────
// Reduce Motion: Reanimated skips layout animations for people who turned it on (ReduceMotion.System).
export const feelEnter = {
  get toast() { return SlideInDown.duration(feel().base).easing(easeOut).reduceMotion(ReduceMotion.System); },
  get toastTop() { return SlideInUp.duration(feel().base).easing(easeOut).reduceMotion(ReduceMotion.System); },
  get fade() { return FadeIn.duration(feel().base).easing(easeOut).reduceMotion(ReduceMotion.System); },
};
export const feelExit = {
  get toast() { return FadeOut.duration(Math.round(feel().base * 0.7)).easing(easeIn).reduceMotion(ReduceMotion.System); },
  get fade() { return FadeOut.duration(Math.round(feel().base * 0.7)).easing(easeIn).reduceMotion(ReduceMotion.System); },
};
