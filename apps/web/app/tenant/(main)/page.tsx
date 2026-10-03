import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { Card, Empty, List, ListLink, Section } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { requireTenant } from '@/lib/auth';
import { openCharges } from '@/lib/tenant-dues';

export default async function TenantHome() {
  const { supabase, tenancy, tenant, profile, user } = await requireTenant();
  const t = await getTranslations();
  const locale = await getLocale();
  const name = tenant?.full_name ?? profile.full_name;
  if (!tenancy) {
    return (
      <>
        <PageHeader title={t('tenantHome.greeting', { name })} />
        <Empty>{t('tenantHome.noTenancy')}</Empty>
      </>
    );
  }
  const [dues, { data: complaints }, { count: unread }] = await Promise.all([
    openCharges(supabase, tenancy.id),
    supabase.from('complaints').select('id, code, title, status').eq('tenancy_id', tenancy.id).not('status', 'in', '(tenant_confirmed,closed)').order('created_at', { ascending: false }),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null),
  ]);
  const rentDue = dues.filter((c) => c.type !== 'eb');
  const ebDue = dues.filter((c) => c.type === 'eb');
  const totalRent = rentDue.reduce((n, c) => n + c.outstanding_paise, 0);
  const nextDue = rentDue[0]?.due_date;

  return (
    <>
      <PageHeader
        title={t('tenantHome.greeting', { name })}
        subtitle={`${tenancy.houses?.unit_number} · ${tenancy.houses?.properties?.name}`}
      />
      <div className="space-y-6">
        {tenancy.status === 'notice_period' && tenancy.actual_end_date && (
          <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">{t('tenantHome.notice', { date: formatDate(tenancy.actual_end_date, locale) })}</p>
        )}
        <Card className="space-y-3">
          <div className="text-sm text-muted">{t('tenantHome.rentDue')}</div>
          {totalRent > 0 ? (
            <>
              <div className="text-3xl font-semibold"><Money paise={totalRent} /></div>
              {nextDue && <div className="text-sm text-muted">{t('pay.dueOn', { date: formatDate(nextDue, locale) })}</div>}
              <LinkButton href="/tenant/rent" className="w-full">{t('tenantHome.payNow')}</LinkButton>
            </>
          ) : (
            <div className="text-lg font-medium text-ok">{t('tenantHome.allPaid')}</div>
          )}
        </Card>
        {ebDue.length > 0 && (
          <Card className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted">{t('tenantHome.ebDue')}</div>
              <div className="text-xl font-semibold"><Money paise={ebDue.reduce((n, c) => n + c.outstanding_paise, 0)} /></div>
            </div>
            <LinkButton href="/tenant/eb" variant="secondary" size="sm">{t('common.view')}</LinkButton>
          </Card>
        )}
        {!!complaints?.length && (
          <Section title={t('tenantHome.openComplaints')}>
            <List>
              {complaints.map((c) => (
                <ListLink key={c.id} href={`/tenant/complaints/${c.id}`} right={<Badge tone={toneFor(c.status)}>{t(`status.complaint.${c.status}`)}</Badge>}>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-muted">{c.code}</div>
                </ListLink>
              ))}
            </List>
          </Section>
        )}
        {!!unread && (
          <Link href="/tenant/notifications" className="block rounded-card border border-border bg-surface p-4 text-sm">
            {t('tenantHome.unread')}: <span className="font-semibold">{unread}</span>
          </Link>
        )}
      </div>
    </>
  );
}
