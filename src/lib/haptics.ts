// Centralized haptic feedback. Silently no-ops when Vibration API is unavailable.
// Patterns are tuned to feel iOS-ish on Android; iOS Safari doesn't support Vibration
// but taps will still get their visual :active feedback.

type Pattern = number | number[];

function fire(p: Pattern) {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (p: Pattern) => boolean };
  try { nav.vibrate?.(p); } catch { /* noop */ }
}

export const haptics = {
  /** Tiny tap — for card flips, chip taps, small selections. */
  light: () => fire(8),
  /** Standard button press. */
  medium: () => fire(15),
  /** Heavier confirm — save/submit. */
  heavy: () => fire(25),
  /** Success — double tick. */
  success: () => fire([12, 40, 18]),
  /** Warning — soft bump twice. */
  warning: () => fire([20, 60, 20]),
  /** Error — three sharp taps. */
  error: () => fire([10, 30, 10, 30, 10]),
  /** Selection changed (segmented control / picker). */
  selection: () => fire(5),
  /** Swipe between items (feed). */
  swipe: () => fire(6),
};
