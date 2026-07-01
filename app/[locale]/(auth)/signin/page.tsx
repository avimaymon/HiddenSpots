import { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { SignInForm } from "@/components/shared/SignInForm";
import { Link } from "@/i18n/navigation";
import { AppLogo } from "@/components/shared/AppLogo";
import { MapPin, Mountain, Droplets, Sun } from "lucide-react";

export const metadata: Metadata = { title: "Sign In" };

const FEATURES = [
  { icon: MapPin, label: "Map-first experience" },
  { icon: Mountain, label: "Trails & viewpoints" },
  { icon: Droplets, label: "Springs & waterfalls" },
  { icon: Sun, label: "Sunrise & sunset spots" },
];

const TAGS = ["Springs", "Waterfalls", "Viewpoints", "Hidden Gems", "Trails"];

export default async function SignInPage() {
  const t = await getTranslations("auth");
  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row">
      {/* Form side */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-12 relative">
        <div className="absolute inset-0 gradient-mesh opacity-60 lg:opacity-40 pointer-events-none" />
        <div className="w-full max-w-[400px] space-y-8 relative z-10 animate-fade-in">
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <AppLogo size="lg" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("welcome")}</h1>
              <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
                {t("subtitle")}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 sm:p-6 shadow-glass">
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
      </div>

      {/* Hero side */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/5 to-background" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23166534' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-lg text-center space-y-8 animate-scale-in">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15 border border-primary/20 mx-auto">
            <span className="text-5xl">🌿</span>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight">
              Your personal atlas of{" "}
              <span className="text-gradient">nature&apos;s hidden gems</span>
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Discover, document, and revisit the most beautiful outdoor places.
              Build your collection over a lifetime of exploration.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-left">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 rounded-xl bg-background/60 backdrop-blur border border-border/50 px-3 py-2.5"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {TAGS.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-primary/10 border border-primary/15 px-3.5 py-1.5 text-sm font-medium text-primary"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
