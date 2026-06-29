import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

export const metadata: Metadata = {
  title: "ALTU | Hukuk Büro Yönetim Sistemi",
  description: "Türk hukuk büroları için akıllı yönetim platformu",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "ALTU" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#1e40af",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="ALTU" />
      </head>
      <body className="min-h-full bg-slate-50 antialiased">
        {children}
        <PWAInstallPrompt />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}