'use server';

import { revalidatePath } from 'next/cache';
import { isoDate, optionalDate, optionalText, parseForm, positiveRupees, rupees, z } from '@fpm/validation';
import { PHOTO_AREAS } from '@fpm/validation';
import { createClient } from '@/lib/supabase/server';
import { dbError } from '@/lib/db-errors';
import { ALLOW, hasFile, removeFiles, uploadFile } from '@/lib/files';
import type { ActionState } from '@/lib/action-state';

function refresh(tenancyId: string) {
  revalidatePath(`/owner/tenancies/${tenancyId}`, 'layout');
  revalidatePath('/tenant', 'layout');
}

async function staffTenancy(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('tenancies').select('id, house_id, status').eq('id', id).maybeSingle();
  return { supabase, tenancy: data };
}

export async function saveAdvance(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(
    z.object({
      tenancy_id: z.uuid(),
      advance_received_paise: rupees,
      advance_received_on: isoDate,
      advance_method: z.enum(['upi', 'cash', 'bank_transfer', 'other']),
      advance_reference: optionalText(80),
    }),
    form,
  );
  if (!parsed.ok) return { errors: parsed.errors };
  const { supabase, tenancy } = await staffTenancy(parsed.data.tenancy_id);
  if (!tenancy) return { errors: { _form: 'not_allowed' } };
  const { error } = await supabase
    .from('move_in_records')
    .upsert({ ...parsed.data, advance_reference: parsed.data.advance_reference ?? null }, { onConflict: 'tenancy_id' });
  if (error) return dbError(error);
  refresh(tenancy.id);
  return { ok: true, message: 'common.saved' };
}

export async function addMeterReading(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(
    z.object({
      tenancy_id: z.uuid(),
      stage: z.enum(['move_in', 'move_out', 'regular']),
      reading: z.coerce.number().min(0).max(10_000_000),
      read_on: isoDate,
    }),
    form,
  );
  if (!parsed.ok) return { errors: parsed.errors };
  const { supabase, tenancy } = await staffTenancy(parsed.data.tenancy_id);
  if (!tenancy) return { errors: { _form: 'not_allowed' } };
  let photo: string | null = null;
  const file = form.get('photo');
  if (hasFile(file)) {
    const up = await uploadFile('tenancy-photos', tenancy.id, file, ALLOW.image);
    if (!up.ok) return { errors: { photo: up.error } };
    photo = up.path;
  }
  const { data, error } = await supabase
    .from('meter_readings')
    .insert({ house_id: tenancy.house_id, tenancy_id: tenancy.id, reading: parsed.data.reading, read_on: parsed.data.read_on, stage: parsed.data.stage, photo_path: photo })
    .select('id')
    .single();
  if (error) return dbError(error);
  if (parsed.data.stage === 'move_in') {
    await supabase.from('move_in_records').upsert({ tenancy_id: tenancy.id, meter_reading_id: data.id }, { onConflict: 'tenancy_id' });
  }
  if (parsed.data.stage === 'move_out') {
    await supabase.from('move_out_records').update({ meter_reading_id: data.id }).eq('tenancy_id', tenancy.id);
  }
  refresh(tenancy.id);
  return { ok: true, message: 'common.saved' };
}

export async function addTenancyPhotos(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(z.object({ tenancy_id: z.uuid(), stage: z.enum(['move_in', 'move_out']), area: z.enum(PHOTO_AREAS) }), form);
  if (!parsed.ok) return { errors: parsed.errors };
  const { supabase, tenancy } = await staffTenancy(parsed.data.tenancy_id);
  if (!tenancy) return { errors: { _form: 'not_allowed' } };
  const files = form.getAll('files').filter(hasFile);
  if (!files.length) return { errors: { files: 'file_required' } };
  for (const f of files) {
    const up = await uploadFile('tenancy-photos', tenancy.id, f, ALLOW.image);
    if (!up.ok) return { errors: { files: up.error } };
    const { error } = await supabase.from('tenancy_photos').insert({ tenancy_id: tenancy.id, stage: parsed.data.stage, area: parsed.data.area, path: up.path });
    if (error) {
      await removeFiles('tenancy-photos', [up.path]);
      return dbError(error);
    }
  }
  refresh(tenancy.id);
  return { ok: true, message: 'common.saved' };
}

export async function completeMoveIn(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get('tenancy_id'));
  const supabase = await createClient();
  const { error } = await supabase.rpc('complete_move_in', { p_tenancy_id: id });
  if (error) return dbError(error);
  refresh(id);
  return { ok: true, message: 'common.saved' };
}

