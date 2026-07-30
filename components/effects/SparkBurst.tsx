"use client";

/** Tiny amber spark burst for success moments — CSS only. */
export function SparkBurst({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <span
          key={i}
          className="spark-particle absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-amber-accent"
          style={{
            ["--spark-angle" as string]: `${i * 60}deg`,
            animationDelay: `${i * 40}ms`,
          }}
        />
      ))}
    </div>
  );
}
