import { getTranslations } from 'next-intl/server';
import { MoreMenu } from '@/components/more-menu';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';
import { OWNER_GROUPS } from '@/lib/nav';
import { unreadCount } from '@/lib/unread';

export default async function OwnerMore() {
  const viewer = await requireStaff();
  const t = await getTranslations('nav');
  return (
    <>
      <PageHeader title={t('more')} />
      <MoreMenu groups={OWNER_GROUPS} unread={await unreadCount(viewer.user.id)} />
    </>
  );
}
