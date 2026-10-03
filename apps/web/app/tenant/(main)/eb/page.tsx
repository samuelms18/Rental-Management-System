import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { Card, DefList, Empty, List, ListRow, Section } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { PayForm } from '@/components/pay-form';
import { requireTenant } from '@/lib/auth';
import { openCharges } from '@/lib/tenant-dues';

export default async function TenantEb() {
  const { supabase, tenancy } = await requireTenant();
  const t = await getTranslations();
  const locale = await getLocale();
  if (!tenancy) return <Empty>{t('tenantHome.noTenancy')}</Empty>;
  const [{ data: account }, { data: bills }, dues] = await Promise.all([
    supabase.from('eb_accounts').select('*').eq('house_id', tenancy.house_id).maybeSingle(),
    supabase.from('eb_bills').select('*').eq('tenancy_id', tenancy.id).order('period_start', { ascending: false }),
    openCharges(supabase, tenancy.id),
  ]);
  const ebDues = dues.filter((c) => c.type === 'eb');

  return (
    <>
      <PageHeader title={t('eb.title')} subtitle={t('eb.tnebHint')} />
      <div className="space-y-6">
        {account && (
          <Card>
            <DefList items={[[t('eb.serviceNumber'), account.service_number], [t('eb.meterNumber'), account.meter_number], [t('eb.consumerName'), account.consumer_name]]} />
          </Card>
        )}
        {ebDues.length > 0 && (
          <Card>
            <h2 className="mb-1 font-semibold">{t('eb.uploadProof')}</h2>
            <p className="mb-3 text-sm text-muted">{t('eb.tenantDirect')}</p>
            <PayForm
              tenancyId={tenancy.id}
              paidTo="tneb"
              charges={ebDues.map((c) => ({ id: c.id, outstanding_paise: c.outstanding_paise, label: `${formatDate(c.period_start, locale)} – ${formatDate(c.period_end, locale)}` }))}
            />
          </Card>
        )}
        <Section title={t('eb.title')}>
          {!bills?.length ? (
            <Empty>{t('eb.noBills')}</Empty>
          ) : (
            <List>
              {bills.map((b) => (
                <ListRow key={b.id} right={<><Money paise={b.total_paise} className="font-semibold" /><div className="mt-1"><Badge tone={toneFor(b.status)}>{t(`status.eb.${b.status}`)}</Badge></div></>}>
                  <div className="font-medium">{formatDate(b.period_start, locale)} – {formatDate(b.period_end, locale)}</div>
                  <div className="text-xs text-muted">{t('rent.due', { date: formatDate(b.due_date, locale) })} · {t(`labels.ebPaidBy.${b.paid_by}`)}</div>
                </ListRow>
              ))}
            </List>
          )}
        </Section>
      </div>
    </>
  );
}
