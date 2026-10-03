import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate } from '@fpm/api';
import { Card, DefList, Empty, Section } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { requireTenant } from '@/lib/auth';
import { fileUrl } from '@/lib/file-url';

export default async function TenantHouse() {
  const { supabase, tenancy } = await requireTenant();
  const t = await getTranslations();
  const locale = await getLocale();
  if (!tenancy || !tenancy.houses) return <Empty>{t('tenantHome.noTenancy')}</Empty>;
  const [{ data: photos }, { data: revisions }] = await Promise.all([
    supabase.from('house_photos').select('id, storage_path, area').eq('house_id', tenancy.houses.id).order('area'),
    supabase.from('rent_revisions').select('amount_paise, effective_from').eq('tenancy_id', tenancy.id).order('effective_from', { ascending: false }),
  ]);
  const h = tenancy.houses;
  const agreement = fileUrl('agreements', tenancy.offline_agreement_path);
  return (
    <>
      <PageHeader title={h.unit_number} subtitle={[h.properties?.name, h.properties?.address_line, h.properties?.city].filter(Boolean).join(', ')} />
      <div className="space-y-6">
        <Card>
          <DefList
            items={[
              [t('tenancy.code'), tenancy.code],
              [t('tenancy.startDate'), formatDate(tenancy.start_date, locale)],
              [t('tenancy.endDate'), formatDate(tenancy.expected_end_date, locale) || '—'],
              [t('tenancy.rent'), revisions?.[0] ? <Money key="r" paise={revisions[0].amount_paise} /> : '—'],
              [t('tenancy.advance'), <Money key="a" paise={tenancy.advance_paise} />],
              [t('tenancy.noticeDays'), tenancy.notice_period_days],
              [t('tenancy.dueDay'), tenancy.rent_due_day],
              [t('houses.unitType'), h.unit_type],
            ]}
          />
          {agreement && <a href={agreement} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm text-primary">{t('tenancy.viewAgreement')}</a>}
        </Card>
        {!!photos?.length && (
          <Section title={t('houses.photos')}>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={p.id} src={fileUrl('house-photos', p.storage_path)!} alt={t(`labels.photoArea.${p.area}`)} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
              ))}
            </div>
          </Section>
        )}
      </div>
    </>
  );
}
