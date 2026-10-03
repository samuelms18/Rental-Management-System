-- Phase 1: isolation between properties, 2FA enforcement, profile role protection, audit immutability.
begin;
select plan(11);
select tests.seed_world();

-- Anonymous users read nothing.
select tests.login_anon();
select is((select count(*) from public.properties), 0::bigint, 'anon sees no properties');
select is((select count(*) from public.profiles), 0::bigint, 'anon sees no profiles');
select tests.logout();

-- Manager of A cannot see property B.
select tests.login(tests.w('m1'));
select is((select count(*) from public.properties), 1::bigint, 'manager of A sees exactly one property');
select is((select count(*) from public.properties where id = tests.w('pb')), 0::bigint, 'manager of A cannot read property B');
select is((select count(*) from public.houses where property_id = tests.w('pb')), 0::bigint, 'manager of A cannot read houses of B');
select tests.logout();

-- Staff without 2FA (aal1) see nothing.
select tests.login(tests.w('o'), 'aal1');
select is((select count(*) from public.properties), 0::bigint, 'owner at aal1 (no 2FA) sees no properties');
select is((select count(*) from public.tenancies), 0::bigint, 'owner at aal1 sees no tenancies');
select tests.logout();

-- A user cannot promote themselves.
select tests.login(tests.w('ua'));
select throws_ok(
  $$update public.profiles set app_role = 'staff' where id = auth.uid()$$,
  '42501', null, 'tenant cannot change own app_role');
select lives_ok(
  $$update public.profiles set preferred_language = 'ta' where id = auth.uid()$$,
  'tenant can change own language');
select tests.logout();

-- Audit log is insert-only, even for owners.
select tests.login(tests.w('o'));
select throws_ok($$delete from public.activity_logs$$, '42501', null, 'owner cannot delete audit entries');
select tests.logout();
select throws_ok($$update public.activity_logs set action = 'x'$$, 'P0001', 'activity_logs is insert-only',
  'even the database owner cannot edit audit entries');

select * from finish();
rollback;
