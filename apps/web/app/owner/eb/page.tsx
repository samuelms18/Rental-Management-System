import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate, todayIST } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { Card, Empty, List, ListRow, Section } from '@/components/ui/card';
import { ActionForm, Field, Input, MoneyInput, Select, SubmitButton } from '@/components/ui/form';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';
import { addEbBill, recordOwnerEbPayment } from '@/lib/actions/eb';
import { fileUrl } from '@/lib/file-url';

export default async function EbPage() {
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const [{ data: houses }, { data: bills }] = await Promise.all([
    supabase.from('houses').select('id, unit_number, properties(name), eb_accounts(*)').order('unit_number'),
    supabase
      .from('eb_bills')
      .select('*, houses(unit_number), tenancies(tenants(full_name))')
      .order('period_start', { ascending: false })
      .limit(60),
  ]);
  const withAccount = (houses ?? []).filter((h) => h.eb_accounts);
  const missing = (houses ?? []).filter((h) => !h.eb_accounts);

  return (
    <>
      <PageHeader title={t('eb.title')} subtitle={t('eb.tnebHint')} />
      <div className="space-y-8">
        {withAccount.length > 0 && (
          <Card>
            <ActionForm action={addEbBill} resetOnSuccess>
              <h2 className="font-semibold">{t('eb.addBill')}</h2>
              <Field name="eb_account_id" label={t('tenancy.house')}>
                <Select name="eb_account_id" options={withAccount.map((h) => ({ value: h.eb_accounts!.id, label: `${h.unit_number} · ${h.properties?.name} · ${h.eb_accounts!.service_number}` }))} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field name="period_start" label={t('eb.periodStart')}><Input name="period_start" type="date" /></Field>
                <Field name="period_end" label={t('eb.periodEnd')}><Input name="period_end" type="date" /></Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field name="units" label={t('eb.units')} optional><Input name="units" type="number" min={0} inputMode="numeric" /></Field>
                <Field name="amount_paise" label={t('eb.billAmount')}><MoneyInput name="amount_paise" /></Field>
                <Field name="late_fee_paise" label={t('eb.lateFee')} optional><MoneyInput name="late_fee_paise" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field name="bill_date" label={t('eb.billDate')} optional><Input name="bill_date" type="date" /></Field>
                <Field name="due_date" label={t('eb.dueDate')}><Input name="due_date" type="date" /></Field>
              </div>
              <Field name="paid_by" label={t('eb.paidBy')}>
                <Select name="paid_by" options={['owner_reimbursed', 'tenant_direct'].map((v) => ({ value: v, label: t(`labels.ebPaidBy.${v}`) }))} />
              </Field>
              <SubmitButton>{t('common.save')}</SubmitButton>
            </ActionForm>
          </Card>
        )}

        {missing.length > 0 && (
          <Section title={t('eb.noAccount')}>
            <List>
              {missing.map((h) => (
                <ListRow key={h.id} right={<Link href={`/owner/houses/${h.id}`} className="text-sm text-primary">{t('eb.addAccount')}</Link>}>
                  {h.unit_number} · {h.properties?.name}
                </ListRow>
              ))}
            </List>
          </Section>
        )}

        <Section title={t('eb.title')}>
          {!bills?.length ? (
            <Empty>{t('eb.noBills')}</Empty>
          ) : (
            <List>
              {bills.map((b) => (
                <ListRow key={b.id} right={<><Money paise={b.total_paise} className="font-semibold" /><div className="mt-1"><Badge tone={toneFor(b.status)}>{t(`status.eb.${b.status}`)}</Badge></div></>}>
                  <div className="font-medium">{b.houses?.unit_number} · {b.tenancies?.tenants?.full_name ?? '—'}</div>
                  <div className="text-xs text-muted">
                    {formatDate(b.period_start, locale)} – {formatDate(b.period_end, locale)} · {t('rent.due', { date: formatDate(b.due_date, locale) })}
                    {b.units != null && ` · ${b.units} ${t('eb.units')}`}
                  </div>
                  <div className="text-xs text-muted">{t(`labels.ebPaidBy.${b.paid_by}`)}{b.owner_paid_on && ` · ${t('eb.ownerPaidOn')} ${formatDate(b.owner_paid_on, locale)}`}</div>
                  {b.proof_path && <a className="text-xs text-primary" href={fileUrl('payment-proofs', b.proof_path)!}>{t('approvals.proof')}</a>}
                  {!b.owner_paid_on && b.status !== 'paid' && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-primary">{t('eb.recordOwnerPaid')}</summary>
                      <ActionForm action={recordOwnerEbPayment} hidden={{ bill_id: b.id }} className="mt-2">
                        <div className="grid grid-cols-2 gap-3">
                          <Field name="paid_on" label={t('eb.ownerPaidOn')}><Input name="paid_on" type="date" defaultValue={todayIST()} /></Field>
                          <Field name="reimburse_due" label={t('eb.reimburseDue')} optional><Input name="reimburse_due" type="date" /></Field>
                        </div>
                        <SubmitButton variant="secondary">{t('eb.ownerPaid')}</SubmitButton>
                      </ActionForm>
                    </details>
                  )}
                </ListRow>
              ))}
            </List>
          )}
        </Section>
      </div>
    </>
  );
}
