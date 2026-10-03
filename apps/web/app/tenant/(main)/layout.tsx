import { AppShell } from '@/components/app-shell';
import { requireTenant } from '@/lib/auth';
import { TENANT_PRIMARY, TENANT_SECONDARY } from '@/lib/nav';
import { unreadCount } from '@/lib/unread';

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireTenant();
  return (
    <AppShell primary={TENANT_PRIMARY} secondary={TENANT_SECONDARY} unread={await unreadCount(viewer.user.id)}>
      {children}
    </AppShell>
  );
}
