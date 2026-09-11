import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AppShell from "@/components/AppShell";
import { getLocale } from "@/lib/i18n";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "DEALMAP — Don't overpay",
  description: "Know the real market price before you buy. Morocco price intelligence in MAD.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: { title: "DEALMAP — Don't overpay", description: "Know the real market price before you buy.", type: "website" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = cookies().get("dm_lang")?.value ?? "fr";
  const locale = getLocale(lang);
  const dir = locale === "ar" ? "rtl" : "ltr";
  const theme = cookies().get("dm_theme")?.value ?? "system";
  const accent = cookies().get("dm_accent")?.value ?? "blue";
  return (
    <html lang={locale} dir={dir} data-theme={theme === "system" ? undefined : theme} data-accent={accent}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#1e6ff2" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <Header locale={locale} />
        <AppShell>
          <main id="main" className="wrap" style={{ minHeight: "70vh", paddingBottom: 24, paddingTop: 8 }}>{children}</main>
          <Footer locale={locale} />
        </AppShell>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=document.cookie.match(/dm_theme=([^;]+)/);var th=t&&t[1];if(!th||th==='system'){if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.dataset.theme='dark';}}catch(e){}})();` }} />
      </body>
    </html>
  );
}
