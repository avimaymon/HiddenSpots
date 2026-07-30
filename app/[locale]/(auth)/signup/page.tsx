import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignUpForm } from "@/components/shared/SignUpForm";
import { AppLogo } from "@/components/shared/AppLogo";
import { Link } from "@/i18n/navigation";
import { NatureAtmosphere } from "@/components/effects/NatureAtmosphere";
import { authPageMetadata } from "@/lib/seo/metadata";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return authPageMetadata(locale, "/signup", "signUp");
}

export default async function SignUpPage() {
  const t = await getTranslations("auth");
  return (
    <main id="main-content" className="min-h-[100dvh] flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <NatureAtmosphere className="opacity-90" />
      <div className="w-full max-w-[400px] space-y-8 animate-fade-in relative z-10">
        <div className="text-center space-y-3">
          <AppLogo size="lg" />
          <h1 className="text-2xl font-bold">{t("createAccount")}</h1>
        </div>
        <div className="rounded-2xl glass-strong p-5 sm:p-6 shadow-float">
          <SignUpForm />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link href="/signin" className="text-primary font-medium hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </div>
    </main>
  );
}
