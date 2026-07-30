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
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="rounded-xl glass" asChild>
            <Link href="/signin">{t("signIn")}</Link>
          </Button>
          <Button size="sm" className="rounded-xl shadow-float" asChild>
            <Link href="/signup">{t("getStarted")}</Link>
          </Button>
        </div>
      </header>

      <main id="main-content" className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-8 pb-16">
        <div className="max-w-3xl mx-auto w-full text-center space-y-7 sm:space-y-9">
          <FadeIn delay={0.05}>
            <p className="font-display text-6xl sm:text-7xl md:text-8xl font-extrabold tracking-tight leading-none">
              <span className="text-gradient">HiddenSpots</span>
            </p>
          </FadeIn>

          <FadeIn delay={0.18} y={18}>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground/90 leading-snug max-w-xl mx-auto">
              {t("landingHeadline")}
            </h1>
          </FadeIn>

          <FadeIn delay={0.28} y={16}>
            <p className="text-muted-foreground text-base sm:text-lg max-w-lg mx-auto leading-relaxed">
              {t("landingSub")}
            </p>
          </FadeIn>

          <FadeIn delay={0.38} y={14}>
            <div className="flex flex-wrap justify-center gap-3 pt-1">
              <Button
                size="lg"
                className="rounded-2xl h-12 px-8 shadow-float fab-nature border-0 text-primary-foreground"
                asChild
              >
                <Link href="/signup">{t("getStarted")}</Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-2xl h-12 px-8 glass-strong" asChild>
                <Link href="/signin">{t("signIn")}</Link>
              </Button>
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
