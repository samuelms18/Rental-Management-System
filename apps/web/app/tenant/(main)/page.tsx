import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate, formatINR, todayIST } from '@fpm/api';
import { CheckCircle2, FileText, IndianRupee, Wrench, Zap } from 'lucide-react';
import { Badge, toneFor } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { Card, DefList, Empty, Hero, List, ListLink, ListRow, Section } from '@/components/ui/card';
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
        <Link href="/tenant/settlement" className="mt-4 block text-center text-sm font-semibold underline underline-offset-4">{t('moveOut.statement')}</Link>
      </>
    );
  }
  const today = todayIST();
  const [dues, { data: complaints }, { count: unread }, { data: payments }, { data: revisions }] = await Promise.all([
    openCharges(supabase, tenancy.id),
    supabase.from('complaints').select('id, code, title, status').eq('tenancy_id', tenancy.id).not('status', 'in', '(tenant_confirmed,closed)').order('created_at', { ascending: false }),
    supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('read_at', null),
    supabase.from('payments').select('id, amount_paise, paid_on, method, status, paid_to').eq('tenancy_id', tenancy.id).neq('method', 'deposit').order('created_at', { ascending: false }).limit(5),
    supabase.from('rent_revisions').select('amount_paise, effective_from').eq('tenancy_id', tenancy.id).order('effective_from', { ascending: false }),
  ]);
  // Everything paid to the owner (rent, EB reimbursement, water…); TNEB bills are paid to TNEB directly.
  const ownerDue = dues.filter((c) => c.type !== 'eb');
  const ebDue = dues.filter((c) => c.type === 'eb');
  const total = ownerDue.reduce((n, c) => n + c.outstanding_paise, 0);
  const waiting = (payments ?? []).filter((p) => p.status === 'submitted' && p.paid_to !== 'tneb').reduce((n, p) => n + p.amount_paise, 0);
  const balance = Math.max(total - waiting, 0);
  const nextDue = ownerDue[0]?.due_date;
  const rent = revisions?.find((r) => r.effective_from <= today)?.amount_paise ?? revisions?.at(-1)?.amount_paise;

  const tiles = [
    { href: '/tenant/rent', icon: IndianRupee, label: t('tenantHome.tilePay') },
    { href: '/tenant/complaints/new', icon: Wrench, label: t('tenantHome.tileProblem') },
    { href: '/tenant/eb', icon: Zap, label: t('tenantHome.tileEb') },
    { href: '/tenant/agreement', icon: FileText, label: t('tenantHome.tileAgreement') },
  ];

  return (
    <>
      <PageHeader
        title={t('tenantHome.greeting', { name })}
        subtitle={`${tenancy.houses?.unit_number} · ${tenancy.houses?.properties?.name}`}
      />
      <div className="space-y-8">
        {tenancy.status === 'notice_period' && tenancy.actual_end_date && (
          <Link href="/tenant/settlement" className="block rounded-xl border border-warn/30 bg-warn-soft p-4 text-sm font-medium text-warn">
            {t('tenantHome.notice', { date: formatDate(tenancy.actual_end_date, locale) })}
          </Link>
        )}

        <Hero className="space-y-4">
          {total > 0 ? (
            <>
              <div>
                <div className="text-sm font-semibold opacity-90">{t('pay.amountDue')}</div>
                <div className="tabular mt-2 text-[44px] font-extrabold leading-none tracking-[-0.02em]"><Money paise={total} /></div>
                {nextDue && <div className="mt-2 text-sm opacity-90">{t('pay.dueOn', { date: formatDate(nextDue, locale) })}</div>}
              </div>
              {ownerDue.length > 1 && (
                <div className="glass space-y-1.5 px-4 py-3 text-sm">
                  {ownerDue.map((c) => (
                    <div key={c.id} className="flex justify-between gap-3">
                      <span className="opacity-90">{t(`labels.chargeType.${c.type}`)} · {formatDate(c.due_date, locale)}</span>
                      <Money paise={c.outstanding_paise} className="font-bold" />
                    </div>
                  ))}
                </div>
              )}
              {waiting > 0 && (
                <div className="rounded-xl bg-white/95 px-4 py-3 text-sm font-medium text-[#222]">
                  {balance > 0 ? t('tenantHome.waitingPartial', { amount: formatINR(waiting) }) : t('tenantHome.waiting', { amount: formatINR(waiting) })}
                </div>
              )}
              {balance > 0 && (
                <Link
                  href="/tenant/rent"
                  className="flex min-h-12 w-full items-center justify-center rounded-xl bg-white text-[15px] font-bold text-[var(--fpm-hero-from)] transition hover:brightness-95 active:scale-[0.98]"
                >
                  {waiting > 0 ? t('tenantHome.payBalance') : t('tenantHome.payNow')}
                </Link>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-2xl font-extrabold">
              <CheckCircle2 className="size-7" /> {t('tenantHome.allPaid')}
            </div>
          )}
        </Hero>

        {ebDue.length > 0 && (
          <Card className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted">{t('tenantHome.ebDue')}</div>
              <div className="tabular text-2xl font-extrabold"><Money paise={ebDue.reduce((n, c) => n + c.outstanding_paise, 0)} /></div>
            </div>
            <LinkButton href="/tenant/eb" variant="secondary" size="sm">{t('common.view')}</LinkButton>
          </Card>
        )}

        <Section title={t('tenantHome.house')}>
          <Card>
            <DefList
              items={[
                [t('tenancy.rent'), rent != null ? <Money key="r" paise={rent} /> : '—'],
                [t('tenancy.dueDay'), t('tenantHome.dueEvery', { day: tenancy.rent_due_day })],
                [t('tenantHome.advancePaid'), <Money key="a" paise={tenancy.advance_paise} />],
                [t('tenantHome.livingSince'), formatDate(tenancy.start_date, locale)],
              ]}
            />
          </Card>
        </Section>

        <div className="grid grid-cols-4 gap-2">
          {tiles.map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-card border border-border p-2 text-center text-xs font-semibold transition hover:shadow-lift">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Icon className="size-5" />
              </span>
              {label}
            </Link>
          ))}
        </div>

        {!!payments?.length && (
          <Section title={t('tenantHome.recentPayments')} action={<Link href="/tenant/payments">{t('tenantHome.seeAll')}</Link>}>
            <List>
              {payments.slice(0, 3).map((p) => (
                <ListRow
                  key={p.id}
                  right={<><Money paise={p.amount_paise} className="font-bold" /><div className="mt-1"><Badge tone={toneFor(p.status)}>{t(`status.payment.${p.status}`)}</Badge></div></>}
                >
                  <div className="font-semibold">{formatDate(p.paid_on, locale)}</div>
                  <div className="text-xs text-muted">{t(`labels.method.${p.method}`)}</div>
                </ListRow>
              ))}
            </List>
          </Section>
        )}

        {!!complaints?.length && (
          <Section title={t('tenantHome.openComplaints')}>
            <List>
              {complaints.map((c) => (
                <ListLink key={c.id} href={`/tenant/complaints/${c.id}`} right={<Badge tone={toneFor(c.status)}>{t(`status.complaint.${c.status}`)}</Badge>}>
                  <div className="font-semibold">{c.title}</div>
                  <div className="text-xs text-muted">{c.code}</div>
                </ListLink>
              ))}
            </List>
          </Section>
        )}
        {!!unread && (
          <Link href="/tenant/notifications" className="block rounded-card border border-border p-4 text-sm transition hover:shadow-lift">
            {t('tenantHome.unread')}: <span className="font-bold">{unread}</span>
          </Link>
        )}
      </div>
    </>
  );
}
