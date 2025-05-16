'use client';

import { Pixelify_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers/Providers";
import { Analytics } from '@vercel/analytics/react';
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { RetroGrid } from "@/components/ui/RetroGrid";
import WalletInitializer from '@/components/WalletInitializer';

const pixelifySans = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-pixelify-sans",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={pixelifySans.className} suppressHydrationWarning>
      <body className="bg-black h-[100vh] w-full flex flex-col justify-between">
        <Providers>
          <Header />
          <RetroGrid 
            className="fixed inset-0"
            angle={65}
            cellSize={30}
            opacity={0.2}
            lightLineColor="rgba(0, 255, 50, 0.5)"
            appearDelay={0}
          />
          <WalletInitializer>
            {children}
          </WalletInitializer>
          <Footer />
        </Providers>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
