import { getTranslations } from 'next-intl/server';
import { ProfileView } from '@/components/profile-view';
import { requireTenant } from '@/lib/auth';

export default async function TenantProfile() {
  const { profile } = await requireTenant();
  const t = await getTranslations('profile.roles');
  return <ProfileView profile={profile} roleLabel={t('tenant')} />;
}
