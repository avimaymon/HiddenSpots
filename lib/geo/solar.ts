import * as SunCalc from "suncalc";

export type SolarInfo = {
  sunrise: string;
  sunset: string;
  goldenHourMorning: string;
  goldenHourEvening: string;
  moonPhase: number;
  moonPhaseName: string;
  moonPhaseEmoji: string;
};

function fmt(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function moonName(phase: number): { name: string; emoji: string } {
  if (phase < 0.03 || phase > 0.97) return { name: "New Moon", emoji: "🌑" };
  if (phase < 0.22) return { name: "Waxing Crescent", emoji: "🌒" };
  if (phase < 0.28) return { name: "First Quarter", emoji: "🌓" };
  if (phase < 0.47) return { name: "Waxing Gibbous", emoji: "🌔" };
  if (phase < 0.53) return { name: "Full Moon", emoji: "🌕" };
  if (phase < 0.72) return { name: "Waning Gibbous", emoji: "🌖" };
  if (phase < 0.78) return { name: "Last Quarter", emoji: "🌗" };
  return { name: "Waning Crescent", emoji: "🌘" };
}

export function getSolarInfo(lat: number, lng: number, date = new Date()): SolarInfo {
  const times = SunCalc.getTimes(date, lat, lng);
  const moon = SunCalc.getMoonIllumination(date);
  const { name, emoji } = moonName(moon.phase);
  function safeFmt(d: Date | null): string {
    if (!d || isNaN(d.getTime())) return "—";
    return fmt(d);
  }

  return {
    sunrise: safeFmt(times.sunrise),
    sunset: safeFmt(times.sunset),
    goldenHourMorning: safeFmt(times.goldenHour),
    goldenHourEvening: safeFmt(times.goldenHourEnd),
    moonPhase: moon.phase,
    moonPhaseName: name,
    moonPhaseEmoji: emoji,
  };
}
