import 'server-only';
import { getTranslations } from 'next-intl/server';
import { formatDate, formatINR, formatMonth, whatsappLink } from '@fpm/api';
import { isLocale } from '@fpm/i18n';

/** A wa.me link with a reminder written in the tenant's own language. */
export async function reminderLink(r: {
  type: string;
  stage: 'upcoming' | 'due' | 'overdue';
  tenantName: string;
  tenantPhone: string;
  language: string | null;
  amountPaise: number;
  dueDate: string;
  house: string;
  ownerName: string;
}) {
  const locale = isLocale(r.language) ? r.language : 'en';
  const t = await getTranslations({ locale, namespace: 'whatsapp' });
  const days = Math.max(0, Math.round((Date.now() - Date.parse(`${r.dueDate}T00:00:00+05:30`)) / 86_400_000));
  const values = {
    name: r.tenantName,
    owner: r.ownerName,
    amount: formatINR(r.amountPaise),
    month: formatMonth(r.dueDate, locale),
    house: r.house,
    date: formatDate(r.dueDate, locale),
    days,
  };
  const key = r.type === 'eb' ? 'eb_reminder' : (`rent_${r.stage}` as const);
  return whatsappLink(r.tenantPhone, t(key, values));
}
