import 'server-only';
import { cookies } from 'next/headers';
import { isLocale, LOCALE_COOKIE } from '@fpm/i18n';

export async function setLocaleCookie(locale: string | null | undefined) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
}
