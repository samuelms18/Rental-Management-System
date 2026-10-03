import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { HouseForm } from '@/components/house-form';
import { requireStaff } from '@/lib/auth';

export default async function EditHouse({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const t = await getTranslations('houses');
  const { data } = await supabase.from('houses').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <PageHeader title={t('edit')} back={`/owner/houses/${id}`} />
      <Card><HouseForm propertyId={data.property_id} house={data} /></Card>
    </>
  );
}
