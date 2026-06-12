import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/lib/hooks/useToast";
import { PWAInit } from "@/components/layout/PWAInit";

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Readly — Sua estante social",
  description:
    "Acompanhe leituras, ganhe XP e suba de rank com a comunidade Readly.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Readly",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1F2D26",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${hanken.variable} ${playfair.variable} dark`}>
      <body className="min-h-screen bg-background text-on-background antialiased">
        <ToastProvider>
          <PWAInit />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
