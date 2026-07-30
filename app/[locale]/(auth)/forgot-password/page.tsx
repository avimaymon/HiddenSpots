import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/shared/ForgotPasswordForm";
import { AppLogo } from "@/components/shared/AppLogo";
import { authPageMetadata } from "@/lib/seo/metadata";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return authPageMetadata(locale, "/forgot-password", "forgotTitle");
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  return (
    <main id="main-content" className="min-h-[100dvh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px] space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center"><AppLogo size="lg" /></div>
          <h1 className="text-2xl font-bold">{t("forgotTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("forgotSubtitle")}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-5 sm:p-6 shadow-glass">
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  );
}
