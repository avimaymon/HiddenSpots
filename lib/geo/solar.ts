import * as SunCalc from "suncalc";

export type MoonPhaseKey =
  | "new"
  | "waxingCrescent"
  | "firstQuarter"
  | "waxingGibbous"
  | "full"
  | "waningGibbous"
  | "lastQuarter"
  | "waningCrescent";

export type SolarInfo = {
  sunrise: string;
  sunset: string;
  goldenHourMorning: string;
  goldenHourEvening: string;
  moonPhase: number;
  moonPhaseKey: MoonPhaseKey;
  moonPhaseEmoji: string;
};

function fmt(date: Date, locale?: string): string {
  return date.toLocaleTimeString(locale || undefined, { hour: "2-digit", minute: "2-digit" });
}

export function moonPhaseKey(phase: number): { key: MoonPhaseKey; emoji: string } {
  if (phase < 0.03 || phase > 0.97) return { key: "new", emoji: "🌑" };
  if (phase < 0.22) return { key: "waxingCrescent", emoji: "🌒" };
  if (phase < 0.28) return { key: "firstQuarter", emoji: "🌓" };
  if (phase < 0.47) return { key: "waxingGibbous", emoji: "🌔" };
  if (phase < 0.53) return { key: "full", emoji: "🌕" };
  if (phase < 0.72) return { key: "waningGibbous", emoji: "🌖" };
  if (phase < 0.78) return { key: "lastQuarter", emoji: "🌗" };
  return { key: "waningCrescent", emoji: "🌘" };
}

export function getSolarInfo(lat: number, lng: number, date = new Date(), locale?: string): SolarInfo {
  const times = SunCalc.getTimes(date, lat, lng);
  const moon = SunCalc.getMoonIllumination(date);
  const { key, emoji } = moonPhaseKey(moon.phase);
  function safeFmt(d: Date | null): string {
    if (!d || isNaN(d.getTime())) return "—";
    return fmt(d, locale);
  }

  return {
    sunrise: safeFmt(times.sunrise),
    sunset: safeFmt(times.sunset),
    goldenHourMorning: safeFmt(times.goldenHour),
    goldenHourEvening: safeFmt(times.goldenHourEnd),
    moonPhase: moon.phase,
    moonPhaseKey: key,
    moonPhaseEmoji: emoji,
  };
}
