/**
 * GET /api/drive/connect
 * Redirects the user to Google OAuth with drive.file scope.
 * On return, Google sends the code to /api/drive/callback.
 */
import { auth } from "@/lib/auth/config";
import { signDriveOAuthState } from "@/lib/auth/oauth-state";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

function baseUrl(req: NextRequest): string {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
}

async function localeForUser(userId: string): Promise<"he" | "en"> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { locale: true },
  });
  return user?.locale === "en" ? "en" : "he";
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const base = baseUrl(req);

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/he/signin", base));
  }

  const locale = await localeForUser(session.user.id);
  const clientId = process.env.AUTH_GOOGLE_ID;
  if (!clientId) {
    return NextResponse.redirect(`${base}/${locale}/settings?drive=error`);
  }

  let state: string;
  try {
    state = signDriveOAuthState(session.user.id);
  } catch {
    return NextResponse.redirect(`${base}/${locale}/settings?drive=error`);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${base}/api/drive/callback`,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
