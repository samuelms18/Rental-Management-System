import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { Empty, List, ListRow } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { requireTenant } from '@/lib/auth';

export default async function TenantPayments() {
  const { supabase, tenancy } = await requireTenant();
  const t = await getTranslations();
  const locale = await getLocale();
  if (!tenancy) return <Empty>{t('tenantHome.noTenancy')}</Empty>;
  const { data } = await supabase
    .from('payments')
    .select('*, receipts(id, number, cancelled_at)')
    .eq('tenancy_id', tenancy.id)
    .order('created_at', { ascending: false });
  return (
    <>
      <PageHeader title={t('pay.history')} />
      {!data?.length ? (
        <Empty>{t('pay.noPayments')}</Empty>
      ) : (
        <List>
          {data.map((p) => {
            const receipt = p.receipts.find((r) => !r.cancelled_at);
            return (
              <ListRow key={p.id} right={<><Money paise={p.amount_paise} className="font-semibold" /><div className="mt-1"><Badge tone={toneFor(p.status)}>{t(`status.payment.${p.status}`)}</Badge></div></>}>
                <div className="font-medium">{formatDate(p.paid_on, locale)} · {t(`labels.method.${p.method}`)}</div>
                {p.utr_reference && <div className="font-mono text-xs text-muted">{p.utr_reference}</div>}
                {p.status === 'rejected' && p.rejection_reason && <div className="text-xs text-danger">{t('pay.rejectedReason', { reason: p.rejection_reason })}</div>}
                {receipt && (
                  <a href={`/api/receipts/${receipt.id}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-9 items-center text-sm text-primary">
                    {t('pay.receipt')} {receipt.number}
                  </a>
                )}
              </ListRow>
            );
          })}
        </List>
      )}
    </>
  );
}
