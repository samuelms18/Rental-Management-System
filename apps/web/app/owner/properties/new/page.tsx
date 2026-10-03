import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { PropertyForm } from '@/components/property-form';
import { requireStaff } from '@/lib/auth';

export default async function NewProperty() {
  await requireStaff();
  const t = await getTranslations('properties');
  return (
    <>
      <PageHeader title={t('add')} back="/owner/properties" />
      <Card><PropertyForm /></Card>
    </>
  );
}
