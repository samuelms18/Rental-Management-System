import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, isLocale, loadMessages, LOCALE_COOKIE } from '@fpm/i18n';

// No locale in the URL: the language comes from the user's profile, mirrored into a cookie.
export default getRequestConfig(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(value) ? value : defaultLocale;
  return { locale, messages: await loadMessages(locale), timeZone: 'Asia/Kolkata' };
});
