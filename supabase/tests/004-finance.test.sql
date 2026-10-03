-- Phase 4: rent generation, payments, approvals, allocations, receipts, EB, reminders, storage.
begin;
select plan(32);
select tests.seed_world();

-- ---------- Rent generation (run as the job does: postgres, fixed dates) ----------
-- Tenancies started in December, so January is the first job-generated month.
update public.tenancies set start_date = '2025-12-01', rent_due_day = 5 where id in (tests.w('tya'), tests.w('tyb'), tests.w('tyc'));
-- Count only this test's tenancies (local seed data may exist alongside).
create temp view world_charges as
  select * from public.charges where tenancy_id in (tests.w('tya'), tests.w('tyb'), tests.w('tyc'));
grant select on world_charges to authenticated;
select public.generate_rent_charges('2025-12-27');
select is((select count(*)::int from world_charges), 0, 'nothing generated more than 7 days before the 5th');
select public.generate_rent_charges('2025-12-29');
select is((select count(*)::int from world_charges), 3, 'Jan charges created on 29 Dec (7 days before 5 Jan)');
select public.generate_rent_charges('2025-12-29');
select is((select count(*)::int from world_charges), 3, 'running again creates nothing new (idempotent)');
select public.generate_rent_charges('2025-12-30');
select is((select count(*)::int from world_charges), 3, 'next day also creates nothing new');
select is((select due_date from public.charges where tenancy_id = tests.w('tya')), '2026-01-05'::date, 'due on the 5th');
select is((select amount_paise from public.charges where tenancy_id = tests.w('tya')), 1500000::bigint,
  'full month uses the rent revision in effect');

-- Pro-rating helper (kept for reference; rent charges no longer use it)
select is(public.prorate(3100000, '2026-10-20', '2026-10-31'), 1200000::bigint, '12 of 31 days of ₹31,000 = ₹12,000');

-- First month at activation (new move-in this month)
insert into public.tenancies (house_id, tenant_id, start_date)
  values (tests.w('b1'), tests.w('tb'), public.today_ist()) ;
update public.tenancies set status = 'notice_period', actual_end_date = public.today_ist() where id = tests.w('tyc');
update public.tenancies set status = 'completed' where id = tests.w('tyc');
insert into public.rent_revisions (tenancy_id, amount_paise, effective_from)
  select id, 3100000, public.today_ist() from public.tenancies where house_id = tests.w('b1') and status = 'draft';
update public.tenancies set status = 'pending_agreement' where house_id = tests.w('b1') and status = 'draft';
update public.tenancies set status = 'active' where house_id = tests.w('b1') and status = 'pending_agreement';
select is(
  (select amount_paise from public.charges c join public.tenancies t on t.id = c.tenancy_id
   where t.house_id = tests.w('b1') and t.status = 'active'),
  3100000::bigint,
  'first month is the full rent whatever the move-in day (family rule)');
select is((select status from public.houses where id = tests.w('b1')), 'occupied', 'activation marks the house occupied');

-- ---------- Overdue ----------
select public.mark_overdue('2026-01-06');
select is((select count(*)::int from world_charges where status = 'overdue'), 3, 'unpaid charges past the due date become overdue');

-- ---------- Tenant payment submission ----------
select tests.login(tests.w('ua'));
insert into public.payments (tenancy_id, amount_paise, paid_on, method, utr_reference, status, reviewed_by)
  values (tests.w('tya'), 1000000, '2026-01-04', 'upi', 'UTR000000001', 'approved', tests.w('ua'));
select is((select status from public.payments where utr_reference = 'UTR000000001'), 'submitted',
  'tenant cannot submit a payment as approved');
select is((select reviewed_by from public.payments where utr_reference = 'UTR000000001'), null,
  'tenant cannot set reviewed_by');
select throws_ok(
  $$insert into public.payments (tenancy_id, amount_paise, paid_on, method, utr_reference)
    values (tests.w('tya'), 1000000, '2026-01-04', 'upi', 'utr000000001')$$,
  '23505', null, 'duplicate UTR is rejected');
select throws_ok(
  $$insert into public.payments (tenancy_id, amount_paise, paid_on, method, utr_reference)
    values (tests.w('tyb'), 1000, '2026-01-04', 'upi', 'UTR000000099')$$,
  '42501', null, 'tenant cannot submit a payment for another tenancy');
select throws_ok(
  $$select public.approve_payment((select id from public.payments where utr_reference = 'UTR000000001'))$$,
  '42501', null, 'tenant cannot approve their own payment');
select throws_ok(
  $$update public.payments set status = 'approved'$$, '42501', null, 'tenant cannot update payments');
select tests.logout();

