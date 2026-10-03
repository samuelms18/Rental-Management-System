import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { PropertyForm } from '@/components/property-form';
import { requireStaff } from '@/lib/auth';

export default async function EditProperty({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const t = await getTranslations('properties');
  const { data } = await supabase.from('properties').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <PageHeader title={t('edit')} back={`/owner/properties/${id}`} />
      <Card><PropertyForm property={data} /></Card>
    </>
  );
}
