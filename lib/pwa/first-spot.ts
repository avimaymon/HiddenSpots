/** Client-only flag: PWA install nudge waits until the user has saved a spot. */
export const HS_HAS_SPOT_KEY = "hs-has-spot";

export function markHasSavedSpot(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HS_HAS_SPOT_KEY, "1");
    window.dispatchEvent(new Event("hs-has-spot"));
  } catch {
    /* ignore quota */
  }
}

export function hasSavedSpot(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(HS_HAS_SPOT_KEY) === "1";
  } catch {
    return false;
  }
}
