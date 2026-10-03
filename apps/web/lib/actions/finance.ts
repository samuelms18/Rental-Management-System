'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  cashPaymentSchema,
  chargeCancelSchema,
  chargeEditSchema,
  parseForm,
  paymentSubmitSchema,
  positiveRupees,
  isoDate,
  rejectSchema,
  z,
} from '@fpm/validation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dbError } from '@/lib/db-errors';
import { ALLOW, hasFile, removeFiles, uploadFile } from '@/lib/files';
import type { ActionState } from '@/lib/action-state';

function refresh() {
  revalidatePath('/owner', 'layout');
  revalidatePath('/tenant', 'layout');
}

/** Tenant: "I have paid" — amount, date, UTR and screenshot. */
export async function submitPayment(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(paymentSubmitSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { data: tenancy } = await supabase.from('tenancies').select('id').eq('id', parsed.data.tenancy_id).maybeSingle();
  if (!tenancy) return { errors: { _form: 'not_allowed' } };
  const proof = form.get('proof');
  let proofPath: string | null = null;
  if (hasFile(proof)) {
    const up = await uploadFile('payment-proofs', tenancy.id, proof, ALLOW.imageOrPdf);
    if (!up.ok) return { errors: { proof: up.error } };
    proofPath = up.path;
  } else if (parsed.data.paid_to === 'tneb') {
    return { errors: { proof: 'file_required' } };
  }
  const { error } = await supabase.from('payments').insert({
    tenancy_id: tenancy.id,
    charge_id: parsed.data.charge_id ?? null,
    amount_paise: parsed.data.amount_paise,
    paid_on: parsed.data.paid_on,
    method: parsed.data.method,
    paid_to: parsed.data.paid_to,
    utr_reference: parsed.data.utr_reference,
    notes: parsed.data.notes ?? null,
    proof_path: proofPath,
  });
  if (error) {
    if (proofPath) await removeFiles('payment-proofs', [proofPath]);
    return dbError(error);
  }
  refresh();
  return { ok: true, message: 'pay.submitted' };
}

export async function approvePayment(_: ActionState, form: FormData): Promise<ActionState> {
  const id = z.uuid().safeParse(form.get('id'));
  if (!id.success) return { errors: { _form: 'invalid' } };
  const supabase = await createClient();
  const { data: receiptId, error } = await supabase.rpc('approve_payment', { p_payment_id: id.data });
  if (error) return dbError(error);
  let number = '';
  if (receiptId) {
    const { data } = await supabase.from('receipts').select('number').eq('id', receiptId).single();
    number = data?.number ?? '';
  }
  refresh();
  redirect(`/owner/payments?approved=${encodeURIComponent(number)}`);
}

export async function rejectPayment(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(rejectSchema, form);
  if (!parsed.ok) return { errors: { reason: parsed.errors.reason ?? 'reason_required' } };
  const supabase = await createClient();
  const { error } = await supabase.rpc('reject_payment', { p_payment_id: parsed.data.id, p_reason: parsed.data.reason });
  if (error) return dbError(error);
  refresh();
  return { ok: true, message: 'common.saved' };
}

export async function reversePayment(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(rejectSchema, form);
  if (!parsed.ok) return { errors: { reason: 'reason_required' } };
  const supabase = await createClient();
  const { error } = await supabase.rpc('reverse_payment', { p_payment_id: parsed.data.id, p_reason: parsed.data.reason });
  if (error) return dbError(error);
  refresh();
  return { ok: true, message: 'common.saved' };
}

export async function recordCash(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(cashPaymentSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase.rpc('record_cash_payment', {
    p_tenancy_id: parsed.data.tenancy_id,
    p_amount_paise: parsed.data.amount_paise,
    p_paid_on: parsed.data.paid_on,
    p_received_by: parsed.data.received_by,
    p_charge_id: parsed.data.charge_id,
    p_notes: parsed.data.notes,
  });
  if (error) return dbError(error);
  refresh();
  return { ok: true, message: 'common.saved' };
}

export async function editCharge(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(chargeEditSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase
    .from('charges')
    .update({ amount_paise: parsed.data.amount_paise, due_date: parsed.data.due_date, notes: parsed.data.notes ?? null })
    .eq('id', parsed.data.id);
  if (error) return dbError(error);
  refresh();
  return { ok: true, message: 'common.saved' };
}

export async function cancelCharge(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(chargeCancelSchema, form);
  if (!parsed.ok) return { errors: { reason: 'reason_required' } };
  const supabase = await createClient();
  const { error } = await supabase
    .from('charges')
    .update({ status: 'cancelled', cancel_reason: parsed.data.reason })
    .eq('id', parsed.data.id);
  if (error) return dbError(error);
  refresh();
  return { ok: true, message: 'common.saved' };
}

export async function addCharge(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(
    z.object({
      tenancy_id: z.uuid(),
      type: z.enum(['rent', 'maintenance', 'water', 'other']),
      amount_paise: positiveRupees,
      period_start: isoDate,
      period_end: isoDate,
      due_date: isoDate,
      notes: z.string().trim().max(300).optional(),
    }),
    form,
  );
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase.from('charges').insert({ ...parsed.data, notes: parsed.data.notes || null });
  if (error) return error.code === '23505' ? { errors: { period_start: 'duplicate' } } : dbError(error);
  refresh();
  return { ok: true, message: 'common.saved' };
}

/** Manual "run now" for the daily rent job (same idempotent function pg_cron calls). */
export async function runRentGeneration(_: ActionState): Promise<ActionState> {
  const supabase = await createClient();
  const { data: isStaff } = await supabase.rpc('is_staff');
  if (!isStaff) return { errors: { _form: 'not_allowed' } };
  const admin = createAdminClient();
  const { data, error } = await admin.rpc('generate_rent_charges', {});
  if (error) return dbError(error);
  await admin.rpc('mark_overdue', {});
  refresh();
  return { ok: true, message: 'rent.generated', messageValues: { count: data ?? 0 } };
}

export async function cancelReceipt(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(rejectSchema, form);
  if (!parsed.ok) return { errors: { reason: 'reason_required' } };
  const supabase = await createClient();
  const { error } = await supabase.rpc('cancel_receipt', { p_receipt_id: parsed.data.id, p_reason: parsed.data.reason, p_reissue: true });
  if (error) return dbError(error);
  refresh();
  return { ok: true, message: 'common.saved' };
}
