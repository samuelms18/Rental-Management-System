import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { Fraunces, Hanken_Grotesk, Noto_Sans_Devanagari, Noto_Sans_Malayalam, Noto_Sans_Tamil } from 'next/font/google';
import { ServiceWorker } from '@/components/service-worker';
import './globals.css';

const latin = Hanken_Grotesk({ subsets: ['latin'], variable: '--font-latin', display: 'swap' });
const display = Fraunces({ subsets: ['latin'], variable: '--font-display-latin', display: 'swap', axes: ['opsz', 'SOFT'] });
const tamil = Noto_Sans_Tamil({ subsets: ['tamil'], variable: '--font-tamil', display: 'swap' });
const deva = Noto_Sans_Devanagari({ subsets: ['devanagari'], variable: '--font-devanagari', display: 'swap' });
const mal = Noto_Sans_Malayalam({ subsets: ['malayalam'], variable: '--font-malayalam', display: 'swap' });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('app');
  return {
    title: { default: t('name'), template: `%s · ${t('short')}` },
    applicationName: t('name'),
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, title: t('short'), statusBarStyle: 'default' },
    icons: { icon: '/icons/icon-192.png', apple: '/icons/apple-touch-icon.png' },
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f4c45' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1312' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${latin.variable} ${display.variable} ${tamil.variable} ${deva.variable} ${mal.variable}`}>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
