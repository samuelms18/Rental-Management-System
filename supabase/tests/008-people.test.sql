-- Phase 8: guests need an ID, announcements reach only their target, push subscriptions are private.
begin;
select plan(12);
select tests.seed_world();
insert into public.consents (tenant_id, purpose, notice_version, language) values
  (tests.w('ta'), 'x', 'v1', 'en'), (tests.w('tb'), 'x', 'v1', 'en');

select tests.login(tests.w('ua'));
-- Direct insert without an ID: refused at commit (constraint trigger). Simulate commit with SET CONSTRAINTS.
savepoint s1;
insert into public.guests (tenancy_id, name, check_in) values (tests.w('tya'), 'No ID guest', public.today_ist());
select throws_ok($$set constraints guests_require_id immediate$$, '23514', 'An ID document is required for every guest',
  'a guest cannot be saved without an ID');
rollback to savepoint s1;
select throws_ok(
  $$select public.register_guest(tests.w('tya'), 'Cousin', null, 'cousin', 'visit', public.today_ist(), null, 'aadhaar', '1234', '', null)$$,
  '23514', null, 'register_guest refuses a missing ID image');
select lives_ok(
  $$select public.register_guest(tests.w('tya'), 'Cousin', '9000000009', 'cousin', 'visit', public.today_ist(), public.today_ist() + 1, 'aadhaar', '1234', 'x/g.webp', null)$$,
  'guest with ID is registered');
set constraints guests_require_id immediate;
select is((select status from public.guests where name = 'Cousin'), 'currently_staying', 'guest arriving today is staying');
select throws_ok(
  $$select public.register_guest(tests.w('tyb'), 'Intruder', null, null, null, public.today_ist(), null, 'pan', null, 'x/i.webp', null)$$,
  '42501', null, 'tenant cannot register a guest in another tenancy');
select public.guest_checkout((select id from public.guests where name = 'Cousin'));
select is((select purge_after from public.identity_documents where owner_type = 'guest'), (now() + interval '12 months')::date,
  'guest ID is scheduled for deletion 12 months after checkout');
select tests.logout();

select is((select count(*)::int from public.notifications where kind = 'guest_registered' and user_id = tests.w('m1')), 1,
  'manager is notified when a guest is registered');

-- Announcements
select tests.login(tests.w('m1'));
insert into public.announcements (target, target_id, title, body) values ('house', tests.w('a1'), 'Water off', 'Tank cleaning 10am');
select throws_ok(
  $$insert into public.announcements (target, target_id, title, body) values ('property', tests.w('pb'), 'x', 'y')$$,
  '42501', null, 'manager cannot announce to a property they do not manage');
select tests.logout();
select tests.login(tests.w('ua'));
select is((select count(*) from public.announcements), 1::bigint, 'house announcement reaches that house''s tenant');
insert into public.announcement_reads (announcement_id) select id from public.announcements;
select tests.logout();
select tests.login(tests.w('ub'));
select is((select count(*) from public.announcements), 0::bigint, 'and nobody else');
select tests.logout();
select tests.login(tests.w('m1'));
select is((select count(*) from public.announcement_reads), 1::bigint, 'manager sees who has read it');
select tests.logout();

-- Push subscriptions are private to their owner.
select tests.login(tests.w('ua'));
insert into public.push_subscriptions (endpoint, keys) values ('https://push.example/a', '{"p256dh":"x","auth":"y"}');
select tests.logout();
select tests.login(tests.w('m1'));
select is((select count(*) from public.push_subscriptions), 0::bigint, 'staff cannot read tenants'' push subscriptions');
select tests.logout();

select * from finish();
rollback;
