import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "@/components/shared/ResetPasswordForm";
import { AppLogo } from "@/components/shared/AppLogo";
import { authPageMetadata } from "@/lib/seo/metadata";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return authPageMetadata(locale, "/reset-password", "resetTitle");
}

export default async function ResetPasswordPage({ searchParams }: Props) {
  const t = await getTranslations("auth");
  const { token = "" } = await searchParams;
  return (
    <main id="main-content" className="min-h-[100dvh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px] space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center"><AppLogo size="lg" /></div>
          <h1 className="text-2xl font-bold">{t("resetTitle")}</h1>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 p-5 sm:p-6 shadow-glass">
          <ResetPasswordForm token={token} />
        </div>
      </div>
    </main>
  );
}
