-- Phase 10: sweep every public table — RLS on, anonymous sees nothing, tenants never see another tenancy's rows.
begin;
select plan(6);
select tests.seed_world();

-- Some rows in every tenancy-scoped table for tenancy B, so the sweep is meaningful.
insert into public.consents (tenant_id, purpose, notice_version, language) values (tests.w('tb'), 'x', 'v1', 'en');
insert into public.occupants (tenancy_id, name) values (tests.w('tyb'), 'B occupant');
insert into public.identity_documents (owner_type, owner_id, tenancy_id, doc_type, front_path) values ('tenant', tests.w('tb'), tests.w('tyb'), 'pan', 'x/b.webp');
insert into public.charges (tenancy_id, type, period_start, period_end, amount_paise, due_date) values (tests.w('tyb'), 'other', '2026-01-01', '2026-01-01', 100, '2026-01-01');
insert into public.complaints (tenancy_id, category, title) values (tests.w('tyb'), 'other', 'B complaint');
insert into public.meter_readings (house_id, tenancy_id, reading) values (tests.w('a2'), tests.w('tyb'), 10);
insert into public.domestic_help (tenancy_id, name, role) values (tests.w('tyb'), 'B maid', 'maid');

select is(
  (select array_agg(c.relname::text order by c.relname) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  null::text[], 'every public table has Row Level Security enabled');

create temp table sweep (tbl text, rows bigint) on commit drop;
grant all on sweep to anon, authenticated;

create or replace function pg_temp.count_all(p_filter text) returns void language plpgsql as $$
declare r record; n bigint;
begin
  for r in
    select c.relname from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
    where ns.nspname = 'public' and c.relkind = 'r'
      and (p_filter = '' or exists (select 1 from information_schema.columns col
           where col.table_schema = 'public' and col.table_name = c.relname and col.column_name = p_filter))
  loop
    begin
      if p_filter = '' then
        execute format('select count(*) from public.%I', r.relname) into n;
      else
        execute format('select count(*) from public.%I where %I = %L', r.relname, p_filter, tests.w('tyb')) into n;
      end if;
    exception when insufficient_privilege then n := 0;
    end;
    insert into sweep values (r.relname, n);
  end loop;
end $$;
grant execute on function pg_temp.count_all(text) to anon, authenticated;

select tests.login_anon();
select pg_temp.count_all('');
select tests.logout();
select is((select array_agg(tbl order by tbl) from sweep where rows > 0), null::text[], 'anonymous users can read no rows in any table');
delete from sweep;

select tests.login(tests.w('ua'));
select pg_temp.count_all('tenancy_id');
select tests.logout();
select is((select array_agg(tbl order by tbl) from sweep where rows > 0), null::text[],
  'tenant A sees no rows of tenancy B in any table that has a tenancy_id');
delete from sweep;

select tests.login(tests.w('m2'));
select pg_temp.count_all('tenancy_id');
select tests.logout();
select is((select array_agg(tbl order by tbl) from sweep where rows > 0), null::text[],
  'a manager of another property sees no rows of tenancy B');

delete from sweep;
select tests.login(tests.w('m1'));
select pg_temp.count_all('tenancy_id');
select tests.logout();
select ok((select count(*) from sweep where rows > 0) >= 6,
  'control: the manager of tenancy B does see its rows in the same tables (the sweep is not vacuous)');

-- Full ID numbers can never be stored.
select is((select count(*)::int from information_schema.columns
           where table_schema = 'public' and table_name = 'identity_documents' and column_name ilike '%number%' and column_name <> 'number_last4'), 0,
  'identity documents have no column for a full ID number');

select * from finish();
rollback;
