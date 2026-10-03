-- 0009 reports and history. All functions run with the caller's RLS (security invoker), sum in paise,
-- and are filtered by date range and optionally property / house.
-- Rent is reported by the month it is FOR (charge period), "collected" = approved payments applied to it.

create or replace function public.report_rent(
  p_from date, p_to date, p_property_id uuid default null, p_house_id uuid default null
)
returns table (
  month date, house_id uuid, unit_number text, property_name text,
  expected_paise bigint, collected_paise bigint, pending_paise bigint, overdue_paise bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select date_trunc('month', c.period_start)::date, h.id, h.unit_number, p.name,
         sum(c.amount_paise)::bigint,
         sum(public.charge_paid_paise(c.id))::bigint,
         sum(c.amount_paise - public.charge_paid_paise(c.id))::bigint,
         sum(case when c.due_date < public.today_ist() then c.amount_paise - public.charge_paid_paise(c.id) else 0 end)::bigint
  from public.charges c
  join public.tenancies t on t.id = c.tenancy_id
  join public.houses h on h.id = t.house_id
  join public.properties p on p.id = h.property_id
  where c.type = 'rent' and c.status <> 'cancelled'
    and c.period_start between p_from and p_to
    and (p_property_id is null or h.property_id = p_property_id)
    and (p_house_id is null or h.id = p_house_id)
  group by 1, 2, 3, 4
  order by 1, 3;
$$;

create or replace function public.report_eb(
  p_from date, p_to date, p_property_id uuid default null, p_house_id uuid default null
)
returns table (
  house_id uuid, unit_number text, billed_paise bigint, paid_by_tenant_paise bigint, paid_by_owner_paise bigint,
  reimbursed_paise bigint, outstanding_paise bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with bills as (
    select b.*, h.unit_number
    from public.eb_bills b join public.houses h on h.id = b.house_id
    where b.period_start between p_from and p_to
      and (p_property_id is null or h.property_id = p_property_id)
      and (p_house_id is null or h.id = p_house_id)
  ),
  ch as (
    select c.source_id, c.type, c.amount_paise, public.charge_paid_paise(c.id) as paid
    from public.charges c where c.type in ('eb', 'eb_reimbursement') and c.status <> 'cancelled'
  )
  select b.house_id, b.unit_number,
         sum(b.total_paise)::bigint,
         coalesce(sum(case when b.paid_by = 'tenant_direct' and b.status = 'paid' then b.total_paise end), 0)::bigint,
         coalesce(sum(case when b.owner_paid_on is not null then b.total_paise end), 0)::bigint,
         coalesce(sum((select sum(ch.paid) from ch where ch.source_id = b.id and ch.type = 'eb_reimbursement')), 0)::bigint,
         coalesce(sum((select sum(ch.amount_paise - ch.paid) from ch where ch.source_id = b.id)), 0)::bigint
  from bills b
  group by 1, 2
  order by 2;
$$;

create or replace function public.report_expenses(
  p_from date, p_to date, p_property_id uuid default null, p_house_id uuid default null
)
returns table (category text, house_id uuid, unit_number text, total_paise bigint, items bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.category, e.house_id, coalesce(h.unit_number, ''), sum(e.amount_paise)::bigint, count(*)
  from public.expenses e left join public.houses h on h.id = e.house_id
  where e.spent_on between p_from and p_to
    and (p_property_id is null or e.property_id = p_property_id)
    and (p_house_id is null or e.house_id = p_house_id)
  group by 1, 2, 3
  order by 4 desc;
$$;

create or replace function public.report_deposits(p_property_id uuid default null, p_house_id uuid default null)
returns table (
  tenancy_id uuid, code text, unit_number text, tenant_name text, status text,
  received_paise bigint, deductions_paise bigint, offsets_paise bigint, refunded_paise bigint, held_paise bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select t.id, t.code, h.unit_number, tn.full_name, t.status,
         coalesce(sum(d.amount_paise) filter (where d.type = 'received'), 0)::bigint,
         coalesce(sum(d.amount_paise) filter (where d.type = 'deduction'), 0)::bigint,
         coalesce(sum(d.amount_paise) filter (where d.type in ('offset_rent', 'offset_eb')), 0)::bigint,
         coalesce(sum(d.amount_paise) filter (where d.type = 'refund'), 0)::bigint,
         coalesce(sum(case when d.type = 'received' then d.amount_paise else -d.amount_paise end), 0)::bigint
  from public.tenancies t
  join public.houses h on h.id = t.house_id
  join public.tenants tn on tn.id = t.tenant_id
  join public.deposit_transactions d on d.tenancy_id = t.id
  where (p_property_id is null or h.property_id = p_property_id)
    and (p_house_id is null or h.id = p_house_id)
  group by 1, 2, 3, 4, 5
  order by 3, 2;
$$;

-- Net income per house = rent collected (for months in range) − expenses (spent in range).
create or replace function public.report_net_income(
  p_from date, p_to date, p_property_id uuid default null, p_house_id uuid default null
)
returns table (house_id uuid, unit_number text, rent_collected_paise bigint, expenses_paise bigint, net_paise bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with houses as (
    select h.id, h.unit_number from public.houses h
    where (p_property_id is null or h.property_id = p_property_id) and (p_house_id is null or h.id = p_house_id)
  ),
  rent as (
    select r.house_id, sum(r.collected_paise) as v from public.report_rent(p_from, p_to, p_property_id, p_house_id) r group by 1
  ),
  exp as (
    select e.house_id, sum(e.amount_paise) as v from public.expenses e
    where e.spent_on between p_from and p_to and e.house_id is not null group by 1
  )
  select h.id, h.unit_number, coalesce(r.v, 0)::bigint, coalesce(e.v, 0)::bigint, (coalesce(r.v, 0) - coalesce(e.v, 0))::bigint
  from houses h left join rent r on r.house_id = h.id left join exp e on e.house_id = h.id
  order by 2;
$$;

-- Lifetime timeline of a house (staff only through RLS on each table).
create or replace function public.house_timeline(p_house_id uuid, p_major_repair_paise bigint default 500000)
returns table (on_date date, kind text, label text, amount_paise bigint, ref_id uuid)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from (
    select t.start_date as on_date, 'move_in' as kind, tn.full_name as label, null::bigint as amount_paise, t.id as ref_id
    from public.tenancies t join public.tenants tn on tn.id = t.tenant_id
    where t.house_id = p_house_id and t.status in ('active', 'notice_period', 'completed')
    union all
    select t.actual_end_date, 'move_out', tn.full_name, null::bigint, t.id
    from public.tenancies t join public.tenants tn on tn.id = t.tenant_id
    where t.house_id = p_house_id and t.status = 'completed' and t.actual_end_date is not null
    union all
    select r.effective_from, 'rent_change', tn.full_name, r.amount_paise, t.id
    from public.rent_revisions r join public.tenancies t on t.id = r.tenancy_id join public.tenants tn on tn.id = t.tenant_id
    where t.house_id = p_house_id and r.effective_from > t.start_date
    union all
    select a.approved_at::date, 'agreement', tn.full_name, a.rent_paise, a.id
    from public.agreements a join public.tenancies t on t.id = a.tenancy_id join public.tenants tn on tn.id = t.tenant_id
    where t.house_id = p_house_id and a.approved_at is not null
    union all
    select mo.settled_at::date, 'settlement', tn.full_name, mo.refund_paise, t.id
    from public.move_out_records mo join public.tenancies t on t.id = mo.tenancy_id join public.tenants tn on tn.id = t.tenant_id
    where t.house_id = p_house_id and mo.status = 'settled'
    union all
    select e.spent_on, 'repair', e.description, e.amount_paise, e.id
    from public.expenses e where e.house_id = p_house_id and e.amount_paise >= p_major_repair_paise
  ) x
  where x.on_date is not null
  order by 1 desc;
$$;

-- Meter readings with units used since the previous reading.
create or replace function public.meter_history(p_house_id uuid)
returns table (id uuid, read_on date, reading numeric, stage text, units numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select m.id, m.read_on, m.reading, m.stage,
         m.reading - lag(m.reading) over (order by m.read_on, m.created_at)
  from public.meter_readings m
  where m.house_id = p_house_id
  order by m.read_on, m.created_at;
$$;

-- Free-tier usage for the staff warning (DB size and stored files). Staff only.
create or replace function public.usage_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', coalesce((select sum((o.metadata ->> 'size')::bigint) from storage.objects o), 0),
    'files', (select count(*) from storage.objects)
  );
end;
$$;
