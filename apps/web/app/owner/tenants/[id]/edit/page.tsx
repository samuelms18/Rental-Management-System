import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { TenantForm } from '@/components/tenant-form';
import { requireStaff } from '@/lib/auth';

export default async function EditTenant({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const t = await getTranslations('tenants');
  const { data } = await supabase.from('tenants').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  return (
    <>
      <PageHeader title={t('edit')} back={`/owner/tenants/${id}`} />
      <Card><TenantForm tenant={data} /></Card>
    </>
  );
}
