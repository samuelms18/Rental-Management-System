import { NotificationsView } from '@/components/notifications-view';
import { requireTenant } from '@/lib/auth';

export default async function TenantNotifications() {
  const { supabase, user } = await requireTenant();
  const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
  return <NotificationsView items={data ?? []} />;
}
