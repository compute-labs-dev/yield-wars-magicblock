import type { Metadata } from "next";
import { Pixelify_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers/Providers";
import { ReduxProvider } from '@/components/providers/ReduxProvider';
import { Analytics } from '@vercel/analytics/react';
import Image from 'next/image';

const pixelifySans = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-pixelify-sans",
});

export const metadata: Metadata = {
  title: 'Yield Wars | Compute Labs',
  description:
    'Compete with others to earn the most yield while supplying demand to the compute market',
  openGraph: {
    title: 'Yield Wars | Compute Labs',
    description:
      'Compete with others to earn the most yield while supplying demand to the compute market',
    images: [
      {
        url: '/logo-shared.jpg',
        width: 1200,
        height: 630,
        alt: 'Compute Labs logo or description',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Yield Wars | Compute Labs',
    description:
      'Compete with others to earn the most yield while supplying demand to the compute market',
    images: ['/logo-shared.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={pixelifySans.className} suppressHydrationWarning>
      <body className="bg-black h-[100vh] w-full flex flex-col justify-between">
        <ReduxProvider>
          <Providers>
            <div className="flex items-center justify-center">
              <Image src={'/yield-wars-logo.svg'} alt="Yield Wars Logo" width={250} height={50} />
            </div>
            {children}
          </Providers>
        </ReduxProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
