import { NotificationsView } from '@/components/notifications-view';
import { requireStaff } from '@/lib/auth';

export default async function OwnerNotifications() {
  const { supabase, user } = await requireStaff();
  const { data } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  return <NotificationsView items={data ?? []} />;
}
