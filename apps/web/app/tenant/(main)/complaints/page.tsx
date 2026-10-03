import { getLocale, getTranslations } from 'next-intl/server';
import { Plus } from 'lucide-react';
import { formatDate } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { Empty, List, ListLink } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireTenant } from '@/lib/auth';

export default async function TenantComplaints() {
  const { supabase, tenancy } = await requireTenant();
  const t = await getTranslations();
  const locale = await getLocale();
  if (!tenancy) return <Empty>{t('tenantHome.noTenancy')}</Empty>;
  const { data } = await supabase.from('complaints').select('id, code, title, status, created_at').eq('tenancy_id', tenancy.id).order('created_at', { ascending: false });
  return (
    <>
      <PageHeader title={t('complaints.title')} action={<LinkButton href="/tenant/complaints/new" size="sm"><Plus className="size-4" />{t('common.add')}</LinkButton>} />
      {!data?.length ? (
        <Empty>{t('complaints.empty')}</Empty>
      ) : (
        <List>
          {data.map((c) => (
            <ListLink key={c.id} href={`/tenant/complaints/${c.id}`} right={<Badge tone={toneFor(c.status)}>{t(`status.complaint.${c.status}`)}</Badge>}>
              <div className="font-medium">{c.title}</div>
              <div className="text-xs text-muted">{c.code} · {formatDate(c.created_at, locale)}</div>
            </ListLink>
          ))}
        </List>
      )}
    </>
  );
}
