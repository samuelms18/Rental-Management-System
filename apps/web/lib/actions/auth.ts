'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { setLocaleCookie } from '@/lib/locale-cookie';
import { env } from '@/lib/env';
import type { ActionState } from '@/lib/action-state';

const loginSchema = z.object({ email: z.email(), password: z.string().min(1) });

export async function signIn(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { errors: { _form: 'wrong_credentials' } };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { errors: { _form: error?.status === 429 ? 'rate_limited' : 'wrong_credentials' } };
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('app_role, preferred_language, disabled_at')
    .eq('id', data.user.id)
    .single();
  if (profile?.disabled_at) {
    await supabase.auth.signOut();
    redirect('/login?error=disabled');
  }
  await setLocaleCookie(profile?.preferred_language);
  redirect(profile?.app_role === 'staff' ? '/mfa' : '/tenant');
}

export async function signOut(form?: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: form?.get('scope') === 'global' ? 'global' : 'local' });
  redirect('/login');
}

export async function requestPasswordReset(_: ActionState, form: FormData): Promise<ActionState> {
  const email = z.email().safeParse(form.get('email'));
  if (!email.success) return { errors: { email: 'invalid_email' } };
  const supabase = await createClient();
  // Same answer whether or not the account exists.
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${env.siteUrl()}/auth/set-password` });
  return { ok: true, message: 'auth.resetSent' };
}

const passwordSchema = z
  .object({ password: z.string().min(8, 'invalid'), confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'mismatch' });

export async function setPassword(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { errors: { [String(issue?.path[0] ?? '_form')]: issue?.message === 'mismatch' ? 'passwordMismatch' : 'invalid' } };
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { errors: { _form: 'generic' }, detail: error.message };
  redirect('/');
}

export async function setLanguage(locale: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    await supabase.from('profiles').update({ preferred_language: locale as 'en' }).eq('id', data.user.id);
  }
  await setLocaleCookie(locale);
}
