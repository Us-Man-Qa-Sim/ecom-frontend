import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { LazyToaster } from '@/components/lazy-toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { publicEnv } from '@/env';
import { CartHydrator } from '@/features/cart/cart-hydrator';
import './globals.css';

const geistSans = Geist({ variable: '--font-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.NEXT_PUBLIC_SITE_URL),
  title: { default: 'Ecom', template: '%s · Ecom' },
  description: 'A small storefront built on the ecom microservices backend.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="bg-background text-foreground sr-only z-50 rounded-md border px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>
        <ThemeProvider>
          {children}
          <CartHydrator />
          <LazyToaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
