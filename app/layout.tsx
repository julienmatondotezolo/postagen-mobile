import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import ToastProvider from "@/components/ToastProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Postagen - Professional social media posts in 2 minutes",
  description: "Professional social media posts in 2 minutes.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Postagen",
  },
  icons: {
    icon: "/PostaGen-Symbol.png",
    apple: "/PostaGen-Symbol.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#8B5CF6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <ToastProvider />
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
