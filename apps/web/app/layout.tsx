import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { Noto_Sans, Noto_Sans_Devanagari, Noto_Sans_Malayalam, Noto_Sans_Tamil } from 'next/font/google';
import { ServiceWorker } from '@/components/service-worker';
import './globals.css';

const latin = Noto_Sans({ subsets: ['latin'], variable: '--font-latin', display: 'swap' });
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
    { media: '(prefers-color-scheme: light)', color: '#1f5f4a' },
    { media: '(prefers-color-scheme: dark)', color: '#13130f' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${latin.variable} ${tamil.variable} ${deva.variable} ${mal.variable}`}>
      <body className="min-h-dvh antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
