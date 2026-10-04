'use server';

import { revalidatePath } from 'next/cache';
import { memberInviteSchema, memberRemoveSchema, memberRoleSchema, parseForm } from '@fpm/validation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireStaff } from '@/lib/auth';
import { dbError } from '@/lib/db-errors';
import { env } from '@/lib/env';
import type { ActionState } from '@/lib/action-state';

/** Owner ⇄ manager, on every property the signed-in owner owns. The database refuses to leave a property without an owner. */
export async function setMemberRole(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(memberRoleSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase.rpc('set_member_role', { p_user_id: parsed.data.user_id, p_role: parsed.data.role });
  if (error) return dbError(error);
  revalidatePath('/owner', 'layout');
  return { ok: true, message: 'team.roleChanged' };
}

export async function removeMember(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(memberRemoveSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase.rpc('remove_member', { p_user_id: parsed.data.user_id });
  if (error) return dbError(error);
  revalidatePath('/owner/team');
  return { ok: true, message: 'team.removed' };
}

/** Invite a new owner or manager by email and add them to every property the signed-in owner owns. */
export async function inviteMember(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(memberInviteSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const { isOwner, memberships } = await requireStaff();
  if (!isOwner) return { errors: { _form: 'not_allowed' } };
  const owned = memberships.filter((m) => m.role === 'owner').map((m) => m.property_id);
  const { email, full_name, role } = parsed.data;

  const admin = createAdminClient();
  const { data: existing } = await admin.from('profiles').select('id, app_role').eq('email', email).maybeSingle();
  if (existing?.app_role === 'tenant') return { errors: { email: 'tenant_email' } };
  let userId = existing?.id ?? null;
  if (!userId) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name },
      redirectTo: `${env.siteUrl()}/auth/set-password`,
    });
    if (error || !data.user) return dbError(error ?? { message: 'invite failed' });
    userId = data.user.id;
  }
  const { error: pErr } = await admin.from('profiles').update({ app_role: 'staff', full_name }).eq('id', userId);
  if (pErr) return dbError(pErr);
  const { error: mErr } = await admin
    .from('property_members')
    .upsert(owned.map((property_id) => ({ property_id, user_id: userId!, role })), { onConflict: 'property_id,user_id' });
  if (mErr) return dbError(mErr);
  revalidatePath('/owner/team');
  return { ok: true, message: existing ? 'team.added' : 'team.invited' };
}
