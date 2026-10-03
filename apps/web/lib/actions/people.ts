'use server';

import { revalidatePath } from 'next/cache';
import { DOC_TYPES, idLast4, isoDate, optionalDate, optionalPhone, optionalText, parseForm, z } from '@fpm/validation';
import { createClient } from '@/lib/supabase/server';
import { dbError } from '@/lib/db-errors';
import { ALLOW, hasFile, removeFiles, uploadFile } from '@/lib/files';
import type { ActionState } from '@/lib/action-state';

const guestSchema = z
  .object({
    tenancy_id: z.uuid(),
    name: z.string().trim().min(1, 'required').max(120),
    phone: optionalPhone,
    relationship: optionalText(60),
    purpose: optionalText(200),
    check_in: isoDate,
    expected_checkout: optionalDate,
    doc_type: z.enum(DOC_TYPES),
    number_last4: idLast4,
  })
  .refine((v) => !v.expected_checkout || v.expected_checkout >= v.check_in, { path: ['expected_checkout'], message: 'end_after_start' });

/** Guest + ID in one transaction. The ID photo is mandatory, even for one night. */
export async function registerGuest(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(guestSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const d = parsed.data;
  const supabase = await createClient();
  const { data: tenancy } = await supabase.from('tenancies').select('id').eq('id', d.tenancy_id).maybeSingle();
  if (!tenancy) return { errors: { _form: 'not_allowed' } };
  const front = form.get('front');
  if (!hasFile(front)) return { errors: { front: 'guest_id_required' } };
  const up = await uploadFile('identity-docs', tenancy.id, front, ALLOW.imageOrPdf);
  if (!up.ok) return { errors: { front: up.error } };
  const { error } = await supabase.rpc('register_guest', {
    p_tenancy_id: tenancy.id,
    p_name: d.name,
    p_phone: d.phone ?? '',
    p_relationship: d.relationship ?? '',
    p_purpose: d.purpose ?? '',
    p_check_in: d.check_in,
    p_expected_checkout: d.expected_checkout ?? (null as unknown as string), // nullable in SQL
    p_doc_type: d.doc_type,
    p_number_last4: d.number_last4 ?? '',
    p_front_path: up.path,
  });
  if (error) {
    await removeFiles('identity-docs', [up.path]);
    return dbError(error);
  }
  revalidatePath('/tenant/guests');
  revalidatePath('/owner/guests');
  return { ok: true, message: 'guests.registered' };
}

export async function checkoutGuest(form: FormData) {
  const supabase = await createClient();
  await supabase.rpc('guest_checkout', { p_guest_id: String(form.get('id')) });
  revalidatePath('/tenant/guests');
  revalidatePath('/owner/guests');
}

export async function addHelp(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(
    z.object({
      tenancy_id: z.uuid(),
      name: z.string().trim().min(1, 'required').max(120),
      role: z.enum(['maid', 'cook', 'driver', 'caretaker', 'other']),
      phone: optionalPhone,
      address: optionalText(300),
      start_date: optionalDate,
    }),
    form,
  );
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  let photo: string | null = null;
  const file = form.get('photo');
  if (hasFile(file)) {
    const up = await uploadFile('people-photos', parsed.data.tenancy_id, file, ALLOW.image);
    if (!up.ok) return { errors: { photo: up.error } };
    photo = up.path;
  }
  const { error } = await supabase.from('domestic_help').insert({
    tenancy_id: parsed.data.tenancy_id,
    name: parsed.data.name,
    role: parsed.data.role,
    phone: parsed.data.phone ?? null,
    address: parsed.data.address ?? null,
    start_date: parsed.data.start_date ?? undefined,
    photo_path: photo,
  });
  if (error) return dbError(error);
  revalidatePath('/tenant/help');
  return { ok: true, message: 'common.saved' };
}

export async function endHelp(form: FormData) {
  const supabase = await createClient();
  await supabase.from('domestic_help').update({ active: false, end_date: new Date().toISOString().slice(0, 10) }).eq('id', String(form.get('id')));
  revalidatePath('/tenant/help');
}

export async function postAnnouncement(_: ActionState, form: FormData): Promise<ActionState> {
  const raw = String(form.get('target') ?? '');
  const [target, targetId] = raw.split(':') as [string, string | undefined];
  const parsed = parseForm(
    z.object({
      target: z.enum(['all', 'property', 'house', 'tenant']),
      target_id: z.uuid().optional(),
      title: z.string().trim().min(1, 'required').max(140),
      body: z.string().trim().min(1, 'required').max(4000),
    }),
    { target, target_id: targetId || undefined, title: form.get('title'), body: form.get('body') },
  );
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase.from('announcements').insert({ ...parsed.data, target_id: parsed.data.target_id ?? null });
  if (error) return dbError(error);
  revalidatePath('/owner/announcements');
  return { ok: true, message: 'announcements.posted' };
}

export async function markAnnouncementsRead(ids: string[]) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !ids.length) return;
  await supabase.from('announcement_reads').upsert(ids.map((id) => ({ announcement_id: id, user_id: auth.user!.id })), { onConflict: 'announcement_id,user_id', ignoreDuplicates: true });
}
