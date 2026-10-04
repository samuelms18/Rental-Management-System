import { AppShell } from '@/components/app-shell';
import { requireTenant } from '@/lib/auth';
import { TENANT_GROUPS, TENANT_PRIMARY } from '@/lib/nav';
import { unreadCount } from '@/lib/unread';

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireTenant();
  return (
    <AppShell
      primary={TENANT_PRIMARY}
      groups={TENANT_GROUPS}
      unread={await unreadCount(viewer.user.id)}
      viewer={{ name: viewer.tenant?.full_name ?? viewer.profile.full_name ?? '', role: 'tenant', profileHref: '/tenant/profile', notificationsHref: '/tenant/notifications' }}
    >
      {children}
    </AppShell>
  );
}
