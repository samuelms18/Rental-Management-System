import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate, formatINR, formatMonth, paiseToRupeesInput } from '@fpm/api';
import { LinkButton } from '@/components/ui/button';
import { Card, Empty, Hero, List, Section } from '@/components/ui/card';
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
  const [{ data: payee }, { data: waitingRows }] = await Promise.all([
    supabase.from('payee_settings').select('*').eq('property_id', tenancy.houses?.property_id ?? '').maybeSingle(),
    supabase.from('payments').select('amount_paise').eq('tenancy_id', tenancy.id).eq('status', 'submitted').neq('paid_to', 'tneb'),
  ]);
  const total = dues.reduce((n, c) => n + c.outstanding_paise, 0);
  // Payments waiting for approval are not owed twice: the UPI link and the form only ask for the balance.
  const waiting = (waitingRows ?? []).reduce((n, p) => n + p.amount_paise, 0);
  const balance = Math.max(total - waiting, 0);
  const qr = fileUrl('payee', payee?.qr_path);
  const upiLink = payee
    ? `upi://pay?pa=${encodeURIComponent(payee.upi_id)}&pn=${encodeURIComponent(payee.payee_name)}&am=${paiseToRupeesInput(balance)}&cu=INR&tn=${encodeURIComponent(`Rent ${tenancy.code}`)}`
    : null;

  return (
    <>
      <PageHeader title={t('pay.title')} />
      <div className="space-y-8">
        <Hero className="space-y-2">
          <div className="text-sm font-semibold opacity-90">{t('pay.amountDue')}</div>
          <div className="tabular text-[44px] font-extrabold leading-none tracking-[-0.02em]"><Money paise={total} /></div>
          {dues[0] && <div className="text-sm opacity-90">{t('pay.dueOn', { date: formatDate(dues[0].due_date, locale) })}</div>}
          {waiting > 0 && (
            <div className="mt-3 rounded-xl bg-white/95 px-4 py-3 text-sm font-medium text-[#222]">
              {balance > 0 ? t('tenantHome.waitingPartial', { amount: formatINR(waiting) }) : t('tenantHome.waiting', { amount: formatINR(waiting) })}
            </div>
          )}
        </Hero>

        {total === 0 ? (
          <Empty>{t('pay.nothingDue')}</Empty>
        ) : !payee ? (
          <Empty>{t('rent.payeeMissing')}</Empty>
        ) : (
          <>
            {/* Step 1 disappears while everything owed is already waiting for approval; step 2 stays so its confirmation shows. */}
            {balance > 0 && <section className="space-y-4">
              <h2 className="flex items-center gap-2.5 text-lg font-bold">
                <span className="flex size-7 items-center justify-center rounded-full bg-fg text-sm text-bg">1</span>
                {t('pay.step1')}
              </h2>
              <p className="text-sm text-muted">{t('pay.scan')}</p>
              {qr && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt={t('payee.qr')} className="mx-auto size-56 rounded-2xl border border-border bg-white object-contain p-3 shadow-card" />
              )}
              <Card className="space-y-1 text-center">
                <div className="text-sm text-muted">{t('pay.payTo')}:</div>
                <div className="font-bold">{payee.payee_name}</div>
                <div className="flex items-center justify-center gap-2">
                  <span className="font-mono text-sm">{payee.upi_id}</span>
                  <CopyButton text={payee.upi_id} />
                </div>
              </Card>
              {upiLink && <LinkButton href={upiLink} external variant="secondary" className="w-full sm:hidden">{t('pay.openUpi')}</LinkButton>}
            </section>}
            <section className="space-y-4">
              <h2 className="flex items-center gap-2.5 text-lg font-bold">
                <span className="flex size-7 items-center justify-center rounded-full bg-fg text-sm text-bg">2</span>
                {t('pay.step2')}
              </h2>
              <Card>
                <PayForm
                  tenancyId={tenancy.id}
                  defaultAmountPaise={Math.min(balance, dues[0]?.outstanding_paise ?? balance)}
                  charges={dues.map((c) => ({
                    id: c.id,
                    outstanding_paise: c.outstanding_paise,
                    label: `${t(`labels.chargeType.${c.type}`)} · ${formatMonth(c.period_start, locale)} · ${formatINR(c.outstanding_paise)}`,
                  }))}
                />
              </Card>
            </section>
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
