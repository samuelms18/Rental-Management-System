import { getTranslations } from 'next-intl/server';
import { MoreMenu } from '@/components/more-menu';
import { PageHeader } from '@/components/ui/page-header';
import { requireTenant } from '@/lib/auth';
import { TENANT_SECONDARY } from '@/lib/nav';

export default async function TenantMore() {
  await requireTenant();
  const t = await getTranslations('nav');
  return (
    <>
      <PageHeader title={t('more')} />
      <MoreMenu items={TENANT_SECONDARY} />
    </>
  );
}
