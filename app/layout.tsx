import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Plus_Jakarta_Sans, JetBrains_Mono, Heebo } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegister } from "@/components/shared/ServiceWorkerRegister";
import { ClientErrorBoundary } from "@/components/shared/ClientErrorBoundary";
import { SkipToContent } from "@/components/shared/SkipToContent";
import { Analytics } from "@/components/shared/Analytics";
import { directionForLocale } from "@/lib/i18n/direction";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-hebrew",
  display: "swap",
});

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700", "800"],
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  // Locale-specific title/description/OG live in app/[locale]/layout.tsx
  title: { default: "HiddenSpots", template: "%s — HiddenSpots" },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HiddenSpots",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1410" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  // Shared with the useDir hook, so a component's idea of the direction can
  // never drift from the document's.
  const dir = directionForLocale(locale);
  const isRtl = dir === "rtl";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={`${sans.variable} ${heebo.variable} ${display.variable} ${mono.variable} font-sans ${isRtl ? "[font-family:var(--font-hebrew),var(--font-sans)]" : ""}`}
      >
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <SkipToContent />
            <ClientErrorBoundary>{children}</ClientErrorBoundary>
            <Toaster />
            <ServiceWorkerRegister />
            <Suspense fallback={null}>
              <Analytics />
            </Suspense>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
