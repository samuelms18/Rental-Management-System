import { getTranslations } from 'next-intl/server';
import { ProfileView } from '@/components/profile-view';
import { requireStaff } from '@/lib/auth';

export default async function OwnerProfile() {
  const viewer = await requireStaff();
  const t = await getTranslations('profile.roles');
  return <ProfileView profile={viewer.profile} roleLabel={t(viewer.isOwner ? 'owner' : 'manager')} />;
}
