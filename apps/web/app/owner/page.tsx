import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { addDays, formatDate, formatINR, todayIST } from '@fpm/api';
import { CheckCircle2, Home, LayoutList, MessageCircle, Plus, Zap } from 'lucide-react';
import { Badge, toneFor } from '@/components/ui/badge';
import { Empty, Hero, List, ListLink, Section } from '@/components/ui/card';
import { cn } from '@/components/ui/cn';
import { Money } from '@/components/ui/money';
import { requireStaff } from '@/lib/auth';

type Dashboard = {
  pending_payments: Array<{ id: string; amount_paise: number; paid_on: string; method: string; utr_reference: string | null; tenancy_code: string; unit_number: string; tenant_name: string }>;
  overdue: Array<{ id: string; type: string; outstanding_paise: number; due_date: string; days_overdue: number; unit_number: string; tenant_name: string; tenancy_code: string }>;
  complaints: Array<{ id: string; code: string; title: string; priority: string; status: string; unit_number: string }>;
  due_soon: Array<{ id: string; type: string; outstanding_paise: number; due_date: string; unit_number: string; tenant_name: string }>;
  ending: Array<{ id: string; code: string; unit_number: string; tenant_name: string; status: string; end_date: string | null }>;
  houses: Array<{ id: string; unit_number: string; house_status: string; tenancy_id: string | null; tenancy_status: string | null; tenant_name: string | null; outstanding_paise: number; has_overdue: boolean }>;
  summary: {
    houses_total: number; houses_occupied: number; houses_vacant: number;
    rent_expected_paise: number; rent_collected_paise: number; rent_pending_paise: number; older_unpaid_paise: number;
  };
};

