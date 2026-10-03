'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { houseSchema, housePhotoSchema, MANUAL_HOUSE_STATUSES, parseForm, payeeSchema, propertySchema, z } from '@fpm/validation';
import { createClient } from '@/lib/supabase/server';
import { dbError } from '@/lib/db-errors';
import { ALLOW, hasFile, removeFiles, uploadFile } from '@/lib/files';
import type { ActionState } from '@/lib/action-state';

export async function saveProperty(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(propertySchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const id = form.get('id');
  const values = {
    name: parsed.data.name,
    address_line: parsed.data.address_line ?? '',
    city: parsed.data.city ?? '',
    state: parsed.data.state ?? 'Tamil Nadu',
    pin: parsed.data.pin ?? null,
    description: parsed.data.description ?? null,
    notes: parsed.data.notes ?? null,
  };
  if (typeof id === 'string' && id) {
    const { error } = await supabase.from('properties').update(values).eq('id', id);
    if (error) return dbError(error);
    revalidatePath(`/owner/properties/${id}`);
    redirect(`/owner/properties/${id}`);
  }
  const { data, error } = await supabase.from('properties').insert(values).select('id').single();
  if (error) return dbError(error);
  redirect(`/owner/properties/${data.id}`);
}

export async function saveHouse(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(houseSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const id = form.get('id');
  const values = {
    ...parsed.data,
    floor: parsed.data.floor ?? null,
    unit_type: parsed.data.unit_type ?? null,
    bedrooms: parsed.data.bedrooms ?? null,
    bathrooms: parsed.data.bathrooms ?? null,
    area_sqft: parsed.data.area_sqft ?? null,
    notes: parsed.data.notes ?? null,
  };
  if (typeof id === 'string' && id) {
    const { property_id: _p, ...update } = values;
    const { error } = await supabase.from('houses').update(update).eq('id', id);
    if (error) return dbError(error);
    redirect(`/owner/houses/${id}`);
  }
  const { data, error } = await supabase.from('houses').insert(values).select('id').single();
  if (error) {
    if (error.code === '23505') return { errors: { unit_number: 'duplicate' } };
    return dbError(error);
  }
  redirect(`/owner/houses/${data.id}`);
}

export async function setHouseStatus(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(z.object({ id: z.uuid(), status: z.enum(MANUAL_HOUSE_STATUSES) }), form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase.from('houses').update({ status: parsed.data.status }).eq('id', parsed.data.id);
  if (error) return dbError(error);
  revalidatePath(`/owner/houses/${parsed.data.id}`);
  return { ok: true, message: 'common.saved' };
}

export async function deleteHouse(form: FormData) {
  const id = String(form.get('id'));
  const propertyId = String(form.get('property_id'));
  const supabase = await createClient();
  const { data: photos } = await supabase.from('house_photos').select('storage_path').eq('house_id', id);
  const { error, count } = await supabase.from('houses').delete({ count: 'exact' }).eq('id', id);
  if (!error && count) {
    await removeFiles('house-photos', (photos ?? []).map((p) => p.storage_path));
    redirect(`/owner/properties/${propertyId}`);
  }
  redirect(`/owner/houses/${id}?error=delete`);
}

export async function addHousePhoto(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(housePhotoSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  // Access check with the user's own client before using the service role for storage.
  const { data: house } = await supabase.from('houses').select('id, property_id').eq('id', parsed.data.house_id).maybeSingle();
  if (!house) return { errors: { _form: 'not_allowed' } };
  const files = form.getAll('file').filter(hasFile);
  if (!files.length) return { errors: { file: 'file_required' } };
  for (const file of files) {
    const up = await uploadFile('house-photos', `${house.property_id}/${house.id}`, file, ALLOW.image);
    if (!up.ok) return { errors: { file: up.error } };
    const { error } = await supabase.from('house_photos').insert({
      house_id: house.id,
      area: parsed.data.area,
      caption: parsed.data.caption ?? null,
      storage_path: up.path,
    });
    if (error) {
      await removeFiles('house-photos', [up.path]);
      return dbError(error);
    }
  }
  revalidatePath(`/owner/houses/${house.id}`);
  return { ok: true, message: 'common.saved' };
}

export async function deleteHousePhoto(form: FormData) {
  const id = String(form.get('id'));
  const supabase = await createClient();
  const { data, error } = await supabase.from('house_photos').delete().eq('id', id).select('house_id, storage_path');
  if (!error && data?.[0]) {
    await removeFiles('house-photos', [data[0].storage_path]);
    revalidatePath(`/owner/houses/${data[0].house_id}`);
  }
}

export async function savePayee(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(payeeSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { data: property } = await supabase.from('properties').select('id').eq('id', parsed.data.property_id).maybeSingle();
  if (!property) return { errors: { _form: 'not_allowed' } };
  const { data: existing } = await supabase.from('payee_settings').select('qr_path').eq('property_id', property.id).maybeSingle();
  let qrPath = existing?.qr_path ?? null;
  const file = form.get('qr');
  if (hasFile(file)) {
    const up = await uploadFile('payee', property.id, file, ALLOW.image);
    if (!up.ok) return { errors: { qr: up.error } };
    qrPath = up.path;
  }
  const values = {
    property_id: property.id,
    payee_name: parsed.data.payee_name,
    upi_id: parsed.data.upi_id,
    qr_path: qrPath,
    updated_at: new Date().toISOString(),
  };
  const { error } = existing
    ? await supabase.from('payee_settings').update(values).eq('property_id', property.id)
    : await supabase.from('payee_settings').insert(values);
  if (error) return dbError(error);
  if (existing?.qr_path && existing.qr_path !== qrPath) await removeFiles('payee', [existing.qr_path]);
  revalidatePath(`/owner/properties/${property.id}`);
  return { ok: true, message: 'common.saved' };
}

export async function saveReminderRules(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(
    z.object({
      property_id: z.uuid(),
      offsets: z
        .string()
        .transform((s) => s.split(/[,\s]+/).filter(Boolean).map((n) => -Math.abs(Number(n))))
        .pipe(z.array(z.number().int().min(-30).max(0)).max(6)),
      overdue_every_days: z.coerce.number().int().min(1).max(30),
    }),
    form,
  );
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const offsets = [...new Set([...parsed.data.offsets, 0])].sort((a, b) => a - b);
  const { error } = await supabase
    .from('reminder_rules')
    .update({ offsets, overdue_every_days: parsed.data.overdue_every_days })
    .eq('property_id', parsed.data.property_id);
  if (error) return dbError(error);
  revalidatePath(`/owner/properties/${parsed.data.property_id}`);
  return { ok: true, message: 'common.saved' };
}
