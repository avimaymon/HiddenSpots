"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerUser } from "@/lib/actions/auth";
import { safeCallbackUrl } from "@/lib/auth/safe-callback-url";
import { toast } from "@/hooks/use-toast";

export function SignUpForm() {
  const t = useTranslations("auth");
  const params = useSearchParams();
  const callbackUrl = safeCallbackUrl(params.get("callbackUrl"), "/he/app");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      await registerUser({
        name: fd.get("name"),
        email: fd.get("email"),
        password: fd.get("password"),
      });
      await signIn("credentials", {
        email: fd.get("email"),
        password: fd.get("password"),
        callbackUrl,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast({
        title: msg.includes("RATE_LIMITED") ? t("tooManyAttempts") : msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("name")}</Label>
        <Input id="name" name="name" required className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input id="email" name="email" type="email" required className="h-11" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input id="password" name="password" type="password" minLength={8} required className="h-11" />
      </div>
      <Button type="submit" className="w-full h-11" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("signUp")}
      </Button>
    </form>
  );
}
