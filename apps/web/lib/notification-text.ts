import { formatDate, formatINR } from '@fpm/api';

type T = ((key: string, values?: Record<string, string | number>) => string) & { has: (key: string) => boolean };

/** Human text for a notification row, in whatever language `t` is bound to. */
export function notificationText(t: T, locale: string, kind: string, params: unknown): string {
  const p = (params ?? {}) as Record<string, string | number>;
  const values: Record<string, string | number> = { ...p };
  if (typeof p.amount_paise === 'number') values.amount = formatINR(p.amount_paise);
  if (typeof p.type === 'string') values.type = t(`labels.chargeType.${p.type}`);
  if (typeof p.status === 'string') values.status = t(`status.complaint.${p.status}`);
  if (typeof p.date === 'string') values.date = formatDate(p.date, locale);
  for (const k of ['reason', 'code', 'title', 'days', 'count', 'note', 'name', 'house', 'date', 'amount']) values[k] = values[k] ?? '';
  const key = `notifications.kinds.${kind}`;
  return t.has(key) ? t(key, values) : kind;
}
