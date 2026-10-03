import { getTranslations } from 'next-intl/server';
import { Empty } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { DocumentsSection } from '@/components/documents-section';
import { requireTenant } from '@/lib/auth';

export default async function TenantDocuments() {
  const { supabase, tenancy, tenant } = await requireTenant();
  const t = await getTranslations();
  if (!tenancy || !tenant) return <Empty>{t('tenantHome.noTenancy')}</Empty>;
  const [{ data: docs }, { data: occupants }] = await Promise.all([
    supabase.from('identity_documents').select('*').eq('tenancy_id', tenancy.id).order('created_at', { ascending: false }),
    supabase.from('occupants').select('id, name').eq('tenancy_id', tenancy.id).is('end_date', null),
  ]);
  return (
    <>
      <PageHeader title={t('documents.title')} subtitle={t('documents.anyIdOk')} />
      <DocumentsSection tenancyId={tenancy.id} tenant={tenant} occupants={occupants ?? []} docs={docs ?? []} canUpload staff={false} />
    </>
  );
}
