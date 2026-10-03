-- LOCAL DEVELOPMENT ONLY. Fake people and numbers. Never run against production.
-- Sign in at http://localhost:3000 with password "password123":
--   owner@example.com (Owner), samuel@example.com / brother@example.com (Managers)
--   ravi@example.com, priya@example.com (Tenants)
-- Staff must set up 2FA on first sign-in (any authenticator app).

create or replace function pg_temp.seed_user(p_id uuid, p_email text, p_name text, p_phone text)
returns void language plpgsql as $$
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change_token_new, email_change)
  values (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
          extensions.crypt('password123', extensions.gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', p_name, 'phone', p_phone),
          now(), now(), '', '', '', '');
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), p_id, p_id::text, 'email',
          jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true), now(), now(), now());
end $$;

select pg_temp.seed_user('00000000-0000-4000-a000-000000000001', 'owner@example.com', 'Appa (Owner)', '9840000001');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000002', 'samuel@example.com', 'Samuel', '9840000002');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000003', 'brother@example.com', 'Brother', '9840000003');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000011', 'ravi@example.com', 'Ravi Kumar', '9840000011');
select pg_temp.seed_user('00000000-0000-4000-a000-000000000012', 'priya@example.com', 'Priya S', '9840000012');

update public.profiles set app_role = 'staff'
where id in ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000003');
update public.profiles set preferred_language = 'ta' where id = '00000000-0000-4000-a000-000000000012';

insert into public.properties (id, name, address_line, city, state, pin)
values ('10000000-0000-4000-a000-000000000001', 'Family Houses', '12 Gandhi Street, Anna Nagar', 'Chennai', 'Tamil Nadu', '600040');
insert into public.property_members (property_id, user_id, role) values
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000001', 'owner'),
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000002', 'manager'),
  ('10000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000003', 'manager');

insert into public.houses (id, property_id, unit_number, floor, unit_type, bedrooms, bathrooms, default_rent_paise, default_advance_paise) values
  ('20000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', 'H01', 'Ground', '2BHK', 2, 1, 1500000, 8000000),
  ('20000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000001', 'H02', 'First', '2BHK', 2, 1, 1500000, 8000000),
  ('20000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000001', 'H03', 'First', '1BHK', 1, 1, 1000000, 5000000),
  ('20000000-0000-4000-a000-000000000004', '10000000-0000-4000-a000-000000000001', 'H04', 'Second', '3BHK', 3, 2, 2200000, 10000000),
  ('20000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000001', 'H05', 'Second', '1BHK', 1, 1, 900000, 4500000);

insert into public.payee_settings (property_id, payee_name, upi_id)
values ('10000000-0000-4000-a000-000000000001', 'Appa (Owner)', 'appa@okaxis');

insert into public.eb_accounts (house_id, service_number, consumer_name, default_paid_by) values
  ('20000000-0000-4000-a000-000000000001', '09-123-456-001', 'Appa', 'owner_reimbursed'),
  ('20000000-0000-4000-a000-000000000002', '09-123-456-002', 'Appa', 'tenant_direct');

insert into public.tenants (id, user_id, full_name, phone, email, permanent_address) values
  ('30000000-0000-4000-a000-000000000001', '00000000-0000-4000-a000-000000000011', 'Ravi Kumar', '9840000011', 'ravi@example.com', 'Madurai'),
  ('30000000-0000-4000-a000-000000000002', '00000000-0000-4000-a000-000000000012', 'Priya S', '9840000012', 'priya@example.com', 'Coimbatore');

insert into public.tenancies (id, house_id, tenant_id, start_date, advance_paise) values
  ('40000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', '30000000-0000-4000-a000-000000000001', '2025-06-01', 8000000),
  ('40000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000002', '30000000-0000-4000-a000-000000000002', '2026-02-01', 8000000);
insert into public.rent_revisions (tenancy_id, amount_paise, effective_from, reason) values
  ('40000000-0000-4000-a000-000000000001', 1400000, '2025-06-01', 'Starting rent'),
  ('40000000-0000-4000-a000-000000000001', 1500000, '2026-06-01', 'Yearly increase'),
  ('40000000-0000-4000-a000-000000000002', 1500000, '2026-02-01', 'Starting rent');
update public.tenancies set status = 'pending_agreement' where id in ('40000000-0000-4000-a000-000000000001', '40000000-0000-4000-a000-000000000002');
update public.tenancies set status = 'active' where id in ('40000000-0000-4000-a000-000000000001', '40000000-0000-4000-a000-000000000002');

insert into public.consents (tenant_id, purpose, notice_version, language)
values ('30000000-0000-4000-a000-000000000001', 'tenancy_records_and_identity_documents', 'v1-2026-10', 'en');

-- This month's rent, as the daily job would create it.
select public.generate_rent_charges(public.today_ist());
select public.mark_overdue(public.today_ist());
