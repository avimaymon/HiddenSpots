/** Trigger a short haptic pulse on mobile. No-ops on desktop. */
export function haptic(pattern: number | number[] = 40) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}
