-- Phase 3: tenant isolation, one live tenancy per house, status machine, consent, rent revisions.
begin;
select plan(17);
select tests.seed_world();

-- Tenant A's view
select tests.login(tests.w('ua'));
select is((select count(*) from public.tenancies), 1::bigint, 'tenant sees exactly one tenancy');
select is((select id from public.tenancies), tests.w('tya'), 'tenant sees only their own tenancy');
select is((select count(*) from public.houses), 1::bigint, 'tenant sees only their own house');
select is((select count(*) from public.tenants), 1::bigint, 'tenant sees only their own tenant record');
select is((select count(*) from public.rent_revisions where tenancy_id = tests.w('tyb')), 0::bigint,
  'tenant cannot see another tenancy''s rent');

-- Occupants
select lives_ok(
  $$insert into public.occupants (tenancy_id, name) values (tests.w('tya'), 'Spouse A')$$,
  'tenant can add occupant to own tenancy');
select throws_ok(
  $$insert into public.occupants (tenancy_id, name) values (tests.w('tyb'), 'Intruder')$$,
  '42501', null, 'tenant cannot add occupant to another tenancy');

-- Documents need consent first
select throws_ok(
  $$insert into public.identity_documents (owner_type, owner_id, tenancy_id, doc_type, number_last4)
    values ('tenant', tests.w('ta'), tests.w('tya'), 'aadhaar', '1234')$$,
  '42501', null, 'document upload blocked until consent is recorded');
insert into public.consents (tenant_id, purpose, notice_version, language)
  values (tests.w('ta'), 'identity_documents', 'v1', 'en');
select lives_ok(
  $$insert into public.identity_documents (owner_type, owner_id, tenancy_id, doc_type, number_last4, verification)
    values ('tenant', tests.w('ta'), tests.w('tya'), 'aadhaar', '1234', 'verified')$$,
  'after consent the tenant can upload');
select is((select verification from public.identity_documents where tenancy_id = tests.w('tya')), 'pending',
  'tenant cannot self-verify a document');
select throws_ok(
  $$insert into public.identity_documents (owner_type, owner_id, tenancy_id, doc_type, number_last4)
    values ('tenant', tests.w('ta'), tests.w('tya'), 'aadhaar', '123456789012')$$,
  '23514', null, 'full ID numbers are rejected (last 4 only)');
select tests.logout();

-- Tenant B cannot see A's occupants or documents
select tests.login(tests.w('ub'));
select is((select count(*) from public.occupants where tenancy_id = tests.w('tya')), 0::bigint,
  'tenant B cannot see tenant A''s occupants');
select is((select count(*) from public.identity_documents where tenancy_id = tests.w('tya')), 0::bigint,
  'tenant B cannot see tenant A''s documents');
select tests.logout();

-- Staff rules
select tests.login(tests.w('m1'));
select throws_ok(
  $$insert into public.tenancies (house_id, tenant_id, start_date, status)
    values (tests.w('a1'), tests.w('tb'), '2026-01-01', 'active')$$,
  '23514', null, 'a tenancy cannot be created directly as active');
insert into public.tenancies (house_id, tenant_id, start_date) values (tests.w('a1'), tests.w('tb'), '2026-01-01');
insert into public.rent_revisions (tenancy_id, amount_paise, effective_from)
  select id, 100000, '2026-01-01' from public.tenancies where house_id = tests.w('a1') and status = 'draft';
update public.tenancies set status = 'pending_agreement' where house_id = tests.w('a1') and status = 'draft';
select throws_ok(
  $$update public.tenancies set status = 'active' where house_id = tests.w('a1') and status = 'pending_agreement'$$,
  '23505', null, 'a second active tenancy on the same house fails');
select throws_ok(
  $$update public.tenancies set status = 'completed' where id = tests.w('tya')$$,
  '23514', null, 'active cannot jump to completed without notice');

-- Future rent revision does not change this month's rent
insert into public.rent_revisions (tenancy_id, amount_paise, effective_from)
  values (tests.w('tya'), 1700000, (date_trunc('month', public.today_ist()) + interval '2 months')::date);
select is(public.rent_for(tests.w('tya'), public.today_ist()), 1500000::bigint,
  'a future rent revision does not change the current month''s rent');
select tests.logout();

select * from finish();
rollback;
