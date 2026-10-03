import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@fpm/types';
import { env } from '@/lib/env';

/**
 * Service-role client. Bypasses RLS — use ONLY after the caller's access has been checked with the
 * user's own client (createClient from ./server). Never import this from client components.
 */
export function createAdminClient() {
  return createClient<Database>(env.supabaseUrl(), env.serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
