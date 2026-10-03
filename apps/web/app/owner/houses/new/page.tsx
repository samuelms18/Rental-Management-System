import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { HouseForm } from '@/components/house-form';
import { requireStaff } from '@/lib/auth';

export default async function NewHouse({ searchParams }: { searchParams: Promise<{ property?: string }> }) {
  await requireStaff();
  const { property } = await searchParams;
  if (!property) redirect('/owner/properties');
  const t = await getTranslations('houses');
  return (
    <>
      <PageHeader title={t('add')} back={`/owner/properties/${property}`} />
      <Card><HouseForm propertyId={property} /></Card>
    </>
  );
}
