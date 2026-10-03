import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { Card, Empty, List, ListRow, Section } from '@/components/ui/card';
import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';
import { approvePayment, rejectPayment, reversePayment } from '@/lib/actions/finance';
import { fileUrl } from '@/lib/file-url';

const SELECT = '*, charges!payments_charge_id_fkey(type, period_start), receipts(id, number, cancelled_at), tenancies(id, code, tenants(full_name), houses(unit_number))';

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ approved?: string }> }) {
  const { approved } = await searchParams;
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const [{ data: pending }, { data: recent }] = await Promise.all([
    supabase.from('payments').select(SELECT).eq('status', 'submitted').order('created_at'),
    supabase.from('payments').select(SELECT).neq('status', 'submitted').order('reviewed_at', { ascending: false }).limit(20),
  ]);

  return (
    <>
      <PageHeader title={t('approvals.title')} subtitle={t('approvals.allocation')} />
      <div className="space-y-8">
        {approved !== undefined && (
          <p role="status" className="rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">
            {approved ? t('approvals.approved', { number: approved }) : t('common.saved')}
          </p>
        )}
        {!pending?.length ? (
          <Empty>{t('approvals.empty')}</Empty>
        ) : (
          <div className="space-y-4">
            {pending.map((p) => {
              const proof = fileUrl('payment-proofs', p.proof_path);
              return (
                <Card key={p.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/owner/tenancies/${p.tenancies?.id}`} className="font-semibold">{p.tenancies?.houses?.unit_number} · {p.tenancies?.tenants?.full_name}</Link>
                      <div className="text-sm text-muted">
                        {t(`labels.method.${p.method}`)} · {t(`labels.paidTo.${p.paid_to}`)} · {formatDate(p.paid_on, locale)}
                      </div>
                      <div className="font-mono text-sm">UTR {p.utr_reference ?? '—'}</div>
                      {p.charges && <div className="text-xs text-muted">{t('pay.forCharge')}: {t(`labels.chargeType.${p.charges.type}`)} · {p.charges.period_start.slice(0, 7)}</div>}
                      {p.notes && <div className="text-xs text-muted">{p.notes}</div>}
                    </div>
                    <Money paise={p.amount_paise} className="text-lg font-semibold" />
                  </div>
                  {proof ? (
                    <a href={proof} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={proof} alt={t('approvals.proof')} className="max-h-72 rounded-xl border border-border object-contain" loading="lazy" />
                    </a>
                  ) : (
                    <p className="text-sm text-warn">{t('approvals.noProof')}</p>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <ActionForm action={approvePayment} hidden={{ id: p.id }}>
                      <SubmitButton>{t('approvals.approve')}</SubmitButton>
                    </ActionForm>
                    <ActionForm action={rejectPayment} hidden={{ id: p.id }} className="flex flex-1 items-end gap-2 space-y-0">
                      <div className="flex-1">
                        <Field name="reason" label={t('approvals.rejectReason')}>
                          <Input name="reason" />
                        </Field>
                      </div>
                      <SubmitButton variant="secondary">{t('approvals.reject')}</SubmitButton>
                    </ActionForm>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <Section title={t('approvals.recent')}>
          <List>
            {(recent ?? []).map((p) => {
              const receipt = p.receipts.find((r) => !r.cancelled_at);
              return (
                <ListRow key={p.id} right={<><Money paise={p.amount_paise} className="font-semibold" /><div className="mt-1"><Badge tone={toneFor(p.status)}>{t(`status.payment.${p.status}`)}</Badge></div></>}>
                  <div className="font-medium">{p.tenancies?.houses?.unit_number} · {p.tenancies?.tenants?.full_name}</div>
                  <div className="text-xs text-muted">{t(`labels.method.${p.method}`)} · {formatDate(p.paid_on, locale)} {p.utr_reference && `· ${p.utr_reference}`}</div>
                  {p.rejection_reason && <div className="text-xs text-danger">{p.rejection_reason}</div>}
                  {receipt && <a className="text-sm text-primary" href={`/api/receipts/${receipt.id}`} target="_blank" rel="noreferrer">{receipt.number}</a>}
                  {p.status === 'approved' && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs text-muted">{t('approvals.reverse')}</summary>
                      <ActionForm action={reversePayment} hidden={{ id: p.id }} className="mt-2 flex items-end gap-2 space-y-0">
                        <div className="flex-1">
                          <Field name="reason" label={t('common.reason')} hint={t('approvals.reverseHelp')}>
                            <Input name="reason" />
                          </Field>
                        </div>
                        <SubmitButton variant="danger">{t('approvals.reverse')}</SubmitButton>
                      </ActionForm>
                    </details>
                  )}
                </ListRow>
              );
            })}
          </List>
        </Section>
      </div>
    </>
  );
}
