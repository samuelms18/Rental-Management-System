export const locales = ['en', 'ta', 'hi', 'ml'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}

export async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  switch (locale) {
    case 'ta':
      return (await import('../messages/ta.json')).default;
    case 'hi':
      return (await import('../messages/hi.json')).default;
    case 'ml':
      return (await import('../messages/ml.json')).default;
    default:
      return (await import('../messages/en.json')).default;
  }
}
