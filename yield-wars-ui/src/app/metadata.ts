import type { Metadata } from "next";

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