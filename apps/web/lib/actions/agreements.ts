'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { isoDate, parseForm, positiveRupees, rupees, z } from '@fpm/validation';
import { todayIST } from '@fpm/api';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dbError } from '@/lib/db-errors';
import { ALLOW, hasFile, uploadFile } from '@/lib/files';
import { fillAgreement } from '@/lib/agreement-text';
import { renderAgreementPdf } from '@/lib/agreement-pdf';
import type { ActionState } from '@/lib/action-state';

function refresh(id?: string) {
  revalidatePath('/owner/agreements');
  if (id) revalidatePath(`/owner/agreements/${id}`);
  revalidatePath('/tenant/agreement');
}

const createSchema = z
  .object({
    tenancy_id: z.uuid(),
    template_id: z.uuid(),
    start_date: isoDate,
    end_date: isoDate,
    rent_paise: positiveRupees,
    advance_paise: rupees.default(0),
    renewal_of: z.preprocess((v) => (v === '' ? undefined : v), z.uuid().optional()),
  })
  .refine((v) => v.end_date > v.start_date, { path: ['end_date'], message: 'end_after_start' });

export async function createAgreement(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(createSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const d = parsed.data;
  const supabase = await createClient();
  const [{ data: ty }, { data: tpl }] = await Promise.all([
    supabase
      .from('tenancies')
      .select('id, notice_period_days, rent_due_day, tenants(full_name), houses(unit_number, property_id, properties(name, address_line, city, state, pin))')
      .eq('id', d.tenancy_id)
      .maybeSingle(),
    supabase.from('agreement_templates').select('*').eq('id', d.template_id).maybeSingle(),
  ]);
  if (!ty || !tpl || !ty.houses) return { errors: { _form: 'not_allowed' } };
  const [{ data: payee }, { data: occupants }] = await Promise.all([
    supabase.from('payee_settings').select('payee_name, upi_id').eq('property_id', ty.houses.property_id).maybeSingle(),
    supabase.from('occupants').select('name, relationship').eq('tenancy_id', ty.id).is('end_date', null),
  ]);
  const p = ty.houses.properties;
  const data = {
    owner_name: payee?.payee_name ?? 'Owner',
    owner_upi: payee?.upi_id ?? '',
    tenant_name: ty.tenants?.full_name ?? '',
    property_address: [p?.name, p?.address_line, p?.city, p?.state, p?.pin].filter(Boolean).join(', '),
    house_unit: ty.houses.unit_number,
    rent_paise: d.rent_paise,
    advance_paise: d.advance_paise,
    start_date: d.start_date,
    end_date: d.end_date,
    notice_days: ty.notice_period_days,
    due_day: ty.rent_due_day,
    occupants: (occupants ?? []).map((o) => (o.relationship ? `${o.name} (${o.relationship})` : o.name)),
    agreement_date: todayIST(),
  };
  const { data: agreement, error } = await supabase
    .from('agreements')
    .insert({
      tenancy_id: d.tenancy_id,
      template_id: d.template_id,
      start_date: d.start_date,
      end_date: d.end_date,
      rent_paise: d.rent_paise,
      advance_paise: d.advance_paise,
      renewal_of: d.renewal_of ?? null,
    })
    .select('id')
    .single();
  if (error) return dbError(error);
  const { error: vErr } = await supabase
    .from('agreement_versions')
    .insert({ agreement_id: agreement.id, body_text: fillAgreement(tpl.body_markdown, data), data_snapshot: { ...data, template_version: tpl.version } });
  if (vErr) return dbError(vErr);
  redirect(`/owner/agreements/${agreement.id}`);
}

/** Editing the text creates a new version (old signatures stop counting). */
export async function editAgreementText(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(z.object({ id: z.uuid(), body_text: z.string().trim().min(50).max(60000) }), form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { data: current } = await supabase
    .from('agreements')
    .select('id, agreement_versions!agreements_current_version_fk(data_snapshot)')
    .eq('id', parsed.data.id)
    .maybeSingle();
  if (!current) return { errors: { _form: 'not_allowed' } };
  const { error } = await supabase.from('agreement_versions').insert({
    agreement_id: parsed.data.id,
    body_text: parsed.data.body_text,
    data_snapshot: current.agreement_versions?.data_snapshot ?? {},

  });
  if (error) return dbError(error);
  refresh(parsed.data.id);
  return { ok: true, message: 'common.saved' };
}

export async function generateAgreementPdf(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get('id'));
  const supabase = await createClient();
  const { data: a } = await supabase.from('agreements').select('id, tenancy_id, current_version_id, status').eq('id', id).maybeSingle();
  if (!a || !a.current_version_id) return { errors: { _form: 'not_allowed' } };
  const { data: v } = await supabase.from('agreement_versions').select('*').eq('id', a.current_version_id).single();
  if (!v) return { errors: { _form: 'not_allowed' } };
  const bytes = await renderAgreementPdf({ body: v.body_text, versionNo: v.version_no });
  const path = `${a.tenancy_id}/agreement-${a.id}-v${v.version_no}.pdf`;
  const { error: upErr } = await createAdminClient().storage.from('agreements').upload(path, bytes, { contentType: 'application/pdf', upsert: true });
  if (upErr) return { errors: { _form: 'generic' }, detail: upErr.message };
  const { error } = await supabase.from('agreement_versions').update({ rendered_pdf_path: path }).eq('id', v.id);
  if (error) return dbError(error);
  const { error: mErr } = await supabase.rpc('mark_agreement_generated', { p_id: a.id });
  if (mErr) return dbError(mErr);
  refresh(id);
  return { ok: true, message: 'common.saved' };
}

export async function sendAgreement(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get('id'));
  const supabase = await createClient();
  const { error } = await supabase.rpc('send_agreement', { p_id: id });
  if (error) return dbError(error);
  refresh(id);
  return { ok: true, message: 'agreements.sentOk' };
}

