import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Matchstick - Connect Startups with the Right Investors in < 1 Minute",
  description: "Access a diverse network of over 3,000 investors with verified email addresses. Get matched with the best investors for your startup based on industry and funding stage. Free startup-investor matching platform.",
  keywords: [
    "startup funding",
    "investor matching",
    "venture capital",
    "startup investors",
    "funding stage",
    "startup networking",
    "VC matching",
    "angel investors",
    "startup capital",
    "investor database"
  ],
  authors: [{ name: "Matchstick" }],
  creator: "Matchstick",
  publisher: "Matchstick",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://matchstickvc.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: "Matchstick - Connect Startups with the Right Investors",
    description: "Access a diverse network of over 3,000 investors with verified email addresses. Get matched with the best investors for your startup in under 1 minute.",
    url: 'https://matchstickvc.com',
    siteName: 'Matchstick',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Matchstick - Startup Investor Matching Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Matchstick - Connect Startups with the Right Investors",
    description: "Access a diverse network of over 3,000 investors with verified email addresses. Get matched with the best investors for your startup in under 1 minute.",
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
