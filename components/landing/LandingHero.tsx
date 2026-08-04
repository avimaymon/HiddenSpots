"use client";

import { Link } from "@/i18n/navigation";
import { AppLogo } from "@/components/shared/AppLogo";
import { Button } from "@/components/ui/button";
import { NatureAtmosphere } from "@/components/effects/NatureAtmosphere";
import { FadeIn, ScaleIn, StaggerItem, StaggerList } from "@/components/motion/primitives";
import { MapPin, Mountain, Share2, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";

export function LandingHero() {
  const t = useTranslations("onboarding");

  return (
    <div className="min-h-[100dvh] flex flex-col relative overflow-hidden">
      <NatureAtmosphere />

      <header className="relative z-20 flex items-center justify-between px-4 sm:px-8 py-4">
        <AppLogo size="sm" />
        <Button variant="ghost" size="sm" className="rounded-xl glass" asChild>
          <Link href="/signin">{t("signIn")}</Link>
        </Button>
      </header>

      <main id="main-content" className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-8 pb-16">
        <div className="max-w-3xl mx-auto w-full text-center space-y-6 sm:space-y-8">
          {/* priority: this wordmark is the page's LCP element. Fading it in
              from opacity 0 meant it could not count as painted until the
              animation finished, so a 459ms server response reported a 3.7s
              LCP. It keeps the slide, and the delay is dropped so nothing
              gates first paint. */}
          <FadeIn delay={0} priority>
            <p className="font-display text-6xl sm:text-7xl md:text-8xl font-extrabold tracking-tight leading-none">
              <span className="text-gradient">HiddenSpots</span>
            </p>
          </FadeIn>

          <FadeIn delay={0.12} y={18} priority>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground/90 leading-snug max-w-xl mx-auto">
              {t("landingHeadline")}
            </h1>
          </FadeIn>

          <FadeIn delay={0.28} y={16}>
            <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
              {t("landingSub")}
            </p>
          </FadeIn>

          <FadeIn delay={0.34} y={12}>
            <p className="text-sm text-foreground/70 max-w-md mx-auto leading-snug">
              {t("landingProof")}
            </p>
          </FadeIn>

          <FadeIn delay={0.4} y={14}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <Button
                size="lg"
                className="rounded-2xl h-12 px-10 shadow-float fab-nature border-0 text-primary-foreground w-full sm:w-auto"
                asChild
              >
                <Link href="/signup">{t("getStarted")}</Link>
              </Button>
              <Link
                href="/signin"
                className="text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground"
              >
                {t("signIn")}
              </Link>
            </div>
          </FadeIn>
        </div>
      </main>

      <section className="relative z-10 border-t border-border/40 bg-background/60 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
          <StaggerList className="grid sm:grid-cols-3 gap-5" stagger={0.08}>
            {[
              { icon: MapPin, title: t("featureMap"), desc: t("featureMapDesc") },
              { icon: Share2, title: t("featureShare"), desc: t("featureShareDesc") },
              { icon: Smartphone, title: t("featureField"), desc: t("featureFieldDesc") },
            ].map(({ icon: Icon, title, desc }) => (
              <StaggerItem key={title}>
                <div className="lift-on-hover rounded-2xl border border-border/50 bg-card/70 backdrop-blur p-5 space-y-3 h-full">
                  <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>

          <ScaleIn delay={0.2} className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-10">
            <Mountain className="h-4 w-4 text-primary" />
            <span>{t("landingFooter")}</span>
          </ScaleIn>
        </div>
      </section>
    </div>
  );
}
