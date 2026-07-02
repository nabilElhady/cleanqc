import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import CheckoutCallbackTracker from "@/components/checkout/CheckoutCallbackTracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Crewmark - Next-Gen Quality Control",
  description: "Crewmark - Next-Gen Quality Control",
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Crewmark',
  },
  formatDetection: {
    telephone: false,
  },
};

import MaintenanceBanner from '@/components/MaintenanceBanner'
import { InstallPrompt } from '@/components/pwa/InstallPrompt'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Removed forced 'dark' class and grain-overlay to support the crisp monochrome mode.
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#09090B" />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground relative overflow-x-hidden">
        <MaintenanceBanner />
        <CheckoutCallbackTracker />
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