export async function approveAgreement(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get('id'));
  const supabase = await createClient();
  const { error } = await supabase.rpc('approve_agreement', { p_id: id });
  if (error) return dbError(error);
  refresh(id);
  revalidatePath('/owner', 'layout');
  return { ok: true, message: 'common.saved' };
}

export async function terminateAgreement(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(z.object({ id: z.uuid(), reason: z.string().trim().min(1, 'reason_required') }), form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase.rpc('terminate_agreement', { p_id: parsed.data.id, p_reason: parsed.data.reason });
  if (error) return dbError(error);
  refresh(parsed.data.id);
  return { ok: true, message: 'common.saved' };
}

export async function uploadStampedCopy(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get('id'));
  const supabase = await createClient();
  const { data: a } = await supabase.from('agreements').select('id, tenancy_id, status').eq('id', id).maybeSingle();
  if (!a) return { errors: { _form: 'not_allowed' } };
  const file = form.get('stamped');
  if (!hasFile(file)) return { errors: { stamped: 'file_required' } };
  const up = await uploadFile('agreements', a.tenancy_id, file, ALLOW.imageOrPdf);
  if (!up.ok) return { errors: { stamped: up.error } };
  const { error } = await supabase.from('agreements').update({ final_stamped_path: up.path }).eq('id', id);
  if (error) return dbError(error);
  refresh(id);
  return { ok: true, message: 'common.saved' };
}

export async function saveTemplate(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(
    z.object({
      id: z.preprocess((v) => (v === '' ? undefined : v), z.uuid().optional()),
      name: z.string().trim().min(1, 'required').max(120),
      body_markdown: z.string().trim().min(50, 'required').max(60000),
      reviewed_by_note: z.string().trim().max(500).optional(),
      is_active: z.preprocess((v) => v === 'on', z.boolean()),
    }),
    form,
  );
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { id, ...values } = parsed.data;
  if (id) {
    const { data: old } = await supabase.from('agreement_templates').select('version').eq('id', id).single();
    const { error } = await supabase
      .from('agreement_templates')
      .update({ ...values, reviewed_by_note: values.reviewed_by_note ?? null, version: (old?.version ?? 1) + 1 })
      .eq('id', id);
    if (error) return dbError(error);
    revalidatePath('/owner/agreements/templates');
    return { ok: true, message: 'common.saved' };
  }
  const { data, error } = await supabase.from('agreement_templates').insert({ ...values, reviewed_by_note: values.reviewed_by_note ?? null }).select('id').single();
  if (error) return dbError(error);
  redirect(`/owner/agreements/templates/${data.id}`);
}

// ---------------- Tenant ----------------

export async function markAgreementViewed(id: string) {
  const supabase = await createClient();
  await supabase.rpc('view_agreement', { p_id: id });
}

/** Tenant signs: a drawn signature (PNG data URL) or an uploaded signed PDF/photo. */
export async function signAgreement(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get('id'));
  const supabase = await createClient();
  const { data: a } = await supabase.from('agreements').select('id, tenancy_id, status').eq('id', id).maybeSingle();
  if (!a) return { errors: { _form: 'not_allowed' } };
  if (form.get('accept') !== 'on') return { errors: { accept: 'consent_required' } };

  let method: 'drawn' | 'uploaded_pdf';
  let path: string;
  const drawn = String(form.get('signature') ?? '');
  const upload = form.get('signed_file');
  if (drawn.startsWith('data:image/png;base64,')) {
    const bytes = Uint8Array.from(atob(drawn.slice('data:image/png;base64,'.length)), (c) => c.charCodeAt(0));
    if (bytes.length < 500 || bytes.length > 500_000) return { errors: { signature: 'signature_required' } };
    const file = new File([bytes], 'signature.png', { type: 'image/png' });
    const up = await uploadFile('agreements', `${a.tenancy_id}/signatures`, file, ALLOW.image);
    if (!up.ok) return { errors: { signature: up.error } };
    method = 'drawn';
    path = up.path;
  } else if (hasFile(upload)) {
    const up = await uploadFile('agreements', `${a.tenancy_id}/signatures`, upload, ALLOW.imageOrPdf);
    if (!up.ok) return { errors: { signed_file: up.error } };
    method = 'uploaded_pdf';
    path = up.path;
  } else {
    return { errors: { signature: 'signature_required' } };
  }
  const h = await headers();
  const { error } = await supabase.rpc('sign_agreement', {
    p_id: id,
    p_method: method,
    p_image_path: path,
    p_ip: h.get('cf-connecting-ip') ?? h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? undefined,
    p_user_agent: h.get('user-agent')?.slice(0, 300) ?? undefined,
  });
  if (error) return dbError(error);
  refresh(id);
  return { ok: true, message: 'agreements.signedOk' };
}
