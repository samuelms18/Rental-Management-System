import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatMonth, todayIST } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { Card, Empty, List, ListRow, Stat } from '@/components/ui/card';
import { ActionForm, SubmitButton } from '@/components/ui/form';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';
import { runRentGeneration } from '@/lib/actions/finance';
import { reminderLink } from '@/lib/whatsapp';

function shiftMonth(ym: string, by: number) {
  const [y, m] = ym.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

export default async function RentBoard({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { supabase, profile } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const { month: m } = await searchParams;
  const month = /^\d{4}-\d{2}$/.test(m ?? '') ? m! : todayIST().slice(0, 7);
  const start = `${month}-01`;
  const next = `${shiftMonth(month, 1)}-01`;
  const { data: charges } = await supabase
    .from('charges')
    .select('*, payment_allocations(amount_paise, payments(status)), tenancies(id, code, tenants(full_name, phone, user_id), houses(unit_number, property_id))')
    .eq('type', 'rent')
    .gte('period_start', start)
    .lt('period_start', next)
    .neq('status', 'cancelled')
    .order('due_date');
  const { data: payees } = await supabase.from('payee_settings').select('property_id, payee_name');
  const userIds = (charges ?? []).map((c) => c.tenancies?.tenants?.user_id).filter((x): x is string => !!x);
  const { data: langs } = userIds.length ? await supabase.from('profiles').select('id, preferred_language').in('id', userIds) : { data: [] };
  const today = todayIST();

  const rows = await Promise.all(
    (charges ?? []).map(async (c) => {
      const paid = c.payment_allocations.filter((a) => a.payments?.status === 'approved').reduce((n, a) => n + a.amount_paise, 0);
      const outstanding = c.amount_paise - paid;
      const ty = c.tenancies!;
      const wa =
        outstanding > 0 && ty.tenants?.phone
          ? await reminderLink({
              type: 'rent',
              stage: today < c.due_date ? 'upcoming' : today === c.due_date ? 'due' : 'overdue',
              tenantName: ty.tenants.full_name,
              tenantPhone: ty.tenants.phone,
              language: langs?.find((l) => l.id === ty.tenants?.user_id)?.preferred_language ?? 'en',
              amountPaise: outstanding,
              dueDate: c.due_date,
              house: ty.houses?.unit_number ?? '',
              ownerName: payees?.find((p) => p.property_id === ty.houses?.property_id)?.payee_name ?? profile.full_name,
            })
          : null;
      return { c, paid, outstanding, ty, wa };
    }),
  );
  const expected = rows.reduce((n, r) => n + r.c.amount_paise, 0);
  const collected = rows.reduce((n, r) => n + r.paid, 0);

  return (
    <>
      <PageHeader title={t('rent.board')} />
      <div className="mb-4 flex items-center justify-between">
        <Link href={`?month=${shiftMonth(month, -1)}`} className="flex size-11 items-center justify-center rounded-full hover:bg-surface-2" aria-label={t('common.previous')}><ChevronLeft /></Link>
        <div className="font-semibold">{formatMonth(start, locale)}</div>
        <Link href={`?month=${shiftMonth(month, 1)}`} className="flex size-11 items-center justify-center rounded-full hover:bg-surface-2" aria-label={t('common.next')}><ChevronRight /></Link>
      </div>
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label={t('dashboard.rentExpected')} value={<Money paise={expected} />} />
        <Stat label={t('dashboard.rentCollected')} value={<Money paise={collected} />} tone="ok" />
        <Stat label={t('dashboard.rentPending')} value={<Money paise={expected - collected} />} tone={expected - collected ? 'danger' : undefined} />
      </div>
      {rows.length === 0 ? (
        <Empty>{t('rent.noCharges')}</Empty>
      ) : (
        <List>
          {rows.map(({ c, paid, outstanding, ty, wa }) => (
            <ListRow
              key={c.id}
              right={
                <div className="space-y-1">
                  <Money paise={c.amount_paise} className="font-semibold" />
                  <div><Badge tone={toneFor(c.status)}>{t(`status.charge.${c.status}`)}</Badge></div>
                </div>
              }
            >
              <Link href={`/owner/tenancies/${ty.id}`} className="font-medium">{ty.houses?.unit_number} · {ty.tenants?.full_name}</Link>
              <div className="text-xs text-muted">
                {t('rent.due', { date: c.due_date.slice(8, 10) + '/' + c.due_date.slice(5, 7) })}
                {paid > 0 && outstanding > 0 && <> · {t('rent.outstanding')} <Money paise={outstanding} /></>}
              </div>
              {wa && <LinkButton href={wa} external variant="whatsapp" size="sm" className="mt-2">{t('rent.remind')}</LinkButton>}
            </ListRow>
          ))}
        </List>
      )}
      <Card className="mt-6">
        <ActionForm action={runRentGeneration}>
          <SubmitButton variant="secondary">{t('rent.generateNow')}</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
