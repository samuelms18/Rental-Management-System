import { AppShell } from '@/components/app-shell';
import { requireStaff } from '@/lib/auth';
import { OWNER_GROUPS, OWNER_PRIMARY } from '@/lib/nav';
import { unreadCount } from '@/lib/unread';

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff();
  return (
    <AppShell
      primary={OWNER_PRIMARY}
      groups={OWNER_GROUPS}
      unread={await unreadCount(viewer.user.id)}
      viewer={{ name: viewer.profile.full_name || viewer.user.email || '', role: viewer.isOwner ? 'owner' : 'manager', profileHref: '/owner/profile' }}
    >
      {children}
    </AppShell>
  );
}
