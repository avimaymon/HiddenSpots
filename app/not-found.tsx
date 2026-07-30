import Link from "next/link";
import { routing } from "@/i18n/routing";

/** Fallback when the request never enters a valid `[locale]` segment. */
export default function RootNotFound() {
  const home = `/${routing.defaultLocale}`;
  const map = `/${routing.defaultLocale}/app`;

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 p-6 text-center bg-background text-foreground">
      <p className="text-6xl font-bold tabular-nums text-primary" aria-hidden>
        404
      </p>
      <div className="space-y-2 max-w-md">
        <h1 className="text-xl font-semibold">Page not found · העמוד לא נמצא</h1>
        <p className="text-sm text-muted-foreground">
          The link may be broken or expired. · ייתכן שהקישור שבור או שפג תוקפו.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href={map}
          className="inline-flex h-11 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          Map · מפה
        </Link>
        <Link
          href={home}
          className="inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-medium"
        >
          Home · בית
        </Link>
      </div>
    </div>
  );
}
