-- Test helpers (runs first). Creates a `tests` schema used by every other test file.
-- These objects exist only in the local/CI test database, never in a migration.
begin;
create extension if not exists pgtap with schema extensions;

create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

create or replace function tests.create_user(p_email text, p_role text default 'tenant')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email, '',
          now(), '{}'::jsonb, jsonb_build_object('full_name', split_part(p_email, '@', 1)), now(), now());
  update public.profiles set app_role = p_role where id = v_id;
  return v_id;
end;
$$;

-- Act as a signed-in user. aal2 = passed 2FA.
create or replace function tests.login(p_user uuid, p_aal text default 'aal2')
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    jsonb_build_object('sub', p_user, 'role', 'authenticated', 'aal', p_aal)::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create or replace function tests.login_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', jsonb_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
end;
$$;

create or replace function tests.logout()
returns void
language plpgsql
as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- A small world:
--   property A (houses A1, A2) and property B (house B1)
--   owner O on A and B; manager M1 on A only; manager M2 on B only
--   tenant TA → active tenancy on A1, tenant TB → active tenancy on A2, tenant TC → active on B1
create or replace function tests.seed_world()
returns jsonb
language plpgsql
as $$
declare
  w jsonb;
  o uuid; m1 uuid; m2 uuid; ua uuid; ub uuid; uc uuid;
  pa uuid; pb uuid; a1 uuid; a2 uuid; b1 uuid;
  ta uuid; tb uuid; tc uuid; tya uuid; tyb uuid; tyc uuid;
begin
  o := tests.create_user('owner@test.local', 'staff');
  m1 := tests.create_user('m1@test.local', 'staff');
  m2 := tests.create_user('m2@test.local', 'staff');
  ua := tests.create_user('ta@test.local');
  ub := tests.create_user('tb@test.local');
  uc := tests.create_user('tc@test.local');

  insert into public.properties (name, city) values ('Property A', 'Chennai') returning id into pa;
  insert into public.property_members values (pa, o, 'owner'), (pa, m1, 'manager');
  insert into public.properties (name, city) values ('Property B', 'Madurai') returning id into pb;
  delete from public.property_members where property_id = pb and user_id = m1;
  insert into public.property_members values (pb, m2, 'manager') on conflict do nothing;

  insert into public.houses (property_id, unit_number, default_rent_paise) values (pa, 'H01', 1500000) returning id into a1;
  insert into public.houses (property_id, unit_number, default_rent_paise) values (pa, 'H02', 1200000) returning id into a2;
  insert into public.houses (property_id, unit_number, default_rent_paise) values (pb, 'H01', 1000000) returning id into b1;

  insert into public.tenants (user_id, full_name, phone, email) values (ua, 'Tenant A', '9000000001', 'ta@test.local') returning id into ta;
  insert into public.tenants (user_id, full_name, phone, email) values (ub, 'Tenant B', '9000000002', 'tb@test.local') returning id into tb;
  insert into public.tenants (user_id, full_name, phone, email) values (uc, 'Tenant C', '9000000003', 'tc@test.local') returning id into tc;

  insert into public.tenancies (house_id, tenant_id, start_date, advance_paise) values (a1, ta, '2025-01-10', 5000000) returning id into tya;
  insert into public.tenancies (house_id, tenant_id, start_date) values (a2, tb, '2025-02-01') returning id into tyb;
  insert into public.tenancies (house_id, tenant_id, start_date) values (b1, tc, '2025-03-01') returning id into tyc;
  insert into public.rent_revisions (tenancy_id, amount_paise, effective_from) values
    (tya, 1500000, '2025-01-10'), (tyb, 1200000, '2025-02-01'), (tyc, 1000000, '2025-03-01');
  update public.tenancies set status = 'pending_agreement' where id in (tya, tyb, tyc);
  update public.tenancies set status = 'active' where id in (tya, tyb, tyc);

  w := jsonb_build_object(
    'o', o, 'm1', m1, 'm2', m2, 'ua', ua, 'ub', ub, 'uc', uc,
    'pa', pa, 'pb', pb, 'a1', a1, 'a2', a2, 'b1', b1,
    'ta', ta, 'tb', tb, 'tc', tc, 'tya', tya, 'tyb', tyb, 'tyc', tyc);
  perform set_config('tests.world', w::text, true);
  return w;
end;
$$;

create or replace function tests.w(p_key text)
returns uuid
language sql
stable
as $$
  select (current_setting('tests.world')::jsonb ->> p_key)::uuid;
$$;

grant execute on all functions in schema tests to anon, authenticated;

select plan(1);
select ok(true, 'test helpers installed');
select * from finish();
commit;
