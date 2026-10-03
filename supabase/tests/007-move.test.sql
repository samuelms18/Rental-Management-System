-- Phase 7: move-in, deposit ledger, move-out settlement, retention, former-tenant access.
begin;
select plan(19);
select tests.seed_world();

-- Move-in: advance recorded → deposit "received".
select tests.login(tests.w('m1'));
insert into public.move_in_records (tenancy_id, advance_received_paise, advance_received_on, advance_method)
  values (tests.w('tya'), 8000000, '2025-01-10', 'bank_transfer');
select public.complete_move_in(tests.w('tya'));
select is((select received from public.deposit_summary(tests.w('tya'))), 8000000::bigint, 'move-in records the advance received');
select throws_ok(
  $$insert into public.deposit_transactions (tenancy_id, type, amount_paise) values (tests.w('tya'), 'refund', 100)$$,
  '42501', null, 'staff cannot type a refund by hand');
select throws_ok(
  $$insert into public.deposit_transactions (tenancy_id, type, amount_paise) values (tests.w('tya'), 'deduction', 100)$$,
  '23514', null, 'a deduction needs a reason');

-- Deductions (requirements example)
insert into public.deposit_transactions (tenancy_id, type, amount_paise, reason) values
  (tests.w('tya'), 'deduction', 200000, 'Painting'),
  (tests.w('tya'), 'deduction', 50000, 'Tap damage'),
  (tests.w('tya'), 'deduction', 50000, 'Cleaning');
select is((select balance from public.deposit_summary(tests.w('tya'))), 7700000::bigint,
  '₹80,000 − ₹2,000 − ₹500 − ₹500 = ₹77,000');

insert into public.move_out_records (tenancy_id, notice_date, move_out_date, final_eb_paise)
  values (tests.w('tya'), public.today_ist() - 30, public.today_ist(), 0);
select tests.logout();

-- Tenant can't see the draft statement; other tenants never see it.
select tests.login(tests.w('ua'));
select is((select count(*) from public.move_out_records), 0::bigint, 'tenant does not see a draft statement');
select tests.logout();

select tests.login(tests.w('m1'));
select public.share_settlement(tests.w('tya'));
select is((select status from public.move_out_records where tenancy_id = tests.w('tya')), 'shared_with_tenant', 'statement shared');
select throws_ok(
  $$insert into public.deposit_transactions (tenancy_id, type, amount_paise, reason) values (tests.w('tya'), 'deduction', 100, 'late')$$,
  '23514', null, 'deductions are locked after sharing');
select tests.logout();

select tests.login(tests.w('ub'));
select is((select count(*) from public.move_out_records where tenancy_id = tests.w('tya')), 0::bigint,
  'another tenant cannot see the statement');
select is((select count(*) from public.deposit_transactions where tenancy_id = tests.w('tya')), 0::bigint,
  'another tenant cannot see the deposit ledger');
select tests.logout();

select tests.login(tests.w('ua'));
select is((select refund_paise from public.move_out_records where tenancy_id = tests.w('tya')), 7700000::bigint,
  'tenant sees the refund on the statement');
select throws_ok($$select public.respond_settlement(tests.w('tya'), false, '')$$, '23514', null, 'a dispute needs a note');
select public.respond_settlement(tests.w('tya'), true, null);
select is((select status from public.move_out_records where tenancy_id = tests.w('tya')), 'acknowledged', 'tenant acknowledged');
select tests.logout();

-- Settle
select tests.login(tests.w('m1'));
insert into public.identity_documents (owner_type, owner_id, tenancy_id, doc_type, number_last4, front_path)
  values ('tenant', tests.w('ta'), tests.w('tya'), 'pan', '234F', 'x/pan.webp');
select public.settle_move_out(tests.w('tya'), public.today_ist(), 'bank_transfer', 'NEFT123');
select is((select status from public.tenancies where id = tests.w('tya')), 'completed', 'tenancy completed');
select is((select status from public.houses where id = tests.w('a1')), 'vacant', 'house vacant');
select is((select balance from public.deposit_summary(tests.w('tya'))), 0::bigint, 'deposit fully accounted after refund');
select is((select purge_after from public.identity_documents where tenancy_id = tests.w('tya')),
  (now() + interval '12 months')::date, 'ID documents scheduled for deletion in 12 months');
select tests.logout();

-- Former tenant: settlement still visible (90 days), tenancy data is not.
select tests.login(tests.w('ua'));
select is((select count(*) from public.move_out_records where tenancy_id = tests.w('tya')), 1::bigint,
  'former tenant still sees their settlement statement');
select tests.logout();

-- Retention: purge after 12 months (shifted clock), and sign-in disabled after 90 days.
select is((select count(*)::int from public.documents_due_for_purge((now() + interval '13 months')::date)), 1,
  'documents are due for purge after 12 months');
select ok(public.disable_former_tenants(now() + interval '91 days') >= 1, 'former tenant disabled after 90 days');

select * from finish();
rollback;
