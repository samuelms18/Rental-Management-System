import { getTranslations } from 'next-intl/server';
import { Empty } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { OccupantsSection } from '@/components/occupants-section';
import { requireTenant } from '@/lib/auth';

export default async function TenantOccupants() {
  const { supabase, tenancy } = await requireTenant();
  const t = await getTranslations();
  if (!tenancy) return <Empty>{t('tenantHome.noTenancy')}</Empty>;
  const { data } = await supabase.from('occupants').select('*').eq('tenancy_id', tenancy.id).order('start_date');
  return (
    <>
      <PageHeader title={t('occupants.title')} />
      <OccupantsSection tenancyId={tenancy.id} occupants={data ?? []} canEdit />
    </>
  );
}
