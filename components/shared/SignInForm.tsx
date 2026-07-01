"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Github, Chrome, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export function SignInForm() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/he/app";
  const [loading, setLoading] = useState<string | null>(null);

  async function handleOAuth(provider: string) {
    setLoading(provider);
    await signIn(provider, { callbackUrl });
  }

  async function handleEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading("email");
    const fd = new FormData(e.currentTarget);
    await signIn("credentials", {
      email: fd.get("email"),
      password: fd.get("password"),
      callbackUrl,
    });
    setLoading(null);
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3">
        <Button
          variant="outline"
          className="w-full h-11 bg-background/50"
          onClick={() => handleOAuth("google")}
          disabled={!!loading}
        >
          {loading === "google" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Chrome className="h-4 w-4" />
          )}
          Continue with Google
        </Button>

        <Button
          variant="outline"
          className="w-full h-11 bg-background/50"
          onClick={() => handleOAuth("github")}
          disabled={!!loading}
        >
          {loading === "github" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Github className="h-4 w-4" />
          )}
          Continue with GitHub
        </Button>
      </div>

      <div className="relative py-1">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground font-medium">
          or with email
        </span>
      </div>

      <form onSubmit={handleEmail} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              className="pl-10 h-11"
              required
              autoComplete="email"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            className="h-11"
            required
            autoComplete="current-password"
          />
        </div>
        <Button type="submit" className="w-full h-11 font-semibold" disabled={!!loading}>
          {loading === "email" && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign In
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground leading-relaxed">
        By signing in, you agree to our{" "}
        <a href="#" className="text-primary hover:underline font-medium">Terms</a>
        {" "}and{" "}
        <a href="#" className="text-primary hover:underline font-medium">Privacy Policy</a>.
      </p>
    </div>
  );
}
