import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignUpForm } from "@/components/shared/SignUpForm";
import { AppLogo } from "@/components/shared/AppLogo";
import { Link } from "@/i18n/navigation";

export const metadata: Metadata = { title: "Sign Up" };

export default async function SignUpPage() {
  const t = await getTranslations("auth");
  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px] space-y-8 animate-fade-in">
        <div className="text-center space-y-3">
          <AppLogo size="lg" />
          <h1 className="text-2xl font-bold">{t("createAccount")}</h1>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 sm:p-6 shadow-glass">
          <SignUpForm />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {t("hasAccount")}{" "}
          <Link href="/signin" className="text-primary font-medium hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
