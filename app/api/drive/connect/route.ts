/**
 * GET /api/drive/connect
 * Redirects the user to Google OAuth with drive.file scope.
 * On return, Google sends the code to /api/drive/callback.
 */
import { auth } from "@/lib/auth/config";
import { NextRequest, NextResponse } from "next/server";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");

function baseUrl(req: NextRequest): string {
  // Prefer explicit env var; fall back to the request's own origin
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") ?? req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  const base = baseUrl(req);

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/signin", base));
  }

  const clientId = process.env.AUTH_GOOGLE_ID;
  if (!clientId) {
    // Misconfigured — send back to settings with error rather than crashing
    return NextResponse.redirect(`${base}/settings?drive=error`);
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${base}/api/drive/callback`,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent", // ensures refresh_token is always returned
    state: session.user.id,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
