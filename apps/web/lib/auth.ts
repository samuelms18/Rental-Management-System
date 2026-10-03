import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type Viewer = Awaited<ReturnType<typeof loadViewer>>;

const loadViewer = cache(async () => {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return {
    user,
    profile,
    isStaffRole: profile?.app_role === 'staff',
    aal: aal?.currentLevel ?? 'aal1',
    hasMfaFactor: aal?.nextLevel === 'aal2',
  };
});

export const getViewer = loadViewer;

/** Owner/manager pages: signed in, staff role, 2FA passed. */
export async function requireStaff() {
  const viewer = await loadViewer();
  if (!viewer || !viewer.profile) redirect('/login');
  if (viewer.profile.disabled_at) redirect('/login?error=disabled');
  if (!viewer.isStaffRole) redirect('/tenant');
  if (viewer.aal !== 'aal2') redirect('/mfa');
  const supabase = await createClient();
  const { data: memberships } = await supabase
    .from('property_members')
    .select('property_id, role')
    .eq('user_id', viewer.user.id);
  const isOwner = (memberships ?? []).some((m) => m.role === 'owner');
  return { ...viewer, profile: viewer.profile, supabase, memberships: memberships ?? [], isOwner };
}

/** Tenant pages: signed in as tenant with an open tenancy; privacy consent before anything else. */
export async function requireTenant({ allowWithoutConsent = false } = {}) {
  const viewer = await loadViewer();
  if (!viewer || !viewer.profile) redirect('/login');
  if (viewer.profile.disabled_at) redirect('/login?error=disabled');
  if (viewer.isStaffRole) redirect('/owner');
  const supabase = await createClient();
  const { data: tenant } = await supabase.from('tenants').select('*').eq('user_id', viewer.user.id).maybeSingle();
  const { data: tenancy } = await supabase
    .from('tenancies')
    .select('*, houses(id, unit_number, floor, unit_type, bedrooms, bathrooms, property_id, properties(id, name, address_line, city))')
    .in('status', ['active', 'notice_period', 'pending_agreement', 'draft'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  let hasConsent = false;
  if (tenant) {
    const { count } = await supabase.from('consents').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.id);
    hasConsent = (count ?? 0) > 0;
  }
  if (tenant && !hasConsent && !allowWithoutConsent) redirect('/tenant/consent');
  return { ...viewer, profile: viewer.profile, supabase, tenant, tenancy, hasConsent };
}
