#!/usr/bin/env node
// One-time setup for PRODUCTION: creates the first property, the Owner (father) and the two Managers,
// and emails each of them a set-password link. Run once from your computer:
//
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... SITE_URL=https://your-app \
//   PROPERTY_NAME="Family Houses" PROPERTY_CITY=Chennai \
//   OWNER_EMAIL=father@gmail.com OWNER_NAME="Father's name" \
//   MANAGER_EMAILS="samuel@gmail.com,brother@gmail.com" MANAGER_NAMES="Samuel,Brother" \
//   node scripts/bootstrap-staff.mjs
//
// Safe to re-run: existing users/property are reused.
import { createClient } from '@supabase/supabase-js';

const env = (k, required = true) => {
  const v = process.env[k];
  if (required && !v) {
    console.error(`Missing ${k}`);
    process.exit(1);
  }
  return v;
};

const url = env('SUPABASE_URL');
const key = env('SUPABASE_SERVICE_ROLE_KEY');
const site = env('SITE_URL');
const admin = createClient(url, key, { auth: { persistSession: false } });

async function ensureUser(email, fullName) {
  const { data: existing } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
  let id = existing?.id;
  if (!id) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${site}/auth/set-password`,
    });
    if (error) throw error;
    id = data.user.id;
    console.log(`Invited ${email}`);
  } else {
    console.log(`Exists ${email}`);
  }
  const { error } = await admin.from('profiles').update({ app_role: 'staff', full_name: fullName }).eq('id', id);
  if (error) throw error;
  return id;
}

const ownerId = await ensureUser(env('OWNER_EMAIL'), env('OWNER_NAME'));
const managerEmails = (env('MANAGER_EMAILS', false) ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const managerNames = (env('MANAGER_NAMES', false) ?? '').split(',').map((s) => s.trim());
const managerIds = [];
for (const [i, email] of managerEmails.entries()) managerIds.push(await ensureUser(email, managerNames[i] || email));

const name = env('PROPERTY_NAME');
let { data: property } = await admin.from('properties').select('id').eq('name', name).maybeSingle();
if (!property) {
  const { data, error } = await admin
    .from('properties')
    .insert({ name, city: process.env.PROPERTY_CITY ?? '', state: 'Tamil Nadu' })
    .select('id')
    .single();
  if (error) throw error;
  property = data;
  console.log(`Created property ${name}`);
}
const members = [
  { property_id: property.id, user_id: ownerId, role: 'owner' },
  ...managerIds.map((id) => ({ property_id: property.id, user_id: id, role: 'manager' })),
];
const { error } = await admin.from('property_members').upsert(members, { onConflict: 'property_id,user_id' });
if (error) throw error;
console.log('Done. Each person: open the email, set a password, sign in, then set up 2FA.');
