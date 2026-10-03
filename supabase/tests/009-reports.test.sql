-- Phase 9: report totals equal the underlying charges/payments; reports respect property access.
begin;
select plan(9);
select tests.seed_world();
update public.tenancies set start_date = '2025-12-01' where id in (tests.w('tya'), tests.w('tyb'), tests.w('tyc'));
select public.generate_rent_charges('2025-12-29');  -- Jan rent: A1 15000, A2 12000, B1 10000
select public.generate_rent_charges('2026-01-29');  -- Feb rent

select tests.login(tests.w('m1'));
select public.record_cash_payment(tests.w('tya'), 1500000, '2026-01-04', 'Father');  -- A1 Jan paid
select public.record_cash_payment(tests.w('tyb'), 500000, '2026-01-04', 'Father');   -- A2 Jan partly paid
insert into public.expenses (property_id, house_id, category, amount_paise, spent_on, description)
  values (tests.w('pa'), tests.w('a1'), 'plumbing', 300000, '2026-01-20', 'Pipe'),
         (tests.w('pa'), tests.w('a1'), 'painting', 700000, '2026-02-10', 'Paint');

select is((select sum(expected_paise)::bigint from public.report_rent('2026-01-01', '2026-01-31')), 2700000::bigint,
  'manager of A: January expected = A1 + A2 only (B is not theirs)');
select is((select sum(collected_paise)::bigint from public.report_rent('2026-01-01', '2026-01-31')),
  (select sum(public.charge_paid_paise(c.id))::bigint from public.charges c
   where c.type = 'rent' and c.period_start = '2026-01-01' and c.tenancy_id in (tests.w('tya'), tests.w('tyb'))),
  'collected equals the approved payments applied to those charges');
select is((select sum(pending_paise)::bigint from public.report_rent('2026-01-01', '2026-01-31')), 700000::bigint,
  'pending = expected − collected');
select is((select sum(expected_paise)::bigint from public.report_rent('2026-01-01', '2026-02-28')), 5400000::bigint,
  'two months together');
select is((select sum(total_paise)::bigint from public.report_expenses('2026-01-01', '2026-12-31')), 1000000::bigint,
  'expenses total');
select is((select net_paise from public.report_net_income('2026-01-01', '2026-02-28') where house_id = tests.w('a1')),
  1500000::bigint - 1000000, 'net income per house = rent collected − expenses');
select is((select count(*)::int from public.house_timeline(tests.w('a1')) where kind = 'repair'), 1,
  'only repairs of ₹5,000 or more appear in the house history');
select tests.logout();

select tests.login(tests.w('m2'));
select is((select coalesce(sum(expected_paise), 0)::bigint from public.report_rent('2026-01-01', '2026-01-31')), 1000000::bigint,
  'manager of B sees only B''s rent');
select tests.logout();

select tests.login(tests.w('ua'));
select is((select count(*) from public.report_rent('2025-01-01', '2026-12-31') where house_id <> tests.w('a1')), 0::bigint,
  'a tenant can never see other houses in reports');
select tests.logout();

select * from finish();
rollback;
