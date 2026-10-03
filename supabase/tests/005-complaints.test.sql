-- Phase 5: complaint workflow, expenses, isolation, dashboard.
begin;
select plan(13);
select tests.seed_world();

select tests.login(tests.w('ua'));
insert into public.complaints (tenancy_id, category, title, priority, status, resolution_cost_paise)
  values (tests.w('tya'), 'plumbing', 'Tap leaking', 'urgent', 'resolved', 999);
select is((select status from public.complaints), 'raised', 'a new complaint always starts as raised');
select is((select resolution_cost_paise from public.complaints), null, 'tenant cannot set the resolution cost');
select throws_ok(
  $$insert into public.complaints (tenancy_id, category, title) values (tests.w('tyb'), 'other', 'x')$$,
  '42501', null, 'tenant cannot raise a complaint on another tenancy');
select throws_ok($$select public.update_complaint((select id from public.complaints), 'resolved')$$,
  '42501', null, 'tenant cannot move a complaint forward');
select tests.logout();

select tests.login(tests.w('ub'));
select is((select count(*) from public.complaints), 0::bigint, 'tenant B cannot see tenant A''s complaint');
select tests.logout();

select tests.login(tests.w('m2'));
select is((select count(*) from public.complaints), 0::bigint, 'manager of B cannot see complaints in A');
select tests.logout();

select tests.login(tests.w('m1'));
select is(jsonb_array_length(public.staff_dashboard() -> 'complaints'), 1, 'urgent complaint is on the dashboard');
select public.update_complaint((select id from public.complaints), 'acknowledged');
select public.update_complaint((select id from public.complaints), 'assigned', null, 'Ravi plumber', '9876543210');
select throws_ok($$select public.update_complaint((select id from public.complaints), 'raised')$$,
  '23514', null, 'a complaint cannot move backwards');
select public.update_complaint((select id from public.complaints), 'resolved', 'Washer replaced', null, null, 'Washer replaced', 35000);
select is((select amount_paise from public.expenses where complaint_id = (select id from public.complaints)), 35000::bigint,
  'resolution cost becomes an expense');
select is((select count(*) from public.complaint_updates), 4::bigint, 'every status change is in the history');
select tests.logout();

select tests.login(tests.w('ua'));
select public.reopen_complaint((select id from public.complaints), 'Still leaking');
select is((select status from public.complaints), 'in_progress', 'tenant can reopen a resolved complaint');
select tests.logout();
select tests.login(tests.w('m1'));
select public.update_complaint((select id from public.complaints), 'resolved');
select tests.logout();
select tests.login(tests.w('ua'));
select throws_ok($$select public.reopen_complaint((select id from public.complaints), 'Again')$$,
  '23514', 'A complaint can be reopened only once', 'a complaint can be reopened only once');
select tests.logout();

-- Not confirmed for 7 days → closed automatically.
select is(public.auto_close_complaints(now() + interval '8 days'), 1, 'resolved complaints auto-close after 7 days');

select * from finish();
rollback;
