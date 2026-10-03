import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { Card, Empty, List, ListRow, Stat } from '@/components/ui/card';
import { ActionForm, Field, SubmitButton, Textarea } from '@/components/ui/form';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { requireTenant } from '@/lib/auth';
import { respondSettlement } from '@/lib/actions/move';
import { settlementLines } from '@/lib/settlement';

/** Works for current tenants in notice period and for former tenants (read-only, 90 days). */
export default async function TenantSettlement() {
  const { supabase } = await requireTenant();
  const t = await getTranslations();
  const locale = await getLocale();
  const { data: mo } = await supabase.from('move_out_records').select('*').neq('status', 'draft').order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!mo) return (<><PageHeader title={t('moveOut.statement')} /><Empty>{t('moveOut.noStatement')}</Empty></>);
  const { lines, balance, refunded } = await settlementLines(supabase, mo.tenancy_id);
  const canRespond = ['shared_with_tenant', 'disputed'].includes(mo.status);
  return (
    <>
      <PageHeader title={t('moveOut.statement')} subtitle={<Badge tone={toneFor(mo.status)}>{t(`status.settlement.${mo.status}`)}</Badge>} />
      <div className="space-y-6">
        <p className="text-sm text-muted">{t('tenancy.moveOutDate')}: {formatDate(mo.move_out_date, locale)}</p>
        <List>
          {lines.map((l) => (
            <ListRow key={l.id} right={<span className={l.sign < 0 ? 'text-danger' : ''}>{l.sign < 0 ? '−' : ''}<Money paise={l.amount} /></span>}>
              <div className="text-sm">{l.labelKey ? t(l.labelKey) : l.label}</div>
            </ListRow>
          ))}
        </List>
        <Stat label={mo.status === 'settled' ? t('moveOut.refunded') : t('moveOut.refund')} value={<Money paise={mo.status === 'settled' ? refunded : Math.max(balance, 0)} />} tone="ok" />
        {mo.status === 'settled' && mo.refund_date && (
          <p className="text-sm">{t('moveOut.refundedOn', { date: formatDate(mo.refund_date, locale), method: t(`labels.method.${mo.refund_method ?? 'other'}`) })}</p>
        )}
        <a className="text-sm text-primary" href={`/api/settlement/${mo.tenancy_id}`} target="_blank" rel="noreferrer">{t('moveOut.statementPdf')}</a>
        {canRespond && (
          <Card className="space-y-4">
            <ActionForm action={respondSettlement} hidden={{ tenancy_id: mo.tenancy_id, decision: 'accept' }}>
              <SubmitButton className="w-full sm:w-full">{t('moveOut.acknowledge')}</SubmitButton>
            </ActionForm>
            <ActionForm action={respondSettlement} hidden={{ tenancy_id: mo.tenancy_id, decision: 'dispute' }}>
              <Field name="note" label={t('moveOut.disputeNote')}><Textarea name="note" /></Field>
              <SubmitButton variant="secondary">{t('moveOut.dispute')}</SubmitButton>
            </ActionForm>
          </Card>
        )}
        {mo.tenant_note && <p className="text-sm text-muted">{t('moveOut.tenantNote')}: {mo.tenant_note}</p>}
        <p className="text-xs text-muted">{t('moveOut.formerAccess')}</p>
      </div>
    </>
  );
}
