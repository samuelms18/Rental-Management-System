import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate } from '@fpm/api';
import { Card, Empty } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireTenant } from '@/lib/auth';
import { markAnnouncementsRead } from '@/lib/actions/people';

export default async function TenantAnnouncements() {
  const { supabase } = await requireTenant();
  const t = await getTranslations();
  const locale = await getLocale();
  const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(50);
  await markAnnouncementsRead((data ?? []).map((a) => a.id));
  return (
    <>
      <PageHeader title={t('announcements.title')} />
      {!data?.length ? (
        <Empty>{t('announcements.empty')}</Empty>
      ) : (
        <div className="space-y-3">
          {data.map((a) => {
            const tr = (a.translations as Record<string, { title?: string; body?: string }>)?.[locale];
            return (
              <Card key={a.id}>
                <div className="text-xs text-muted">{formatDate(a.created_at, locale)}</div>
                <h2 className="mt-1 font-semibold">{tr?.title ?? a.title}</h2>
                <p className="mt-1 whitespace-pre-wrap text-sm">{tr?.body ?? a.body}</p>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
