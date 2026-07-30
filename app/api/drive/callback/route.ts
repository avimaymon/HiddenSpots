/**
 * GET /api/drive/callback
 * Receives the Google OAuth code, exchanges it for tokens,
 * and stores them in the Account table for the current user.
 */
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function baseUrl(req: NextRequest): string {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const userId = searchParams.get("state");
  const error = searchParams.get("error");

  const base = baseUrl(req);
  const settingsUrl = `${base}/settings`;

  if (error || !code || !userId) {
    return NextResponse.redirect(`${settingsUrl}?drive=error`);
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${settingsUrl}?drive=error`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${base}/api/drive/callback`,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${settingsUrl}?drive=error`);
  }

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    id_token?: string;
  };

  // Get Google account ID from userinfo
  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userInfoRes.ok) {
    return NextResponse.redirect(`${settingsUrl}?drive=error`);
  }
  const userInfo = await userInfoRes.json() as { sub: string };
  const providerAccountId = userInfo.sub;

  const expiresAt = Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 3600);

  // Upsert the Google Account row for this user
  await prisma.account.upsert({
    where: { provider_providerAccountId: { provider: "google", providerAccountId } },
    create: {
      userId,
      provider: "google",
      providerAccountId,
      type: "oauth",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: expiresAt,
      scope: "openid email profile https://www.googleapis.com/auth/drive.file",
      token_type: "Bearer",
    },
    update: {
      access_token: tokens.access_token,
      ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
      expires_at: expiresAt,
      scope: "openid email profile https://www.googleapis.com/auth/drive.file",
    },
  });

  return NextResponse.redirect(`${settingsUrl}?drive=connected`);
}
