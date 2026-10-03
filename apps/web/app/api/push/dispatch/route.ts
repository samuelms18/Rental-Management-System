import { NextResponse, type NextRequest } from 'next/server';
import { getTranslations } from 'next-intl/server';
import { isQuietHours } from '@fpm/api';
import { isLocale } from '@fpm/i18n';
import { createAdminClient } from '@/lib/supabase/admin';
import { notificationText } from '@/lib/notification-text';
import { sendPush } from '@/lib/webpush';

/**
 * Called by the database (pg_net trigger on notifications) with a shared secret.
 * Sends a web push to every device the user subscribed. Quiet hours 21:00–08:00 IST: skipped
 * (the in-app notification is always there).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.PUSH_DISPATCH_SECRET;
  if (!secret || request.headers.get('x-push-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const vapid = {
    publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
    privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
    subject: process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
  };
  if (!vapid.publicKey || !vapid.privateKey) return NextResponse.json({ skipped: 'push not configured' });
  const { notification_id } = (await request.json().catch(() => ({}))) as { notification_id?: string };
  if (!notification_id) return NextResponse.json({ error: 'bad request' }, { status: 400 });
  if (isQuietHours() && process.env.PUSH_QUIET_HOURS !== 'off') return NextResponse.json({ skipped: 'quiet hours' });

  const admin = createAdminClient();
  const { data: n } = await admin.from('notifications').select('*').eq('id', notification_id).maybeSingle();
  if (!n) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const [{ data: profile }, { data: subs }] = await Promise.all([
    admin.from('profiles').select('preferred_language').eq('id', n.user_id).maybeSingle(),
    admin.from('push_subscriptions').select('*').eq('user_id', n.user_id),
  ]);
  const locale = isLocale(profile?.preferred_language) ? profile!.preferred_language : 'en';
  const t = await getTranslations({ locale });
  const body = notificationText(t, locale, n.kind, n.params);
  const message = { title: t('app.name'), body, url: n.link ?? '/', tag: n.id };

  let sent = 0;
  for (const s of subs ?? []) {
    const keys = s.keys as { p256dh: string; auth: string };
    try {
      const r = await sendPush({ endpoint: s.endpoint, keys }, message, vapid);
      if (r.gone) await admin.from('push_subscriptions').delete().eq('id', s.id);
      if (r.ok) sent++;
    } catch {
      // one bad endpoint must not stop the others
    }
  }
  return NextResponse.json({ sent });
}
