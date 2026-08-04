/**
 * GET /api/drive/callback
 * Receives the Google OAuth code, exchanges it for tokens,
 * and stores them in the Account table for the current user.
 */
import { auth } from "@/lib/auth/config";
import { verifyDriveOAuthState } from "@/lib/auth/oauth-state";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function baseUrl(req: NextRequest): string {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
}

async function settingsRedirect(
  base: string,
  userId: string | undefined,
  drive: "connected" | "error"
): Promise<NextResponse> {
  let locale: "he" | "en" = "he";
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { locale: true },
    });
    if (user?.locale === "en") locale = "en";
  }
  return NextResponse.redirect(`${base}/${locale}/settings?drive=${drive}`);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  const error = searchParams.get("error");

  const base = baseUrl(req);
  const session = await auth();
  const sessionUserId = session?.user?.id;

  if (error || !code || !stateRaw) {
    return settingsRedirect(base, sessionUserId, "error");
  }

  const verified = verifyDriveOAuthState(stateRaw);
  if (!verified) {
    return settingsRedirect(base, sessionUserId, "error");
  }

  // Bind to the signed-in session — never trust state alone
  if (!sessionUserId || sessionUserId !== verified.userId) {
    return settingsRedirect(base, sessionUserId, "error");
  }

  const userId = verified.userId;

  const clientId = process.env.AUTH_GOOGLE_ID;
  const clientSecret = process.env.AUTH_GOOGLE_SECRET;
  if (!clientId || !clientSecret) {
    return settingsRedirect(base, userId, "error");
  }

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
    return settingsRedirect(base, userId, "error");
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    id_token?: string;
  };

  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userInfoRes.ok) {
    return settingsRedirect(base, userId, "error");
  }
  const userInfo = (await userInfoRes.json()) as { sub: string };
  const providerAccountId = userInfo.sub;

  // Reject linking a Google account already owned by someone else
  const existing = await prisma.account.findUnique({
    where: {
      provider_providerAccountId: { provider: "google", providerAccountId },
    },
    select: { userId: true },
  });
  if (existing && existing.userId !== userId) {
    return settingsRedirect(base, userId, "error");
  }

  const expiresAt = Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 3600);

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
      // Never change userId on update — only refresh tokens for the same owner
      access_token: tokens.access_token,
      ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
      expires_at: expiresAt,
      scope: "openid email profile https://www.googleapis.com/auth/drive.file",
    },
  });

  return settingsRedirect(base, userId, "connected");
}
