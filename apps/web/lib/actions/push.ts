'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const subSchema = z.object({
  endpoint: z.url().startsWith('https://'),
  keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(10).max(100) }),
});

export async function savePushSubscription(sub: unknown, userAgent: string) {
  const parsed = subSchema.safeParse(sub);
  if (!parsed.success) return { ok: false };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { ok: false };
  // Same device re-subscribing replaces its old row.
  await supabase.from('push_subscriptions').delete().eq('endpoint', parsed.data.endpoint);
  const { error } = await supabase
    .from('push_subscriptions')
    .insert({ endpoint: parsed.data.endpoint, keys: parsed.data.keys, user_agent: userAgent.slice(0, 200) });
  return { ok: !error };
}

export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient();
  await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
  return { ok: true };
}
