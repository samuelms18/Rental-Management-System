-- Phase 2: houses and photos.
begin;
select plan(6);
select tests.seed_world();

select tests.login(tests.w('m1'));
select lives_ok(
  $$insert into public.houses (property_id, unit_number) values (tests.w('pa'), 'H03')$$,
  'manager can add a house to their property');
select throws_ok(
  $$insert into public.houses (property_id, unit_number) values (tests.w('pb'), 'H09')$$,
  '42501', null, 'manager cannot add a house to another property');
delete from public.houses where unit_number = 'H03';
select is((select count(*) from public.houses where unit_number = 'H03'), 1::bigint, 'manager cannot delete a house');
select throws_ok(
  $$update public.houses set status = 'vacant' where id = tests.w('a1')$$,
  '23514', null, 'occupied/vacant is set by tenancies, not by hand');
select tests.logout();

select tests.login(tests.w('o'));
delete from public.houses where unit_number = 'H03';
select is((select count(*) from public.houses where unit_number = 'H03'), 0::bigint, 'owner can delete a house');
select lives_ok(
  $$update public.houses set status = 'under_maintenance' where id = tests.w('a2') and false$$,
  'status update statement accepted');
select tests.logout();

select * from finish();
rollback;
