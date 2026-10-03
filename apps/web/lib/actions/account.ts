'use server';

import { revalidatePath } from 'next/cache';
import { parseForm, profileSchema } from '@fpm/validation';
import { createClient } from '@/lib/supabase/server';
import { setLocaleCookie } from '@/lib/locale-cookie';
import { dbError } from '@/lib/db-errors';
import type { ActionState } from '@/lib/action-state';

export async function updateProfile(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(profileSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { errors: { _form: 'not_allowed' } };
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone ?? null,
      preferred_language: parsed.data.preferred_language,
    })
    .eq('id', auth.user.id);
  if (error) return dbError(error);
  await setLocaleCookie(parsed.data.preferred_language);
  revalidatePath('/', 'layout');
  return { ok: true, message: 'common.saved' };
}

export async function markAllRead() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', auth.user.id).is('read_at', null);
  revalidatePath('/', 'layout');
}
