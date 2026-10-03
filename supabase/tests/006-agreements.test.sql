-- Phase 6: agreements — visibility, versioning, signing, approval, expiry reminders.
begin;
select plan(18);
select tests.seed_world();

-- A new move-in on house B1 (vacated first) goes through the agreement flow.
update public.tenancies set status = 'notice_period', actual_end_date = public.today_ist() where id = tests.w('tyc');
update public.tenancies set status = 'completed' where id = tests.w('tyc');
insert into public.tenancies (id, house_id, tenant_id, start_date)
  values ('99999999-0000-4000-a000-000000000001', tests.w('b1'), tests.w('tb'), public.today_ist());
insert into public.rent_revisions (tenancy_id, amount_paise, effective_from)
  values ('99999999-0000-4000-a000-000000000001', 1000000, public.today_ist());

select tests.login(tests.w('m2'));
insert into public.agreements (id, tenancy_id, start_date, end_date, rent_paise, advance_paise)
  values ('aaaaaaaa-0000-4000-a000-000000000001', '99999999-0000-4000-a000-000000000001',
          public.today_ist(), public.today_ist() + 335, 1000000, 5000000);
insert into public.agreement_versions (agreement_id, body_text) values ('aaaaaaaa-0000-4000-a000-000000000001', 'Version one text');
select is((select status from public.tenancies where id = '99999999-0000-4000-a000-000000000001'), 'pending_agreement',
  'creating an agreement moves a draft tenancy to pending_agreement');
select is((select v.version_no from public.agreements a join public.agreement_versions v on v.id = a.current_version_id
           where a.id = 'aaaaaaaa-0000-4000-a000-000000000001'), 1, 'first version is current');
select throws_ok($$update public.agreements set status = 'approved' where id = 'aaaaaaaa-0000-4000-a000-000000000001'$$,
  '23514', null, 'status cannot be set by hand');
select throws_ok($$select public.mark_agreement_generated('aaaaaaaa-0000-4000-a000-000000000001')$$,
  '23514', 'Generate the PDF first', 'cannot mark generated without a PDF');
update public.agreement_versions set rendered_pdf_path = 'x/v1.pdf' where agreement_id = 'aaaaaaaa-0000-4000-a000-000000000001';
select public.mark_agreement_generated('aaaaaaaa-0000-4000-a000-000000000001');
select tests.logout();

-- Tenant cannot see a generated (unsent) agreement.
select tests.login(tests.w('ub'));
select is((select count(*) from public.agreements where id = 'aaaaaaaa-0000-4000-a000-000000000001'), 0::bigint,
  'tenant cannot see an agreement before it is sent');
select tests.logout();

select tests.login(tests.w('m2'));
select public.send_agreement('aaaaaaaa-0000-4000-a000-000000000001');
select tests.logout();

-- Tenant B sees and signs; Tenant A (other tenancy) sees nothing.
select tests.login(tests.w('ua'));
select is((select count(*) from public.agreements where id = 'aaaaaaaa-0000-4000-a000-000000000001'), 0::bigint,
  'another tenant cannot see the agreement');
select throws_ok($$select public.sign_agreement('aaaaaaaa-0000-4000-a000-000000000001', 'drawn', 'x/sig.png')$$,
  '42501', null, 'another tenant cannot sign it');
select tests.logout();

select tests.login(tests.w('ub'));
select public.view_agreement('aaaaaaaa-0000-4000-a000-000000000001');
select is((select status from public.agreements where id = 'aaaaaaaa-0000-4000-a000-000000000001'), 'awaiting_signature',
  'opening a sent agreement marks it awaiting signature');
select public.sign_agreement('aaaaaaaa-0000-4000-a000-000000000001', 'drawn', 'x/sig1.png');
select is((select status from public.agreements where id = 'aaaaaaaa-0000-4000-a000-000000000001'), 'signed', 'tenant signed');
select tests.logout();

-- Edit after signing → new version, back to draft, must re-sign.
select tests.login(tests.w('m2'));
insert into public.agreement_versions (agreement_id, body_text) values ('aaaaaaaa-0000-4000-a000-000000000001', 'Version two text');
select is((select status from public.agreements where id = 'aaaaaaaa-0000-4000-a000-000000000001'), 'draft',
  'editing after signing sends the agreement back to draft');
select throws_ok(
  $$update public.agreement_versions set body_text = 'tampered' where version_no = 1 and agreement_id = 'aaaaaaaa-0000-4000-a000-000000000001'$$,
  '23514', null, 'old versions cannot be changed');
update public.agreement_versions set rendered_pdf_path = 'x/v2.pdf' where version_no = 2 and agreement_id = 'aaaaaaaa-0000-4000-a000-000000000001';
select public.mark_agreement_generated('aaaaaaaa-0000-4000-a000-000000000001');
select public.send_agreement('aaaaaaaa-0000-4000-a000-000000000001');
select tests.logout();
-- Force the state where staff would try to approve the new version without a fresh signature.
select public.set_agreement_status('aaaaaaaa-0000-4000-a000-000000000001', 'signed');
select tests.login(tests.w('m2'));
select throws_ok($$select public.approve_agreement('aaaaaaaa-0000-4000-a000-000000000001')$$,
  '23514', 'The current version has no tenant signature', 'the old signature does not count for the new version');
select tests.logout();
select public.set_agreement_status('aaaaaaaa-0000-4000-a000-000000000001', 'awaiting_signature');

select tests.login(tests.w('ub'));
select public.sign_agreement('aaaaaaaa-0000-4000-a000-000000000001', 'drawn', 'x/sig2.png');
select tests.logout();
select tests.login(tests.w('m2'));
select public.approve_agreement('aaaaaaaa-0000-4000-a000-000000000001');
select is((select status from public.agreements where id = 'aaaaaaaa-0000-4000-a000-000000000001'), 'active',
  'approval on/after the start date makes the agreement active');
select is((select status from public.tenancies where id = '99999999-0000-4000-a000-000000000001'), 'active',
  'and activates the tenancy');
select is((select expected_end_date from public.tenancies where id = '99999999-0000-4000-a000-000000000001'),
  public.today_ist() + 335, 'agreement end date is copied to the tenancy');
select isnt((select count(*) from public.charges where tenancy_id = '99999999-0000-4000-a000-000000000001'), 0::bigint,
  'activation creates the first rent charge');
select tests.logout();

-- Expiry reminders 30 days before the end.
select public.agreements_daily(public.today_ist() + 305);
select is((select count(*)::int from public.notifications where kind = 'agreement_expiring' and dedupe_key like 'agr:aaaaaaaa-0000-4000-a000-000000000001:30%'),
  1 + (select count(*)::int from public.property_members where property_id = tests.w('pb')),
  'expiry reminder goes to the tenant and every staff member of the property');
select public.agreements_daily(public.today_ist() + 336);
select is((select status from public.agreements where id = 'aaaaaaaa-0000-4000-a000-000000000001'), 'expired',
  'agreements expire after their end date');

select * from finish();
rollback;
