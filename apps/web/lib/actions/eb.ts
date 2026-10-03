'use server';

import { revalidatePath } from 'next/cache';
import { ebAccountSchema, ebBillSchema, ownerEbPaymentSchema, parseForm } from '@fpm/validation';
import { createClient } from '@/lib/supabase/server';
import { dbError } from '@/lib/db-errors';
import type { ActionState } from '@/lib/action-state';

export async function saveEbAccount(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(ebAccountSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const values = {
    ...parsed.data,
    consumer_name: parsed.data.consumer_name ?? null,
    meter_number: parsed.data.meter_number ?? null,
  };
  const { data: existing } = await supabase.from('eb_accounts').select('id').eq('house_id', values.house_id).maybeSingle();
  const { error } = existing
    ? await supabase.from('eb_accounts').update(values).eq('id', existing.id)
    : await supabase.from('eb_accounts').insert(values);
  if (error) return dbError(error);
  revalidatePath(`/owner/houses/${values.house_id}`);
  revalidatePath('/owner/eb');
  return { ok: true, message: 'common.saved' };
}

export async function addEbBill(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(ebBillSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { data: account } = await supabase.from('eb_accounts').select('id, house_id').eq('id', parsed.data.eb_account_id).maybeSingle();
  if (!account) return { errors: { _form: 'not_allowed' } };
  const { error } = await supabase.from('eb_bills').insert({
    ...parsed.data,
    house_id: account.house_id,
    units: parsed.data.units ?? null,
    bill_date: parsed.data.bill_date ?? null,
  });
  if (error) return error.code === '23505' ? { errors: { period_start: 'duplicate' } } : dbError(error);
  revalidatePath('/owner/eb');
  return { ok: true, message: 'common.saved' };
}

export async function recordOwnerEbPayment(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(ownerEbPaymentSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase.rpc('record_owner_eb_payment', {
    p_bill_id: parsed.data.bill_id,
    p_paid_on: parsed.data.paid_on,
    p_reimburse_due: parsed.data.reimburse_due,
  });
  if (error) return dbError(error);
  revalidatePath('/owner/eb');
  return { ok: true, message: 'common.saved' };
}