export default async function OwnerDashboard() {
  const { supabase, profile } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const [{ data }, { data: usage }, { data: failedJobs }] = await Promise.all([
    supabase.rpc('staff_dashboard'),
    supabase.rpc('usage_summary'),
    supabase.from('scheduled_job_runs').select('job, started_at').eq('ok', false).gte('started_at', addDays(todayIST(), -2)),
  ]);
  // Supabase free tier: 500 MB database, 1 GB file storage.
  const u = usage as { db_bytes: number; storage_bytes: number } | null;
  const dbPct = u ? Math.round((u.db_bytes / 500e6) * 100) : 0;
  const storagePct = u ? Math.round((u.storage_bytes / 1e9) * 100) : 0;
  const d = data as unknown as Dashboard;
  const s = d.summary;
  const pct = s.rent_expected_paise ? Math.min(100, Math.round((s.rent_collected_paise / s.rent_expected_paise) * 100)) : 0;
  const nothing =
    !d.pending_payments.length && !d.overdue.length && !d.complaints.length && !d.due_soon.length && !d.ending.length;
  const firstName = (profile.full_name || '').split(' ')[0] ?? '';

  const chips = [
    { href: '/owner/payments', icon: CheckCircle2, label: t('dashboard.chipApprove'), count: d.pending_payments.length },
    { href: '/owner/rent', icon: LayoutList, label: t('dashboard.chipRentBoard') },
    { href: '/owner/reminders', icon: MessageCircle, label: t('dashboard.chipRemind'), count: d.overdue.length },
    { href: '/owner/eb', icon: Zap, label: t('dashboard.chipEb') },
    { href: '/owner/properties', icon: Plus, label: t('dashboard.chipNewTenancy') },
  ];

  return (
    <>
      <header className="mb-6">
        <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] sm:text-[30px]">{t('dashboard.greeting', { name: firstName })}</h1>
        <p className="mt-1 text-[15px] text-muted">{t('dashboard.title')}</p>
      </header>

      <div className="space-y-8">
        {(dbPct >= 80 || storagePct >= 80) && (
          <p role="alert" className="rounded-xl bg-warn-soft p-4 text-sm font-medium text-warn">{t('dashboard.usageWarning', { db: dbPct, storage: storagePct })}</p>
        )}
        {!!failedJobs?.length && (
          <p role="alert" className="rounded-xl bg-danger-soft p-4 text-sm font-medium text-danger">{t('dashboard.jobFailed', { jobs: [...new Set(failedJobs.map((j) => j.job))].join(', ') })}</p>
        )}

        {/* Collection card + counts: stacked on phones, side by side on laptops. */}
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Hero>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold opacity-90">{t('dashboard.summary')} · {t('dashboard.rentCollected')}</div>
                <div className="tabular mt-2 text-[44px] font-extrabold leading-none tracking-[-0.02em]"><Money paise={s.rent_collected_paise} /></div>
                <div className="mt-2 text-sm opacity-90">
                  {t('dashboard.rentExpected')}: <Money paise={s.rent_expected_paise} className="font-bold" />
                </div>
              </div>
              <div className="flex size-20 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#fff ${pct * 3.6}deg, rgb(255 255 255 / 0.25) 0)` }}>
                <div className="tabular flex size-16 items-center justify-center rounded-full bg-[var(--fpm-hero-from)] text-lg font-extrabold">{pct}%</div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <div className="glass px-4 py-3">
                <div className="text-xs font-semibold opacity-90">{t('dashboard.rentPending')}</div>
                <div className="tabular text-lg font-extrabold"><Money paise={s.rent_pending_paise} /></div>
              </div>
              <div className="glass px-4 py-3">
                <div className="text-xs font-semibold opacity-90">{t('dashboard.olderUnpaid')}</div>
                <div className="tabular text-lg font-extrabold"><Money paise={s.older_unpaid_paise} /></div>
              </div>
            </div>
          </Hero>
          <div className="grid grid-cols-3 content-start gap-2.5 lg:grid-cols-1">
            {[
              [t('dashboard.housesTotal'), s.houses_total, ''],
              [t('dashboard.occupied'), s.houses_occupied, 'text-ok'],
              [t('dashboard.vacant'), s.houses_vacant, s.houses_vacant ? 'text-warn' : ''],
            ].map(([label, value, tone]) => (
              <div key={String(label)} className="rounded-card border border-border px-3.5 py-3">
                <div className="text-xs font-semibold text-muted">{label}</div>
                <div className={cn('tabular text-2xl font-extrabold', String(tone))}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1.5 md:mx-0 md:flex-wrap md:px-0">
          {chips.map(({ href, icon: Icon, label, count }) => (
            <Link key={href} href={href} className="flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface px-4 text-sm font-semibold shadow-card transition hover:shadow-lift">
              <Icon className="size-4 text-primary" />
              {label}
              {!!count && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">{count}</span>}
            </Link>
          ))}
        </div>

        {/* One card per house */}
        {d.houses.length > 0 && (
          <Section title={t('dashboard.yourHouses')}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {d.houses.map((h) => {
                const status = h.tenancy_status ?? h.house_status;
                const label = h.tenancy_status ? t(`status.tenancy.${h.tenancy_status}`) : t(`status.house.${h.house_status}`);
                return (
                  <Link
                    key={h.id}
                    href={h.tenancy_id ? `/owner/tenancies/${h.tenancy_id}` : `/owner/houses/${h.id}`}
                    className="overflow-hidden rounded-card border border-border bg-surface transition hover:shadow-lift"
                  >
                    <div className={cn('relative flex aspect-[4/3] items-center justify-center', h.tenancy_id ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-muted')}>
                      <Home className="size-8" strokeWidth={1.6} />
                      <span className="absolute left-2.5 top-2.5"><Badge tone={toneFor(status)}>{label}</Badge></span>
                    </div>
                    <div className="p-3">
                      <div className="font-bold">{h.unit_number}</div>
                      <div className="truncate text-sm text-muted">{h.tenant_name ?? t('dashboard.noTenant')}</div>
                      {h.tenancy_id && (
                        <div className={cn('tabular mt-0.5 text-sm font-semibold', h.outstanding_paise > 0 ? (h.has_overdue ? 'text-danger' : 'text-fg') : 'text-ok')}>
                          {h.outstanding_paise > 0 ? t('dashboard.amountDue', { amount: formatINR(h.outstanding_paise) }) : t('dashboard.allPaidShort')}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </Section>
        )}

        {nothing && <Empty>{t('dashboard.allClear')}</Empty>}

        <div className="grid gap-8 lg:grid-cols-2">
          {d.pending_payments.length > 0 && (
            <Section title={`${t('dashboard.pendingPayments')} (${d.pending_payments.length})`} action={<Link href="/owner/payments">{t('dashboard.review')}</Link>}>
              <List>
                {d.pending_payments.map((p) => (
                  <ListLink key={p.id} href="/owner/payments" right={<Money paise={p.amount_paise} className="font-bold" />}>
                    <div className="font-semibold">{p.unit_number} · {p.tenant_name}</div>
                    <div className="text-xs text-muted">{t(`labels.method.${p.method}`)} · {p.utr_reference ?? '—'} · {formatDate(p.paid_on, locale)}</div>
                  </ListLink>
                ))}
              </List>
            </Section>
          )}

          {d.overdue.length > 0 && (
            <Section title={`${t('dashboard.overdue')} (${d.overdue.length})`} action={<Link href="/owner/reminders">{t('dashboard.remind')}</Link>}>
              <List>
                {d.overdue.map((c) => (
                  <ListLink key={c.id} href="/owner/reminders" right={<><Money paise={c.outstanding_paise} className="font-bold text-danger" /><div className="text-xs text-danger">{t('common.daysOverdue', { count: c.days_overdue })}</div></>}>
                    <div className="font-semibold">{c.unit_number} · {c.tenant_name}</div>
                    <div className="text-xs text-muted">{t(`labels.chargeType.${c.type}`)} · {formatDate(c.due_date, locale)}</div>
                  </ListLink>
                ))}
              </List>
            </Section>
          )}

          {d.complaints.length > 0 && (
            <Section title={t('dashboard.complaints')}>
              <List>
                {d.complaints.map((c) => (
                  <ListLink key={c.id} href={`/owner/complaints/${c.id}`} right={<Badge tone={toneFor(c.priority)}>{t(`labels.priority.${c.priority}`)}</Badge>}>
                    <div className="font-semibold">{c.unit_number} · {c.title}</div>
                    <div className="text-xs text-muted">{c.code} · {t(`status.complaint.${c.status}`)}</div>
                  </ListLink>
                ))}
              </List>
            </Section>
          )}

          {d.due_soon.length > 0 && (
            <Section title={t('dashboard.dueSoon')}>
              <List>
                {d.due_soon.map((c) => (
                  <ListLink key={c.id} href="/owner/rent" right={<Money paise={c.outstanding_paise} />}>
                    <div className="font-semibold">{c.unit_number} · {c.tenant_name}</div>
                    <div className="text-xs text-muted">{t(`labels.chargeType.${c.type}`)} · {formatDate(c.due_date, locale)}</div>
                  </ListLink>
                ))}
              </List>
            </Section>
          )}

          {d.ending.length > 0 && (
            <Section title={t('dashboard.ending')}>
              <List>
                {d.ending.map((e) => (
                  <ListLink key={e.id} href={`/owner/tenancies/${e.id}`} right={<Badge tone={toneFor(e.status)}>{t(`status.tenancy.${e.status}`)}</Badge>}>
                    <div className="font-semibold">{e.unit_number} · {e.tenant_name}</div>
                    <div className="text-xs text-muted">{e.end_date ? t('dashboard.endsOn', { date: formatDate(e.end_date, locale) }) : e.code}</div>
                  </ListLink>
                ))}
              </List>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
