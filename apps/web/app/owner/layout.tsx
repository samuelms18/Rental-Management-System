import { AppShell } from '@/components/app-shell';
import { requireStaff } from '@/lib/auth';
import { OWNER_PRIMARY, OWNER_SECONDARY } from '@/lib/nav';
import { unreadCount } from '@/lib/unread';

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireStaff();
  return (
    <AppShell primary={OWNER_PRIMARY} secondary={OWNER_SECONDARY} unread={await unreadCount(viewer.user.id)}>
      {children}
    </AppShell>
  );
}
