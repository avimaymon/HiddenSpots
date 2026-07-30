import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AppLogo } from "@/components/shared/AppLogo";
import { Button } from "@/components/ui/button";
import { MapPin, Home } from "lucide-react";

export default async function NotFoundPage() {
  const t = await getTranslations("errors");
  const tc = await getTranslations("common");

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center gap-6 p-6 text-center bg-background">
      <AppLogo size="md" />
      <div className="space-y-2 max-w-md">
        <p className="text-6xl font-display font-extrabold text-gradient tabular-nums" aria-hidden>
          404
        </p>
        <h1 className="text-xl font-semibold">{t("notFoundTitle")}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{t("notFoundBody")}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button className="rounded-xl" asChild>
          <Link href="/app">
            <MapPin className="h-4 w-4" aria-hidden />
            {t("goToMap")}
          </Link>
        </Button>
        <Button variant="outline" className="rounded-xl" asChild>
          <Link href="/">
            <Home className="h-4 w-4" aria-hidden />
            {tc("appName")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
