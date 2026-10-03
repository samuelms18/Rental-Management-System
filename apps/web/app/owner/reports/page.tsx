import { getLocale, getTranslations } from 'next-intl/server';
import { formatINR, formatMonth, todayIST } from '@fpm/api';
import { LinkButton } from '@/components/ui/button';
import { Card, Empty, Section, Stat } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { BarList, ColumnChart } from '@/components/charts';
import { requireStaff } from '@/lib/auth';
import { loadReports, readFilters } from '@/lib/reports';

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const f = readFilters(await searchParams, todayIST());
  const [{ data: properties }, { data: houses }, r] = await Promise.all([
    supabase.from('properties').select('id, name').order('name'),
    supabase.from('houses').select('id, unit_number, property_id').order('unit_number'),
    loadReports(supabase, f),
  ]);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as Array<[string, string]>).toString();

  // Rent by month (all houses together)
  const months = [...new Set(r.rent.map((x) => x.month))].sort();
  const byMonth = (field: 'expected_paise' | 'collected_paise') =>
    months.map((m) => r.rent.filter((x) => x.month === m).reduce((n, x) => n + x[field], 0));
  const sum = (rows: Array<Record<string, unknown>>, k: string) => rows.reduce((n, x) => n + Number(x[k] ?? 0), 0);
  const expByCat = Object.entries(
    r.expenses.reduce<Record<string, number>>((acc, x) => ({ ...acc, [x.category]: (acc[x.category] ?? 0) + x.total_paise }), {}),
  ).sort((a, b) => b[1] - a[1]);

  const th = 'py-2 pr-3 text-right font-medium text-muted';
  const td = 'py-2 pr-3 text-right tabular-nums';

  return (
    <>
      <PageHeader title={t('reports.title')} />
      <form className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5 sm:items-end" method="get">
        <label className="text-sm">{t('reports.from')}<input name="from" type="date" defaultValue={f.from} className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-surface px-3" /></label>
        <label className="text-sm">{t('reports.to')}<input name="to" type="date" defaultValue={f.to} className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-surface px-3" /></label>
        <label className="text-sm">{t('expenses.property')}
          <select name="property" defaultValue={f.property ?? ''} className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-surface px-3">
            <option value="">{t('common.all')}</option>
            {(properties ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label className="text-sm">{t('expenses.house')}
          <select name="house" defaultValue={f.house ?? ''} className="mt-1 block min-h-11 w-full rounded-xl border border-border bg-surface px-3">
            <option value="">{t('common.all')}</option>
            {(houses ?? []).map((h) => <option key={h.id} value={h.id}>{h.unit_number}</option>)}
          </select>
        </label>
        <button className="min-h-11 rounded-xl bg-primary px-4 text-primary-fg">{t('reports.show')}</button>
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        {(['rent', 'eb', 'expenses', 'deposits', 'net'] as const).map((k) => (
          <LinkButton key={k} href={`/api/reports/${k}?${qs}`} variant="secondary" size="sm">CSV · {t(`reports.${k}`)}</LinkButton>
        ))}
        <LinkButton href={`/api/reports/pdf?${qs}`} variant="secondary" size="sm" external>PDF</LinkButton>
      </div>

      <div className="space-y-8">
        <Section title={t('reports.rent')}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label={t('dashboard.rentExpected')} value={<Money paise={sum(r.rent, 'expected_paise')} />} />
            <Stat label={t('dashboard.rentCollected')} value={<Money paise={sum(r.rent, 'collected_paise')} />} tone="ok" />
            <Stat label={t('dashboard.rentPending')} value={<Money paise={sum(r.rent, 'pending_paise')} />} />
            <Stat label={t('dashboard.overdue')} value={<Money paise={sum(r.rent, 'overdue_paise')} />} tone={sum(r.rent, 'overdue_paise') ? 'danger' : undefined} />
          </div>
          {months.length ? (
            <Card>
              <ColumnChart
                title={t('reports.rent')}
                labels={months.map((m) => formatMonth(m, locale).replace(/\s\d{4}$/, (y) => ` '${y.trim().slice(2)}`))}
                series={[
                  { name: t('dashboard.rentExpected'), color: 'var(--fpm-series-1)', values: byMonth('expected_paise') },
                  { name: t('dashboard.rentCollected'), color: 'var(--fpm-series-2)', values: byMonth('collected_paise') },
                ]}
                fullFormat={formatINR}
                tableHeader={t('reports.table')}
              />
            </Card>
          ) : <Empty>{t('reports.noData')}</Empty>}
        </Section>

        <Section title={t('reports.net')}>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border"><th className="py-2 pr-3 text-left font-medium text-muted">{t('expenses.house')}</th><th className={th}>{t('dashboard.rentCollected')}</th><th className={th}>{t('expenses.title')}</th><th className={th}>{t('reports.netIncome')}</th></tr></thead>
              <tbody>
                {r.net.map((x) => (
                  <tr key={x.house_id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">{x.unit_number}</td>
                    <td className={td}>{formatINR(x.rent_collected_paise)}</td>
                    <td className={td}>{formatINR(x.expenses_paise)}</td>
                    <td className={`${td} font-semibold ${x.net_paise < 0 ? 'text-danger' : ''}`}>{formatINR(x.net_paise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </Section>

        <Section title={t('reports.eb')}>
          {r.eb.length ? (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border"><th className="py-2 pr-3 text-left font-medium text-muted">{t('expenses.house')}</th><th className={th}>{t('reports.billed')}</th><th className={th}>{t('reports.paidByTenant')}</th><th className={th}>{t('reports.paidByOwner')}</th><th className={th}>{t('reports.reimbursed')}</th><th className={th}>{t('rent.outstanding')}</th></tr></thead>
                <tbody>
                  {r.eb.map((x) => (
                    <tr key={x.house_id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3">{x.unit_number}</td>
                      <td className={td}>{formatINR(x.billed_paise)}</td><td className={td}>{formatINR(x.paid_by_tenant_paise)}</td>
                      <td className={td}>{formatINR(x.paid_by_owner_paise)}</td><td className={td}>{formatINR(x.reimbursed_paise)}</td>
                      <td className={td}>{formatINR(x.outstanding_paise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : <Empty>{t('reports.noData')}</Empty>}
        </Section>

        <Section title={t('reports.expenses')}>
          {expByCat.length ? (
            <Card>
              <BarList items={expByCat.map(([k, v]) => ({ label: t(`labels.expenseCategory.${k}`), value: v }))} format={formatINR} />
            </Card>
          ) : <Empty>{t('reports.noData')}</Empty>}
        </Section>

        <Section title={t('reports.deposits')}>
          {r.deposits.length ? (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border"><th className="py-2 pr-3 text-left font-medium text-muted">{t('tenancy.title')}</th><th className={th}>{t('moveOut.advanceReceived')}</th><th className={th}>{t('reports.deductions')}</th><th className={th}>{t('reports.offsets')}</th><th className={th}>{t('moveOut.refunded')}</th><th className={th}>{t('reports.held')}</th></tr></thead>
                <tbody>
                  {r.deposits.map((x) => (
                    <tr key={x.tenancy_id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-3">{x.unit_number} · {x.tenant_name}</td>
                      <td className={td}>{formatINR(x.received_paise)}</td><td className={td}>{formatINR(x.deductions_paise)}</td>
                      <td className={td}>{formatINR(x.offsets_paise)}</td><td className={td}>{formatINR(x.refunded_paise)}</td>
                      <td className={`${td} font-semibold`}>{formatINR(x.held_paise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : <Empty>{t('reports.noData')}</Empty>}
        </Section>
        <p className="text-xs text-muted">{t('reports.basis')}</p>
      </div>
    </>
  );
}