export async function saveMoveOut(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(
    z.object({
      tenancy_id: z.uuid(),
      move_out_date: isoDate,
      notice_date: optionalDate,
      eb_units: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().min(0).optional()),
      eb_rate_paise: z.preprocess((v) => (v === '' ? undefined : v), rupees.optional()),
      final_eb_paise: rupees.default(0),
      inspection_notes: optionalText(4000),
    }),
    form,
  );
  if (!parsed.ok) return { errors: parsed.errors };
  const { supabase, tenancy } = await staffTenancy(parsed.data.tenancy_id);
  if (!tenancy) return { errors: { _form: 'not_allowed' } };
  const d = parsed.data;
  const { error } = await supabase.from('move_out_records').upsert(
    {
      tenancy_id: d.tenancy_id,
      move_out_date: d.move_out_date,
      notice_date: d.notice_date ?? null,
      eb_units: d.eb_units ?? null,
      eb_rate_paise: d.eb_rate_paise ?? null,
      final_eb_paise: d.final_eb_paise,
      inspection_notes: d.inspection_notes ?? null,
    },
    { onConflict: 'tenancy_id' },
  );
  if (error) return dbError(error);
  // Notice on the tenancy too (pro-rates the last month's rent if unpaid).
  if (tenancy.status === 'active') {
    await supabase.from('tenancies').update({ status: 'notice_period', actual_end_date: d.move_out_date }).eq('id', tenancy.id);
  }
  refresh(tenancy.id);
  return { ok: true, message: 'common.saved' };
}

export async function addDeduction(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(z.object({ tenancy_id: z.uuid(), amount_paise: positiveRupees, reason: z.string().trim().min(1, 'reason_required').max(200) }), form);
  if (!parsed.ok) return { errors: parsed.errors };
  const { supabase, tenancy } = await staffTenancy(parsed.data.tenancy_id);
  if (!tenancy) return { errors: { _form: 'not_allowed' } };
  let photo: string | null = null;
  const file = form.get('photo');
  if (hasFile(file)) {
    const up = await uploadFile('tenancy-photos', tenancy.id, file, ALLOW.image);
    if (!up.ok) return { errors: { photo: up.error } };
    photo = up.path;
  }
  const { error } = await supabase
    .from('deposit_transactions')
    .insert({ tenancy_id: tenancy.id, type: 'deduction', amount_paise: parsed.data.amount_paise, reason: parsed.data.reason, photo_path: photo });
  if (error) return dbError(error);
  refresh(tenancy.id);
  return { ok: true, message: 'common.saved' };
}

export async function removeDeduction(form: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.from('deposit_transactions').delete().eq('id', String(form.get('id'))).eq('type', 'deduction').select('tenancy_id, photo_path');
  if (data?.[0]) {
    if (data[0].photo_path) await removeFiles('tenancy-photos', [data[0].photo_path]);
    refresh(data[0].tenancy_id);
  }
}

export async function addAdvanceReceived(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(z.object({ tenancy_id: z.uuid(), amount_paise: positiveRupees }), form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase
    .from('deposit_transactions')
    .insert({ tenancy_id: parsed.data.tenancy_id, type: 'received', amount_paise: parsed.data.amount_paise, reason: 'Advance (recorded at move-out)' });
  if (error) return dbError(error);
  refresh(parsed.data.tenancy_id);
  return { ok: true, message: 'common.saved' };
}

export async function shareSettlement(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get('tenancy_id'));
  const supabase = await createClient();
  const { error } = await supabase.rpc('share_settlement', { p_tenancy_id: id });
  if (error) return dbError(error);
  refresh(id);
  return { ok: true, message: 'moveOut.sharedOk' };
}

export async function reopenSettlement(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get('tenancy_id'));
  const supabase = await createClient();
  const { error } = await supabase.rpc('reopen_settlement', { p_tenancy_id: id });
  if (error) return dbError(error);
  refresh(id);
  return { ok: true, message: 'common.saved' };
}

export async function settleMoveOut(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(
    z.object({
      tenancy_id: z.uuid(),
      refund_date: isoDate,
      refund_method: z.enum(['upi', 'cash', 'bank_transfer', 'other']),
      refund_reference: optionalText(80),
    }),
    form,
  );
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase.rpc('settle_move_out', {
    p_tenancy_id: parsed.data.tenancy_id,
    p_refund_date: parsed.data.refund_date,
    p_method: parsed.data.refund_method,
    p_reference: parsed.data.refund_reference,
  });
  if (error) return dbError(error);
  refresh(parsed.data.tenancy_id);
  revalidatePath('/owner', 'layout');
  return { ok: true, message: 'moveOut.settledOk' };
}

export async function respondSettlement(_: ActionState, form: FormData): Promise<ActionState> {
  const accept = form.get('decision') === 'accept';
  const note = String(form.get('note') ?? '').trim();
  if (!accept && !note) return { errors: { note: 'reason_required' } };
  const supabase = await createClient();
  const { error } = await supabase.rpc('respond_settlement', { p_tenancy_id: String(form.get('tenancy_id')), p_accept: accept, p_note: note || undefined });
  if (error) return dbError(error);
  revalidatePath('/tenant', 'layout');
  return { ok: true, message: 'common.saved' };
}
