-- 0012: notice date & billing end, rent after leaving, settlement months, dashboard houses, team roles.
begin;
select plan(15);
select tests.seed_world();
set constraints all immediate;

-- Two future rent charges for Tenant A (next month and the month after).
insert into public.charges (tenancy_id, type, period_start, period_end, amount_paise, due_date)
select tests.w('tya'), 'rent', m, (m + interval '1 month - 1 day')::date, 1500000, m
from (values ((date_trunc('month', public.today_ist()) + interval '1 month')::date),
             ((date_trunc('month', public.today_ist()) + interval '2 month')::date)) v(m);

-- Notice given: leaving in 5 days, 30-day notice.
update public.tenancies set status = 'notice_period', actual_end_date = public.today_ist() + 5, notice_period_days = 30
where id = tests.w('tya');
select is((select notice_date from public.tenancies where id = tests.w('tya')), public.today_ist(),
  'notice date is set automatically when notice is recorded');
select is(public.tenancy_billing_end(tests.w('tya')), public.today_ist() + 29,
  'rent runs to the end of the notice period when the tenant leaves earlier');
select is((select cancel_reason from public.charges
           where tenancy_id = tests.w('tya') and period_start = (date_trunc('month', public.today_ist()) + interval '2 month')::date),
  'after_billing_end', 'unpaid rent for a month after the billing end is cancelled');

-- Withdrawn: notice date cleared, the month comes back.
update public.tenancies set status = 'active' where id = tests.w('tya');
select is((select notice_date from public.tenancies where id = tests.w('tya')), null::date, 'withdrawing the notice clears the notice date');
select isnt((select status from public.charges
             where tenancy_id = tests.w('tya') and period_start = (date_trunc('month', public.today_ist()) + interval '2 month')::date),
  'cancelled', 'withdrawing the notice brings the month back');

-- Notice again; the move-out page's "notice given on" overrides it.
update public.tenancies set status = 'notice_period', actual_end_date = public.today_ist() + 5 where id = tests.w('tya');
insert into public.move_out_records (tenancy_id, notice_date, move_out_date) values (tests.w('tya'), public.today_ist() - 20, public.today_ist() + 5);
select is((select notice_date from public.tenancies where id = tests.w('tya')), public.today_ist() - 20,
  '"notice given on" on the move-out record updates the tenancy');
select is(public.tenancy_billing_end(tests.w('tya')), public.today_ist() + 9,
  'billing end follows the corrected notice date');

-- Settlement helper creates the notice-period months that do not exist yet.
update public.tenancies set actual_end_date = public.today_ist() + 75 where id = tests.w('tya');
select public.ensure_rent_through(tests.w('tya'));
select is((select count(*)::int from public.charges
           where tenancy_id = tests.w('tya') and type = 'rent' and status <> 'cancelled'
             and period_start = date_trunc('month', public.today_ist() + 75)::date), 1,
  'every month up to the billing end has a rent charge before settlement');

-- Dashboard: one card per house the manager can see, and older unpaid rent.
select tests.login(tests.w('m1'));
select is(jsonb_array_length(public.staff_dashboard() -> 'houses'), 2, 'dashboard lists the manager''s houses');
select ok((public.staff_dashboard() -> 'summary') ? 'older_unpaid_paise', 'dashboard reports older unpaid rent');

-- Team roles (only the test team on the test properties).
select tests.logout();
delete from public.property_members
where property_id in (tests.w('pa'), tests.w('pb')) and user_id not in (tests.w('o'), tests.w('m1'), tests.w('m2'));
select tests.login(tests.w('m1'));
select throws_ok($$select public.set_member_role(tests.w('m1'), 'owner')$$, '42501', null, 'a manager cannot change roles');
select tests.login(tests.w('o'));
select public.set_member_role(tests.w('m1'), 'owner');
select is((select role from public.property_members where property_id = tests.w('pa') and user_id = tests.w('m1')), 'owner',
  'an owner can make a manager an owner');
select throws_ok($$select public.set_member_role(tests.w('o'), 'manager')$$, '23514', null,
  'a property can never be left without an owner');
select public.remove_member(tests.w('m2'));
select is((select count(*)::int from public.property_members where user_id = tests.w('m2')), 0, 'an owner can remove a manager');
select throws_ok($$select public.remove_member(tests.w('o'))$$, '23514', null, 'an owner cannot remove themselves');

select * from finish();
rollback;
