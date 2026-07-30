"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { requestPasswordReset } from "@/lib/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [devUrl, setDevUrl] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setDevUrl(null);
    try {
      const result = await requestPasswordReset({ email });
      toast({ title: t("resetSent"), variant: "success" });
      if ("devResetUrl" in result && result.devResetUrl) {
        setDevUrl(result.devResetUrl);
      }
    } catch (err) {
      toast({ title: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11"
          autoComplete="email"
        />
      </div>
      <Button type="submit" className="w-full rounded-xl h-11" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("sendResetLink")}
      </Button>
      {devUrl && (
        <p className="text-xs text-muted-foreground break-all">
          {t("devResetHint")}{" "}
          <a href={devUrl} className="text-primary underline">
            {devUrl}
          </a>
        </p>
      )}
      <p className="text-center text-sm">
        <Link href="/signin" className="text-primary hover:underline">
          {t("backToSignIn")}
        </Link>
      </p>
    </form>
  );
}
