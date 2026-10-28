import type { Metadata, Viewport } from "next";
import { Inter_Tight } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { SyncStatus } from "@/components/sync-status";
import "./globals.css";

const font = Inter_Tight({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter-tight" });

export const metadata: Metadata = {
  title: "Gestionale Flussi",
  description: "Movimento clienti e modulo ISTAT per rifugi e strutture ricettive",
  applicationName: "Gestionale Flussi",
  appleWebApp: { capable: true, title: "Flussi", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={font.variable}>
      <body style={{ fontFamily: "var(--font-inter-tight), var(--font)" }}>
        <NextIntlClientProvider>
          {children}
          <SyncStatus />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
