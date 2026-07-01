import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono, Heebo } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { QueryProvider } from "@/components/shared/QueryProvider";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegister } from "@/components/shared/ServiceWorkerRegister";

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
  title: { default: "HiddenSpots", template: "%s — HiddenSpots" },
  description: "Your personal atlas of nature's hidden gems",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HiddenSpots",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1410" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const isRtl = locale === "he";

  return (
    <html lang={locale} dir={isRtl ? "rtl" : "ltr"} suppressHydrationWarning>
      <body
        className={`${sans.variable} ${heebo.variable} ${display.variable} ${mono.variable} font-sans ${isRtl ? "[font-family:var(--font-hebrew),var(--font-sans)]" : ""}`}
      >
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <QueryProvider>
              {children}
              <Toaster />
              <ServiceWorkerRegister />
            </QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
