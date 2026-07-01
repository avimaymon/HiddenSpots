import createIntlMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const LEGACY_REDIRECTS: Record<string, string> = {
  "/map": "/app",
  "/signin": "/signin",
  "/signup": "/signup",
};

function stripLocale(pathname: string) {
  const match = pathname.match(/^\/(he|en)(\/.*)?$/);
  if (!match) return { locale: null as string | null, path: pathname };
  return { locale: match[1], path: match[2] || "/" };
}

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Legacy paths without locale → default locale
  if (!pathname.startsWith("/he") && !pathname.startsWith("/en") && !pathname.startsWith("/api")) {
    if (pathname === "/" || LEGACY_REDIRECTS[pathname] || pathname.startsWith("/locations") || pathname.startsWith("/collections") || pathname.startsWith("/trips") || pathname.startsWith("/visits") || pathname.startsWith("/dashboard") || pathname.startsWith("/settings") || pathname.startsWith("/import") || pathname.startsWith("/share")) {
      const target = pathname === "/" ? "/app" : LEGACY_REDIRECTS[pathname] ?? pathname;
      const url = req.nextUrl.clone();
      url.pathname = `/${routing.defaultLocale}${target}`;
      return NextResponse.redirect(url);
    }
  }

  const intlResponse = intlMiddleware(req);
  const response = intlResponse ?? NextResponse.next();

  const { path } = stripLocale(pathname);
  const isShare = path.startsWith("/share/");
  const isAuth = path === "/signin" || path === "/signup";
  const isProtected =
    path.startsWith("/app") ||
    path.startsWith("/locations") ||
    path.startsWith("/collections") ||
    path.startsWith("/trips") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/settings") ||
    path.startsWith("/visits") ||
    path.startsWith("/import");

  const sessionToken =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;
  const isAuthSession = !!sessionToken;

  if (isProtected && !isAuthSession) {
    const locale = stripLocale(pathname).locale ?? routing.defaultLocale;
    const signIn = new URL(`/${locale}/signin`, req.url);
    signIn.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signIn);
  }

  if (isAuthSession && isAuth) {
    const locale = stripLocale(pathname).locale ?? routing.defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/app`, req.url));
  }

  if (isShare) return response;

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icons|sw.js|manifest.json|uploads).*)"],
};