-- ---------- Manager approves → partial, then second payment completes ----------
select tests.login(tests.w('m1'));
select lives_ok(
  $$select public.approve_payment((select id from public.payments where utr_reference = 'UTR000000001'))$$,
  'manager approves');
select is((select status from public.charges where tenancy_id = tests.w('tya')), 'partially_paid',
  'partial payment shows Partially Paid');
select is((select number from public.receipts r join public.payments p on p.id = r.payment_id
           where p.utr_reference = 'UTR000000001'),
  'RCPT-' || extract(year from public.today_ist()) || '-0001', 'first receipt number of the year');
select lives_ok(
  $$select public.record_cash_payment(tests.w('tya'), 500000, '2026-01-05', 'Father')$$,
  'manager records cash handed to the father');
select is((select status from public.charges where tenancy_id = tests.w('tya')), 'paid',
  'second payment completes the charge');
select is((select count(*) from public.receipts), 2::bigint, 'each owner payment gets a receipt');
select is((select max(number) from public.receipts),
  'RCPT-' || extract(year from public.today_ist()) || '-0002', 'receipt numbers are consecutive');

-- Over-allocation is impossible
select throws_ok(
  $$select public.record_cash_payment(tests.w('tyb'), 100, '2026-01-05', 'Father');
    insert into public.payment_allocations (payment_id, charge_id, amount_paise)
    select p.id, c.id, 99999999 from public.payments p, public.charges c
    where p.tenancy_id = tests.w('tyb') and c.tenancy_id = tests.w('tyb') limit 1$$,
  '42501', null, 'clients cannot write allocations directly');

-- Rejection, then the same UTR can be resubmitted
select tests.logout();
select tests.login(tests.w('ub'));
insert into public.payments (tenancy_id, amount_paise, paid_on, method, utr_reference)
  values (tests.w('tyb'), 1200000, '2026-01-04', 'upi', 'UTR000000777');
select tests.logout();
select tests.login(tests.w('m1'));
select public.reject_payment((select id from public.payments where utr_reference = 'UTR000000777'), 'Screenshot unreadable');
select tests.logout();
select tests.login(tests.w('ub'));
select lives_ok(
  $$insert into public.payments (tenancy_id, amount_paise, paid_on, method, utr_reference)
    values (tests.w('tyb'), 1200000, '2026-01-04', 'upi', 'UTR000000777')$$,
  'same UTR can be resubmitted after a rejection');
select is((select count(*) from public.payments where tenancy_id = tests.w('tya')), 0::bigint,
  'tenant B cannot see tenant A''s payments');
select tests.logout();

-- ---------- EB: owner pays, tenant reimburses ----------
select tests.login(tests.w('m1'));
insert into public.eb_accounts (house_id, service_number, default_paid_by) values (tests.w('a1'), '01-234-567', 'owner_reimbursed');
insert into public.eb_bills (eb_account_id, house_id, period_start, period_end, amount_paise, late_fee_paise, due_date, paid_by)
  select id, house_id, '2025-11-01', '2025-12-31', 240000, 10000, '2026-01-15', 'owner_reimbursed'
  from public.eb_accounts where house_id = tests.w('a1');
select isnt((select public.record_owner_eb_payment(id, '2026-01-10') from public.eb_bills limit 1), null,
  'recording the father''s EB payment returns a reimbursement charge');
select is((select amount_paise from public.charges where type = 'eb_reimbursement'), 250000::bigint,
  'reimbursement = bill + late fee');
select tests.logout();

-- ---------- Reminders ----------
select is((select count(*)::int from public.reminders_due('2026-01-03') where tenancy_id = tests.w('tyb')), 1,
  '2 days before the due date is a reminder day');

-- ---------- Over-allocation guard (database level) ----------
select throws_ok(
  $$insert into public.payment_allocations (payment_id, charge_id, amount_paise)
    select p.id, c.id, 1 from public.payments p, public.charges c
    where p.tenancy_id = tests.w('tya') and p.method = 'cash' and c.tenancy_id = tests.w('tya') and c.type = 'rent'$$,
  '23514', 'Allocations exceed the payment amount', 'a payment cannot be allocated beyond its amount');
select throws_ok(
  $$update public.charges set status = 'paid' where tenancy_id = tests.w('tyb')$$,
  '23514', null, 'charge status cannot be set by hand');

-- ---------- Storage: no direct client access to any file ----------
insert into storage.objects (bucket_id, name, owner) values ('identity-docs', tests.w('tya') || '/doc.webp', tests.w('ua'));
select tests.login(tests.w('ub'));
select is((select count(*) from storage.objects), 0::bigint, 'tenants cannot list or read storage objects directly');
select tests.logout();

select * from finish();
rollback;
