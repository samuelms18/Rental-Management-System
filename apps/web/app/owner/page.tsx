import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { addDays, formatDate, todayIST } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { Empty, Hero, List, ListLink, Section } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';

type Dashboard = {
  pending_payments: Array<{ id: string; amount_paise: number; paid_on: string; method: string; utr_reference: string | null; tenancy_code: string; unit_number: string; tenant_name: string }>;
  overdue: Array<{ id: string; type: string; outstanding_paise: number; due_date: string; days_overdue: number; unit_number: string; tenant_name: string; tenancy_code: string }>;
  complaints: Array<{ id: string; code: string; title: string; priority: string; status: string; unit_number: string }>;
  due_soon: Array<{ id: string; type: string; outstanding_paise: number; due_date: string; unit_number: string; tenant_name: string }>;
  ending: Array<{ id: string; code: string; unit_number: string; tenant_name: string; status: string; end_date: string | null }>;
  summary: { houses_total: number; houses_occupied: number; houses_vacant: number; rent_expected_paise: number; rent_collected_paise: number; rent_pending_paise: number };
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
  const pct = d.summary.rent_expected_paise ? Math.min(100, Math.round((d.summary.rent_collected_paise / d.summary.rent_expected_paise) * 100)) : 0;
  const nothing =
    !d.pending_payments.length && !d.overdue.length && !d.complaints.length && !d.due_soon.length && !d.ending.length;

  return (
    <>
      <PageHeader title={t('dashboard.title')} subtitle={profile.full_name} />
      <Hero className="mb-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-hero-text/70">{t('dashboard.summary')} · {t('dashboard.rentCollected')}</div>
            <div className="font-display tabular mt-2 text-[2.4rem] font-semibold leading-none sm:text-5xl">
              <Money paise={d.summary.rent_collected_paise} />
            </div>
            <div className="mt-2 text-sm text-hero-text/80">
              {t('dashboard.rentExpected')}: <Money paise={d.summary.rent_expected_paise} className="font-semibold text-hero-text" />
            </div>
          </div>
          <div className="relative flex size-20 shrink-0 items-center justify-center rounded-full sm:size-24" style={{ background: `conic-gradient(var(--fpm-hero-text) ${pct * 3.6}deg, rgb(255 255 255 / 0.16) 0)` }}>
            <div className="font-display tabular flex size-[66px] items-center justify-center rounded-full bg-[var(--fpm-hero-from)] text-lg font-semibold sm:size-20 sm:text-xl">{pct}%</div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            [t('dashboard.rentPending'), <Money key="p" paise={d.summary.rent_pending_paise} />],
            [t('dashboard.housesTotal'), d.summary.houses_total],
            [t('dashboard.occupied'), d.summary.houses_occupied],
            [t('dashboard.vacant'), d.summary.houses_vacant],
          ].map(([label, value], i) => (
            <div key={i} className="rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-white/15 backdrop-blur-sm">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-hero-text/70">{label}</div>
              <div className="font-display tabular mt-0.5 text-lg font-semibold">{value}</div>
            </div>
          ))}
        </div>
      </Hero>
      <div className="space-y-7">
        {(dbPct >= 80 || storagePct >= 80) && (
          <p role="alert" className="rounded-2xl border border-warn/25 bg-warn-soft p-4 text-sm font-medium text-warn">{t('dashboard.usageWarning', { db: dbPct, storage: storagePct })}</p>
        )}
        {!!failedJobs?.length && (
          <p role="alert" className="rounded-2xl border border-danger/25 bg-danger-soft p-4 text-sm font-medium text-danger">{t('dashboard.jobFailed', { jobs: [...new Set(failedJobs.map((j) => j.job))].join(', ') })}</p>
        )}
        {nothing && <Empty>{t('dashboard.allClear')}</Empty>}

        {d.pending_payments.length > 0 && (
          <Section title={`${t('dashboard.pendingPayments')} (${d.pending_payments.length})`} action={<Link className="text-sm text-primary" href="/owner/payments">{t('dashboard.review')}</Link>}>
            <List>
              {d.pending_payments.map((p) => (
                <ListLink key={p.id} href="/owner/payments" right={<Money paise={p.amount_paise} className="font-semibold" />}>
                  <div className="font-medium">{p.unit_number} · {p.tenant_name}</div>
                  <div className="text-xs text-muted">{t(`labels.method.${p.method}`)} · {p.utr_reference ?? '—'} · {formatDate(p.paid_on, locale)}</div>
                </ListLink>
              ))}
            </List>
          </Section>
        )}

        {d.overdue.length > 0 && (
          <Section title={`${t('dashboard.overdue')} (${d.overdue.length})`} action={<Link className="text-sm text-primary" href="/owner/reminders">{t('dashboard.remind')}</Link>}>
            <List>
              {d.overdue.map((c) => (
                <ListLink key={c.id} href="/owner/reminders" right={<><Money paise={c.outstanding_paise} className="font-semibold text-danger" /><div className="text-xs text-danger">{t('common.daysOverdue', { count: c.days_overdue })}</div></>}>
                  <div className="font-medium">{c.unit_number} · {c.tenant_name}</div>
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
                  <div className="font-medium">{c.unit_number} · {c.title}</div>
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
                  <div className="font-medium">{c.unit_number} · {c.tenant_name}</div>
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
                  <div className="font-medium">{e.unit_number} · {e.tenant_name}</div>
                  <div className="text-xs text-muted">{e.end_date ? t('dashboard.endsOn', { date: formatDate(e.end_date, locale) }) : e.code}</div>
                </ListLink>
              ))}
            </List>
          </Section>
        )}

      </div>
    </>
  );
}
