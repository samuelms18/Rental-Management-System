'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  consentSchema,
  documentSchema,
  noticeSchema,
  occupantSchema,
  parseForm,
  rentRevisionSchema,
  tenancySchema,
  tenantSchema,
  verifyDocumentSchema,
  z,
} from '@fpm/validation';
import { todayIST } from '@fpm/api';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { dbError } from '@/lib/db-errors';
import { env } from '@/lib/env';
import { ALLOW, hasFile, removeFiles, uploadFile } from '@/lib/files';
import type { ActionState } from '@/lib/action-state';

const PRIVACY_NOTICE_VERSION = 'v1-2026-10';

/** Create (or re-use) the tenant's login and email them a set-password link. Staff-checked by caller. */
async function inviteTenant(tenantId: string, email: string, fullName: string, phone: string, language: string) {
  const admin = createAdminClient();
  let userId: string | null = null;
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, phone },
    redirectTo: `${env.siteUrl()}/auth/set-password`,
  });
  if (data?.user) {
    userId = data.user.id;
  } else if (error) {
    // Already has an account (e.g. a returning tenant): link it and send a reset link instead.
    const { data: existing } = await admin.from('profiles').select('id, app_role').eq('email', email).maybeSingle();
    if (!existing || existing.app_role === 'staff') return { ok: false as const };
    userId = existing.id;
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${env.siteUrl()}/auth/set-password` });
  }
  if (!userId) return { ok: false as const };
  await admin.from('profiles').update({ preferred_language: language as 'en', full_name: fullName, phone }).eq('id', userId);
  await admin.from('tenants').update({ user_id: userId }).eq('id', tenantId);
  return { ok: true as const };
}

export async function saveTenant(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(tenantSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const id = form.get('id');
  const { preferred_language, ...rest } = parsed.data;
  const values = {
    ...rest,
    permanent_address: rest.permanent_address ?? null,
    emergency_contact_name: rest.emergency_contact_name ?? null,
    emergency_contact_phone: rest.emergency_contact_phone ?? null,
  };
  if (typeof id === 'string' && id) {
    const { error } = await supabase.from('tenants').update(values).eq('id', id);
    if (error) return dbError(error);
    redirect(`/owner/tenants/${id}`);
  }
  const { data, error } = await supabase.from('tenants').insert(values).select('id').single();
  if (error) return dbError(error);
  if (form.get('invite') === 'on') {
    await inviteTenant(data.id, values.email, values.full_name, values.phone, preferred_language);
  }
  const next = form.get('next');
  redirect(typeof next === 'string' && next.startsWith('/owner/') ? `${next}${next.includes('?') ? '&' : '?'}tenant=${data.id}` : `/owner/tenants/${data.id}`);
}

export async function resendInvite(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get('id'));
  const supabase = await createClient();
  // RLS: only staff who can see this tenant get a row back.
  const { data: tenant } = await supabase.from('tenants').select('id, email, full_name, phone, user_id').eq('id', id).maybeSingle();
  if (!tenant) return { errors: { _form: 'not_allowed' } };
  const language = String(form.get('language') ?? 'en');
  const res = await inviteTenant(tenant.id, tenant.email, tenant.full_name, tenant.phone, language);
  if (!res.ok) return { errors: { _form: 'generic' } };
  revalidatePath(`/owner/tenants/${id}`);
  return { ok: true, message: 'tenants.invited', messageValues: { email: tenant.email } };
}

export async function createTenancy(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(tenancySchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const d = parsed.data;
  const { data, error } = await supabase
    .from('tenancies')
    .insert({
      house_id: d.house_id,
      tenant_id: d.tenant_id,
      start_date: d.start_date,
      expected_end_date: d.expected_end_date ?? null,
      advance_paise: d.advance_paise,
      notice_period_days: d.notice_period_days,
      rent_due_day: d.rent_due_day,
    })
    .select('id')
    .single();
  if (error) return dbError(error);
  const { error: revError } = await supabase
    .from('rent_revisions')
    .insert({ tenancy_id: data.id, amount_paise: d.rent_paise, effective_from: d.start_date, reason: 'Starting rent' });
  if (revError) return dbError(revError);
  redirect(`/owner/tenancies/${data.id}`);
}

export async function setTenancyStatus(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(
    z.object({ id: z.uuid(), status: z.enum(['pending_agreement', 'cancelled', 'active', 'completed']) }),
    form,
  );
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const update: { status: typeof parsed.data.status; actual_end_date?: string } = { status: parsed.data.status };
  if (parsed.data.status === 'active') update.actual_end_date = undefined;
  const { error } = await supabase.from('tenancies').update(update).eq('id', parsed.data.id);
  if (error) return dbError(error);
  revalidatePath(`/owner/tenancies/${parsed.data.id}`);
  return { ok: true, message: 'common.saved' };
}

/** "Agreement signed offline": upload the paper agreement, then activate. */
export async function activateOffline(_: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get('id'));
  const supabase = await createClient();
  const { data: tenancy } = await supabase.from('tenancies').select('id, status, house_id').eq('id', id).maybeSingle();
  if (!tenancy) return { errors: { _form: 'not_allowed' } };
  const file = form.get('agreement');
  if (!hasFile(file)) return { errors: { agreement: 'file_required' } };
  const up = await uploadFile('agreements', tenancy.id, file, ALLOW.imageOrPdf);
  if (!up.ok) return { errors: { agreement: up.error } };
  if (tenancy.status === 'draft') {
    const { error } = await supabase.from('tenancies').update({ status: 'pending_agreement' }).eq('id', id);
    if (error) return dbError(error);
  }
  const { error } = await supabase.from('tenancies').update({ status: 'active', offline_agreement_path: up.path }).eq('id', id);
  if (error) {
    await removeFiles('agreements', [up.path]);
    return dbError(error);
  }
  revalidatePath(`/owner/tenancies/${id}`);
  return { ok: true, message: 'common.saved' };
}

export async function giveNotice(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(noticeSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase
    .from('tenancies')
    .update({ status: 'notice_period', actual_end_date: parsed.data.actual_end_date })
    .eq('id', parsed.data.tenancy_id);
  if (error) return dbError(error);
  revalidatePath(`/owner/tenancies/${parsed.data.tenancy_id}`);
  return { ok: true, message: 'common.saved' };
}

export async function addRentRevision(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(rentRevisionSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase.from('rent_revisions').insert({ ...parsed.data, reason: parsed.data.reason ?? null });
  if (error) return error.code === '23505' ? { errors: { effective_from: 'duplicate' } } : dbError(error);
  revalidatePath(`/owner/tenancies/${parsed.data.tenancy_id}`);
  return { ok: true, message: 'common.saved' };
}

export async function addOccupant(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(occupantSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { error } = await supabase.from('occupants').insert({
    ...parsed.data,
    relationship: parsed.data.relationship ?? null,
    age: parsed.data.age ?? null,
    phone: parsed.data.phone ?? null,
    start_date: parsed.data.start_date ?? todayIST(),
  });
  if (error) return dbError(error);
  revalidatePath('/owner/tenancies/[id]', 'page');
  revalidatePath('/tenant/occupants');
  return { ok: true, message: 'common.saved' };
}

export async function endOccupant(form: FormData) {
  const supabase = await createClient();
  await supabase.from('occupants').update({ end_date: todayIST() }).eq('id', String(form.get('id')));
  revalidatePath('/owner/tenancies/[id]', 'page');
  revalidatePath('/tenant/occupants');
}

/** Upload an ID (staff or tenant). Only the last 4 characters of the number ever reach the server. */
export async function uploadDocument(_: ActionState, form: FormData): Promise<ActionState> {
  form.set('owner_type', 'tenant'); // resolved below from the chosen person
  const parsed = parseForm(documentSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { data: tenancy } = await supabase.from('tenancies').select('id, tenant_id').eq('id', parsed.data.tenancy_id).maybeSingle();
  if (!tenancy) return { errors: { _form: 'not_allowed' } };
  // The ID must belong to this tenancy's tenant or one of its occupants.
  let ownerType: 'tenant' | 'occupant' | 'domestic_help' = 'tenant';
  if (parsed.data.owner_id !== tenancy.tenant_id) {
    const { data: occ } = await supabase.from('occupants').select('id').eq('id', parsed.data.owner_id).eq('tenancy_id', tenancy.id).maybeSingle();
    const { data: help } = occ
      ? { data: null }
      : await supabase.from('domestic_help').select('id').eq('id', parsed.data.owner_id).eq('tenancy_id', tenancy.id).maybeSingle();
    if (!occ && !help) return { errors: { _form: 'not_allowed' } };
    ownerType = occ ? 'occupant' : 'domestic_help';
  }
  const front = form.get('front');
  if (!hasFile(front)) return { errors: { front: 'file_required' } };
  const upFront = await uploadFile('identity-docs', tenancy.id, front, ALLOW.imageOrPdf);
  if (!upFront.ok) return { errors: { front: upFront.error } };
  let backPath: string | null = null;
  const back = form.get('back');
  if (hasFile(back)) {
    const upBack = await uploadFile('identity-docs', tenancy.id, back, ALLOW.imageOrPdf);
    if (!upBack.ok) {
      await removeFiles('identity-docs', [upFront.path]);
      return { errors: { back: upBack.error } };
    }
    backPath = upBack.path;
  }
  const { error } = await supabase.from('identity_documents').insert({
    tenancy_id: tenancy.id,
    owner_type: ownerType,
    owner_id: parsed.data.owner_id,
    doc_type: parsed.data.doc_type,
    number_last4: parsed.data.number_last4 ?? null,
    expiry_date: parsed.data.expiry_date ?? null,
    front_path: upFront.path,
    back_path: backPath,
  });
  if (error) {
    await removeFiles('identity-docs', [upFront.path, ...(backPath ? [backPath] : [])]);
    return dbError(error);
  }
  revalidatePath('/owner/tenancies/[id]', 'page');
  revalidatePath('/tenant/documents');
  return { ok: true, message: 'common.saved' };
}

export async function verifyDocument(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(verifyDocumentSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('identity_documents')
    .update({ verification: parsed.data.verification, rejection_reason: parsed.data.rejection_reason ?? null })
    .eq('id', parsed.data.id)
    .select('tenancy_id')
    .single();
  if (error) return dbError(error);
  if (parsed.data.verification === 'rejected') {
    const admin = createAdminClient();
    const { data: t } = await admin.from('tenancies').select('tenants(user_id)').eq('id', data.tenancy_id).single();
    const uid = t?.tenants?.user_id;
    if (uid) {
      await admin.from('notifications').insert({
        user_id: uid,
        kind: 'document_rejected',
        params: { reason: parsed.data.rejection_reason ?? '' },
        link: '/tenant/documents',
      });
    }
  }
  revalidatePath('/owner/tenancies/[id]', 'page');
  return { ok: true, message: 'common.saved' };
}

export async function acceptConsent(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = parseForm(consentSchema, form);
  if (!parsed.ok) return { errors: parsed.errors };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { data: tenant } = await supabase.from('tenants').select('id').eq('user_id', auth.user?.id ?? '').maybeSingle();
  if (!tenant) return { errors: { _form: 'not_allowed' } };
  const language = String(form.get('language') ?? 'en');
  const { error } = await supabase.from('consents').insert({
    tenant_id: tenant.id,
    purpose: 'tenancy_records_and_identity_documents',
    notice_version: PRIVACY_NOTICE_VERSION,
    language: (['en', 'ta', 'hi', 'ml'].includes(language) ? language : 'en') as 'en',
  });
  if (error) return dbError(error);
  redirect('/tenant');
}
