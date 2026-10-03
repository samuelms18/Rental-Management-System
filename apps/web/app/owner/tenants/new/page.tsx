import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { TenantForm } from '@/components/tenant-form';
import { requireStaff } from '@/lib/auth';

export default async function NewTenant({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  await requireStaff();
  const { next } = await searchParams;
  const t = await getTranslations('tenants');
  return (
    <>
      <PageHeader title={t('add')} back={next ?? '/owner/tenants'} />
      <Card><TenantForm next={next} /></Card>
    </>
  );
}
