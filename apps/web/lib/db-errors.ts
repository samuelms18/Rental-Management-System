import type { PostgrestError } from '@supabase/supabase-js';
import type { ActionState } from '@/lib/action-state';

/** Turn a database error into a translated, user-friendly ActionState. */
export function dbError(error: PostgrestError | { message: string; code?: string } | null): ActionState {
  if (!error) return { errors: { _form: 'generic' } };
  const msg = error.message ?? '';
  const code = 'code' in error ? error.code : undefined;
  if (code === '23505') {
    if (msg.includes('payments_utr_unique')) return { errors: { utr_reference: 'duplicate_utr' } };
    if (msg.includes('tenancies_one_live_per_house')) return { errors: { _form: 'one_live_tenancy' } };
    if (msg.includes('tenants_email_idx')) return { errors: { email: 'duplicate' } };
    return { errors: { _form: 'duplicate' } };
  }
  if (code === '42501' || msg.includes('Not allowed') || msg.includes('row-level security')) {
    return { errors: { _form: 'not_allowed' } };
  }
  if (msg.includes('keep at least one owner')) return { errors: { _form: 'last_owner' } };
  if (msg.includes('cannot remove yourself')) return { errors: { _form: 'remove_self' } };
  // Business-rule exceptions raised by triggers carry a readable message.
  return { errors: { _form: 'generic' }, detail: msg };
}
