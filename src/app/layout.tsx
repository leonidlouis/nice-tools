import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/providers/PostHogProvider";
import PostHogPageView from "@/components/posthog-pageview";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: 'Tools | bylouis.io',
    template: '%s | Tools | bylouis.io',
  },
  description: 'A collection of free, personally curated pleasant-to-use tools bylouis.io.',
  keywords: ['tools', 'browser tools', 'privacy', 'free', 'image compression', 'bylouis'],

  metadataBase: new URL('https://tools.bylouis.io'),
  alternates: {
    canonical: '/',
  },

  openGraph: {
    title: 'Tools | bylouis.io',
    description: 'Free, personally curated pleasant-to-use tools. No sign-ups, no uploads.',
    url: 'https://tools.bylouis.io',
    siteName: 'Tools | bylouis.io',
    locale: 'en_US',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Tools | bylouis.io',
    description: 'Free, personally curated pleasant-to-use tools. No sign-ups, no uploads.',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },

  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',

  authors: [{ name: 'Louis', url: 'https://bylouis.io' }],
  creator: 'Louis',
  publisher: 'Louis',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
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
        <PostHogProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
