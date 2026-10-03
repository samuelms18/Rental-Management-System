'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { complaintSchema, complaintUpdateSchema, expenseSchema, parseForm, reopenSchema, z } from '@fpm/validation';
import { createClient } from '@/lib/supabase/server';
import { dbError } from '@/lib/db-errors';
import { ALLOW, hasFile, removeFiles, uploadFile } from '@/lib/files';
import type { ActionState } from '@/lib/action-state';

function refresh() {
  revalidatePath('/owner', 'layout');
  revalidatePath('/tenant', 'layout');
}

async function attachMedia(supabase: Awaited<ReturnType<typeof createClient>>, complaintId: string, tenancyId: string, form: FormData) {
  for (const file of form.getAll('media').filter(hasFile)) {
    const up = await uploadFile('complaint-media', tenancyId, file, ALLOW.media);
    if (!up.ok) return up.error;
    const { error } = await supabase
      .from('complaint_media')
      .insert({ complaint_id: complaintId, path: up.path, kind: up.kind === 'mp4' ? 'video' : 'image' });
    if (error) {
      await removeFiles('complaint-media', [up.path]);
      return 'generic';
    }
  }
  return null;
}

export async function raiseComplaint(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(complaintSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('complaints')
    .insert({ ...parsed.data, description: parsed.data.description ?? null })
    .select('id')
    .single();
  if (error) return dbError(error);
  const mediaError = await attachMedia(supabase, data.id, parsed.data.tenancy_id, form);
  refresh();
  if (mediaError) return { errors: { media: mediaError } };
  const back = String(form.get('back') ?? '/tenant/complaints');
  redirect(`${back}/${data.id}`);
}

export async function addComplaintMedia(_: ActionState, form: FormData): Promise<ActionState> {
  const id = z.uuid().safeParse(form.get('id'));
  if (!id.success) return { errors: { _form: 'invalid' } };
  const supabase = await createClient();
  const { data: c } = await supabase.from('complaints').select('id, tenancy_id').eq('id', id.data).maybeSingle();
  if (!c) return { errors: { _form: 'not_allowed' } };
  const err = await attachMedia(supabase, c.id, c.tenancy_id, form);
  if (err) return { errors: { media: err } };
  refresh();
  return { ok: true, message: 'common.saved' };
}

export async function updateComplaint(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(complaintUpdateSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const d = parsed.data;
  const { error } = await supabase.rpc('update_complaint', {
    p_complaint_id: d.id,
    p_status: d.status,
    p_note: d.note,
    p_assigned_name: d.assigned_name,
    p_assigned_phone: d.assigned_phone,
    p_resolution_note: d.resolution_note,
    p_resolution_cost_paise: d.resolution_cost_paise,
  });
  if (error) return dbError(error);
  refresh();
  return { ok: true, message: 'common.saved' };
}

export async function confirmComplaint(_: ActionState, form: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('confirm_complaint', { p_complaint_id: String(form.get('id')) });
  if (error) return dbError(error);
  refresh();
  return { ok: true, message: 'common.saved' };
}

export async function reopenComplaint(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(reopenSchema, form);
  if (!parsed.ok) return { errors: { reason: 'reason_required' } };
  const supabase = await createClient();
  const { error } = await supabase.rpc('reopen_complaint', { p_complaint_id: parsed.data.id, p_reason: parsed.data.reason });
  if (error) return dbError(error);
  refresh();
  return { ok: true, message: 'common.saved' };
}

export async function addExpense(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(expenseSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { data: property } = await supabase.from('properties').select('id').eq('id', parsed.data.property_id).maybeSingle();
  if (!property) return { errors: { _form: 'not_allowed' } };
  let receiptPath: string | null = null;
  const file = form.get('receipt');
  if (hasFile(file)) {
    const up = await uploadFile('expense-receipts', property.id, file, ALLOW.imageOrPdf);
    if (!up.ok) return { errors: { receipt: up.error } };
    receiptPath = up.path;
  }
  const { error } = await supabase.from('expenses').insert({
    ...parsed.data,
    house_id: parsed.data.house_id ?? null,
    notes: parsed.data.notes ?? null,
    receipt_path: receiptPath,
  });
  if (error) {
    if (receiptPath) await removeFiles('expense-receipts', [receiptPath]);
    return dbError(error);
  }
  revalidatePath('/owner/expenses');
  return { ok: true, message: 'common.saved' };
}
