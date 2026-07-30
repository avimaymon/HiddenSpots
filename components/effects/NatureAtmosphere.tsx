"use client";

/** Full-bleed golden-hour atmosphere — CSS/SVG only, pauses when reduced-motion. */
export function NatureAtmosphere({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute inset-0 aurora-wash" />
      <div className="absolute inset-0 sun-flare" />
      <div className="absolute inset-0 noise-film opacity-[0.035] mix-blend-overlay" />
      <svg
        className="absolute inset-x-0 bottom-0 w-full h-[42%] text-primary/25 dark:text-primary/15"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          className="mist-drift"
          fill="currentColor"
          d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,208C672,213,768,203,864,170.7C960,139,1056,85,1152,90.7C1248,96,1344,160,1392,192L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
        <path
          className="mist-drift-slow opacity-60"
          fill="hsl(var(--foreground) / 0.06)"
          d="M0,256L60,240C120,224,240,192,360,192C480,192,600,224,720,229.3C840,235,960,213,1080,197.3C1200,181,1320,171,1380,165.3L1440,160L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
        />
      </svg>
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
    </div>
  );
}
