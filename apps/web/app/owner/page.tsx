import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { addDays, formatDate, todayIST } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { Empty, List, ListLink, Section, Stat } from '@/components/ui/card';
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
  const nothing =
    !d.pending_payments.length && !d.overdue.length && !d.complaints.length && !d.due_soon.length && !d.ending.length;

  return (
    <>
      <PageHeader title={t('dashboard.title')} subtitle={profile.full_name} />
      <div className="space-y-7">
        {(dbPct >= 80 || storagePct >= 80) && (
          <p role="alert" className="rounded-xl bg-warn-soft p-3 text-sm text-warn">{t('dashboard.usageWarning', { db: dbPct, storage: storagePct })}</p>
        )}
        {!!failedJobs?.length && (
          <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{t('dashboard.jobFailed', { jobs: [...new Set(failedJobs.map((j) => j.job))].join(', ') })}</p>
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

        <Section title={t('dashboard.summary')}>
          <div className="grid grid-cols-3 gap-3">
            <Stat label={t('dashboard.housesTotal')} value={d.summary.houses_total} />
            <Stat label={t('dashboard.occupied')} value={d.summary.houses_occupied} tone="ok" />
            <Stat label={t('dashboard.vacant')} value={d.summary.houses_vacant} tone={d.summary.houses_vacant ? 'warn' : undefined} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label={t('dashboard.rentExpected')} value={<Money paise={d.summary.rent_expected_paise} />} />
            <Stat label={t('dashboard.rentCollected')} value={<Money paise={d.summary.rent_collected_paise} />} tone="ok" />
            <Stat label={t('dashboard.rentPending')} value={<Money paise={d.summary.rent_pending_paise} />} tone={d.summary.rent_pending_paise ? 'danger' : undefined} />
          </div>
        </Section>
      </div>
    </>
  );
}
