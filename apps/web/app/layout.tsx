import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { Noto_Sans_Devanagari, Noto_Sans_Malayalam, Noto_Sans_Tamil, Plus_Jakarta_Sans } from 'next/font/google';
import { Building2 } from 'lucide-react';
import { ServiceWorker } from '@/components/service-worker';
import './globals.css';

const latin = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-latin', display: 'swap' });
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
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#121212' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Runs before first paint: the chosen light/dark theme, and the splash only on the first load of a browser session.
const BOOT = `try{var d=document.documentElement,t=localStorage.getItem('fpm-theme');if(t==='dark'||t==='light')d.dataset.theme=t;if(sessionStorage.getItem('fpm-splash')){d.classList.add('splash-seen')}else{sessionStorage.setItem('fpm-splash','1')}}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const t = await getTranslations('app');
  return (
    <html lang={locale} suppressHydrationWarning className={`${latin.variable} ${tamil.variable} ${deva.variable} ${mal.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body className="min-h-dvh antialiased">
        <div aria-hidden className="bg-orbs"><span /><span /><span /><span /><i /><i /><i /><i /><i /><i /><i /><i /></div>
        <div aria-hidden className="splash hero">
          <div className="splash-mark flex size-20 items-center justify-center rounded-[26px] bg-white text-[var(--fpm-hero-from)] shadow-lift">
            <Building2 className="size-10" strokeWidth={1.8} />
          </div>
          <div className="splash-title px-6 text-center">
            <div className="text-[28px] font-extrabold leading-tight tracking-[-0.02em]">{t('homeName')}</div>
            <div className="mt-1 text-sm font-medium opacity-90">{t('name')}</div>
          </div>
          <div className="splash-bar" />
        </div>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
