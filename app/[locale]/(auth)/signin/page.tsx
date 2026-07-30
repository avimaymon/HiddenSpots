import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { SignInForm } from "@/components/shared/SignInForm";
import { Link } from "@/i18n/navigation";
import { AppLogo } from "@/components/shared/AppLogo";
import { NatureAtmosphere } from "@/components/effects/NatureAtmosphere";
import { MapPin, Mountain, Droplets, Sun } from "lucide-react";
import { authPageMetadata } from "@/lib/seo/metadata";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return authPageMetadata(locale, "/signin", "signIn");
}

const FEATURES = [
  { icon: MapPin, labelKey: "featMap" as const },
  { icon: Mountain, labelKey: "featTrails" as const },
  { icon: Droplets, labelKey: "featWater" as const },
  { icon: Sun, labelKey: "featLight" as const },
];

export default async function SignInPage() {
  const t = await getTranslations("auth");
  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row relative overflow-hidden">
      <main id="main-content" className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-12 relative">
        <NatureAtmosphere className="opacity-90" />
        <div className="w-full max-w-[400px] space-y-8 relative z-10 animate-fade-in">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <AppLogo size="lg" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("welcome")}</h1>
              <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">{t("subtitle")}</p>
            </div>
          </div>

          <div className="rounded-2xl glass-strong p-5 sm:p-6 shadow-float">
            <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-muted/50" />}>
              <SignInForm />
            </Suspense>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href="/signup" className="text-primary font-medium hover:underline">
              {t("signUp")}
            </Link>
          </p>
        </div>
      </main>

      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center p-12">
        <NatureAtmosphere />
        <div className="relative max-w-lg text-center space-y-8 animate-scale-in z-10">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15 border border-primary/20 mx-auto shadow-glow">
            <Mountain className="h-10 w-10 text-primary" aria-hidden />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight">
              <span className="text-gradient">HiddenSpots</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">{t("heroBlurb")}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-start">
            {FEATURES.map(({ icon: Icon, labelKey }) => (
              <div
                key={labelKey}
                className="flex items-center gap-2.5 rounded-xl glass px-3 py-2.5 lift-on-hover"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{t(labelKey)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
