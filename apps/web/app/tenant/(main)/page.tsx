import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';
import { LinkButton } from '@/components/ui/button';
import { Card, Empty, Hero, List, ListLink, Section } from '@/components/ui/card';
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
        <Link href="/tenant/settlement" className="mt-4 block text-center text-sm text-primary">{t('moveOut.statement')}</Link>
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
          <Link href="/tenant/settlement" className="block rounded-2xl border border-warn/25 bg-warn-soft p-4 text-sm font-medium text-warn">{t('tenantHome.notice', { date: formatDate(tenancy.actual_end_date, locale) })}</Link>
        )}
        <Hero className="space-y-4">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-hero-text/70">{t('tenantHome.rentDue')}</div>
          {totalRent > 0 ? (
            <>
              <div className="font-display tabular text-5xl font-semibold leading-none"><Money paise={totalRent} /></div>
              {nextDue && <div className="text-sm text-hero-text/80">{t('pay.dueOn', { date: formatDate(nextDue, locale) })}</div>}
              <Link
                href="/tenant/rent"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-hero-text text-[15px] font-semibold text-[var(--fpm-hero-from)] shadow-card transition hover:brightness-105 active:scale-[0.98]"
              >
                {t('tenantHome.payNow')}
              </Link>
            </>
          ) : (
            <div className="font-display flex items-center gap-2 text-2xl font-semibold">
              <CheckCircle2 className="size-7" /> {t('tenantHome.allPaid')}
            </div>
          )}
        </Hero>
        {ebDue.length > 0 && (
          <Card className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted">{t('tenantHome.ebDue')}</div>
              <div className="font-display tabular text-2xl font-semibold"><Money paise={ebDue.reduce((n, c) => n + c.outstanding_paise, 0)} /></div>
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
          <Link href="/tenant/notifications" className="block rounded-card border border-border bg-surface p-4 text-sm shadow-card transition hover:border-primary/40">
            {t('tenantHome.unread')}: <span className="font-semibold">{unread}</span>
          </Link>
        )}
      </div>
    </>
  );
}
