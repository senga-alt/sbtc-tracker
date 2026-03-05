/**
 * Root Layout
 * 
 * Main application layout with providers and global styles.
 */

import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { QueryProvider } from '@/providers';
import './globals.css';

// =============================================================================
// FONTS
// =============================================================================

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

// =============================================================================
// METADATA
// =============================================================================

export const metadata: Metadata = {
  title: {
    default: 'sBTC Portfolio Tracker',
    template: '%s | sBTC Portfolio Tracker',
  },
  description: 
    'Track your sBTC holdings across the Stacks ecosystem. Monitor DeFi positions, view transaction history, and analyze your Bitcoin-on-Stacks portfolio.',
  keywords: [
    'sBTC',
    'Bitcoin',
    'Stacks',
    'portfolio',
    'tracker',
    'DeFi',
    'cryptocurrency',
    'wallet',
  ],
  authors: [{ name: 'sBTC Portfolio Tracker Team' }],
  creator: 'sBTC Portfolio Tracker',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'sBTC Portfolio Tracker',
    title: 'sBTC Portfolio Tracker',
    description: 
      'Track your sBTC holdings across the Stacks ecosystem. Monitor DeFi positions and analyze your portfolio.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'sBTC Portfolio Tracker',
    description: 
      'Track your sBTC holdings across the Stacks ecosystem. Monitor DeFi positions and analyze your portfolio.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

// =============================================================================
// LAYOUT
// =============================================================================

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <QueryProvider>
          <div className="relative flex min-h-screen flex-col">
            {children}
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
