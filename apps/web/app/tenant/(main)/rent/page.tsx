import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate, formatMonth, paiseToRupeesInput } from '@fpm/api';
import { LinkButton } from '@/components/ui/button';
import { Card, Empty, List, Section } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { ChargeRow } from '@/components/charge-row';
import { CopyButton } from '@/components/copy-button';
import { PayForm } from '@/components/pay-form';
import { requireTenant } from '@/lib/auth';
import { openCharges } from '@/lib/tenant-dues';
import { fileUrl } from '@/lib/file-url';

export default async function TenantRent() {
  const { supabase, tenancy } = await requireTenant();
  const t = await getTranslations();
  const locale = await getLocale();
  if (!tenancy) return <Empty>{t('tenantHome.noTenancy')}</Empty>;
  const dues = (await openCharges(supabase, tenancy.id)).filter((c) => c.type !== 'eb');
  const { data: payee } = await supabase.from('payee_settings').select('*').eq('property_id', tenancy.houses?.property_id ?? '').maybeSingle();
  const total = dues.reduce((n, c) => n + c.outstanding_paise, 0);
  const qr = fileUrl('payee', payee?.qr_path);
  const upiLink = payee
    ? `upi://pay?pa=${encodeURIComponent(payee.upi_id)}&pn=${encodeURIComponent(payee.payee_name)}&am=${paiseToRupeesInput(total)}&cu=INR&tn=${encodeURIComponent(`Rent ${tenancy.code}`)}`
    : null;

  return (
    <>
      <PageHeader title={t('pay.title')} />
      <div className="space-y-6">
        <Card className="space-y-2 text-center">
          <div className="text-sm text-muted">{t('pay.amountDue')}</div>
          <div className="text-4xl font-semibold"><Money paise={total} /></div>
          {dues[0] && <div className="text-sm text-muted">{t('pay.dueOn', { date: formatDate(dues[0].due_date, locale) })}</div>}
        </Card>

        {total === 0 ? (
          <Empty>{t('pay.nothingDue')}</Empty>
        ) : !payee ? (
          <Empty>{t('rent.payeeMissing')}</Empty>
        ) : (
          <>
            <Card className="space-y-4 text-center">
              <p className="text-sm">{t('pay.scan')}</p>
              {qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt={t('payee.qr')} className="mx-auto size-64 rounded-xl border border-border bg-white object-contain p-2" />
              )}
              <div className="text-sm text-muted">{t('pay.payTo')}: <span className="font-medium text-fg">{payee.payee_name}</span></div>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-sm">{payee.upi_id}</span>
                <CopyButton text={payee.upi_id} />
              </div>
              {upiLink && <LinkButton href={upiLink} external variant="secondary" className="w-full sm:hidden">{t('pay.openUpi')}</LinkButton>}
            </Card>
            <Card>
              <h2 className="mb-3 font-semibold">{t('pay.afterPaying')}</h2>
              <PayForm
                tenancyId={tenancy.id}
                charges={dues.map((c) => ({
                  id: c.id,
                  outstanding_paise: c.outstanding_paise,
                  label: `${t(`labels.chargeType.${c.type}`)} · ${formatMonth(c.period_start, locale)} · ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(c.outstanding_paise / 100)}`,
                }))}
              />
            </Card>
          </>
        )}

        {dues.length > 0 && (
          <Section title={t('tenancy.charges')}>
            <List>
              {dues.map((c) => <ChargeRow key={c.id} c={c} />)}
            </List>
          </Section>
        )}
      </div>
    </>
  );
}
