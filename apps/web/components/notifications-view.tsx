import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate, formatINR } from '@fpm/api';
import type { Tables } from '@fpm/types';
import { Empty, List } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { markAllRead } from '@/lib/actions/account';
import { cn } from '@/components/ui/cn';

export async function NotificationsView({ items }: { items: Tables<'notifications'>[] }) {
  const t = await getTranslations();
  const locale = await getLocale();
  const text = (n: Tables<'notifications'>) => {
    const p = (n.params ?? {}) as Record<string, string | number>;
    const values: Record<string, string | number> = { ...p };
    if (typeof p.amount_paise === 'number') values.amount = formatINR(p.amount_paise);
    if (typeof p.type === 'string') values.type = t(`labels.chargeType.${p.type}`);
    if (typeof p.status === 'string') values.status = t(`status.complaint.${p.status}`);
    if (typeof p.date === 'string') values.date = formatDate(p.date, locale);
    for (const k of ['reason', 'code', 'title', 'days', 'count', 'note', 'name', 'house', 'date']) values[k] = values[k] ?? '';
    const key = `notifications.kinds.${n.kind}`;
    return t.has(key) ? t(key, values) : n.kind;
  };
  return (
    <>
      <PageHeader
        title={t('notifications.title')}
        action={
          items.some((n) => !n.read_at) ? (
            <form action={markAllRead}>
              <Button size="sm" variant="ghost">{t('notifications.markAllRead')}</Button>
            </form>
          ) : null
        }
      />
      {items.length === 0 ? (
        <Empty>{t('notifications.empty')}</Empty>
      ) : (
        <List>
          {items.map((n) => (
            <Link
              key={n.id}
              href={n.link ?? '#'}
              className={cn('block border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-2', !n.read_at && 'bg-primary-soft/50')}
            >
              <div className={cn('text-sm', !n.read_at && 'font-medium')}>{text(n)}</div>
              <div className="mt-0.5 text-xs text-muted">{formatDate(n.created_at, locale)}</div>
            </Link>
          ))}
        </List>
      )}
    </>
  );
}
