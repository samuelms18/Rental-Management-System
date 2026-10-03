import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { Empty, List, ListLink } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';

export default async function AgreementsPage() {
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const { data } = await supabase
    .from('agreements')
    .select('id, status, start_date, end_date, tenancies(code, houses(unit_number), tenants(full_name))')
    .order('created_at', { ascending: false });
  return (
    <>
      <PageHeader title={t('agreements.title')} action={<LinkButton href="/owner/agreements/templates" size="sm" variant="secondary">{t('agreements.templates')}</LinkButton>} />
      <p className="mb-4 text-sm text-muted">{t('agreements.startFromTenancy')}</p>
      {!data?.length ? (
        <Empty>{t('agreements.empty')}</Empty>
      ) : (
        <List>
          {data.map((a) => (
            <ListLink key={a.id} href={`/owner/agreements/${a.id}`} right={<Badge tone={toneFor(a.status)}>{t(`status.agreement.${a.status}`)}</Badge>}>
              <div className="font-medium">{a.tenancies?.houses?.unit_number} · {a.tenancies?.tenants?.full_name}</div>
              <div className="text-xs text-muted">{formatDate(a.start_date, locale)} – {formatDate(a.end_date, locale)}</div>
            </ListLink>
          ))}
        </List>
      )}
      <p className="mt-6 text-xs text-muted"><Link href="/owner/tenants" className="text-primary">{t('nav.tenants')}</Link></p>
    </>
  );
}
