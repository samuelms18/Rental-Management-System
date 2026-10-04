-- 0012 Notice-period rent rules, payment-waiting reminders, richer dashboard, team role changes.
--
-- Notice rule (owner's decision, Oct 2026): rent runs to the LATER of the move-out date and the end of the
-- notice period (notice date + notice days − 1). A tenant who leaves early still owes those months; they are
-- taken from the advance at settlement. Unpaid rent for months that start after that billing end is cancelled
-- automatically, and comes back if the notice is withdrawn.

-- ---------------------------------------------------------------------------
-- Notice date
-- ---------------------------------------------------------------------------
alter table public.tenancies add column notice_date date;

-- Set when notice is recorded (if not given), cleared when the notice is withdrawn.
create or replace function public.tenancies_notice_date()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'notice_period' and old.status is distinct from 'notice_period' and new.notice_date is null then
    new.notice_date := public.today_ist();
  end if;
  if new.status = 'active' and old.status = 'notice_period' then
    new.notice_date := null;
  end if;
  return new;
end;
$$;

create trigger tenancies_notice_date
  before update on public.tenancies
  for each row execute function public.tenancies_notice_date();

-- Existing notices: take the move-out record's date, else today.
update public.tenancies t
set notice_date = coalesce((select mo.notice_date from public.move_out_records mo where mo.tenancy_id = t.id), public.today_ist())
where t.status = 'notice_period' and t.notice_date is null;

-- "Notice given on" on the move-out page overrides the tenancy's notice date; a new record starts from it.
create or replace function public.move_out_notice_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.notice_date is null then
    select t.notice_date into new.notice_date from public.tenancies t where t.id = new.tenancy_id;
  end if;
  return new;
end;
$$;

create trigger move_out_notice_default
  before insert on public.move_out_records
  for each row execute function public.move_out_notice_sync();

create or replace function public.move_out_notice_to_tenancy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.notice_date is not null then
    update public.tenancies set notice_date = new.notice_date
    where id = new.tenancy_id and notice_date is distinct from new.notice_date
      and status in ('notice_period', 'completed');
  end if;
  return new;
end;
$$;

create trigger move_out_notice_to_tenancy
  after insert or update of notice_date on public.move_out_records
  for each row execute function public.move_out_notice_to_tenancy();

-- ---------------------------------------------------------------------------
-- Billing end
-- ---------------------------------------------------------------------------
create or replace function public.tenancy_billing_end(p_tenancy_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when t.status in ('notice_period', 'completed') and t.actual_end_date is not null then
      greatest(t.actual_end_date, coalesce(t.notice_date + t.notice_period_days - 1, t.actual_end_date))
  end
  from public.tenancies t where t.id = p_tenancy_id;
$$;

grant execute on function public.tenancy_billing_end(uuid) to authenticated, service_role;

-- Create any missing full-month rent charges from this month up to the billing end (used at settlement so an
-- early leaver's notice months exist and can be taken from the advance).
create or replace function public.ensure_rent_through(p_tenancy_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.tenancies;
  v_end date := public.tenancy_billing_end(p_tenancy_id);
  m date;
  v_rent bigint;
  v_n integer := 0;
  v_rows integer;
begin
  if v_end is null then
    return 0;
  end if;
  select * into t from public.tenancies where id = p_tenancy_id;
  m := greatest(date_trunc('month', public.today_ist())::date, (date_trunc('month', t.start_date) + interval '1 month')::date);
  while m <= v_end loop
    v_rent := public.rent_for(t.id, m);
    if v_rent is not null then
      insert into public.charges (tenancy_id, type, period_start, period_end, amount_paise, due_date)
      values (t.id, 'rent', m, least((m + interval '1 month - 1 day')::date, v_end), v_rent,
              make_date(extract(year from m)::int, extract(month from m)::int, t.rent_due_day))
      on conflict (tenancy_id, period_start) where type = 'rent' do nothing;
      get diagnostics v_rows = row_count;
      v_n := v_n + v_rows;
    end if;
    m := (m + interval '1 month')::date;
  end loop;
  return v_n;
end;
$$;

revoke execute on function public.ensure_rent_through(uuid) from public, anon, authenticated;

-- Cancel unpaid rent that starts after the billing end; bring it back when the billing end moves later
-- (or the notice is withdrawn).
create or replace function public.tenancies_rent_after_notice()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_end date := public.tenancy_billing_end(new.id);
  c record;
begin
  perform set_config('app.charge_system', 'on', true);
  for c in
    select ch.id from public.charges ch
    where ch.tenancy_id = new.id and ch.type = 'rent' and ch.status = 'cancelled'
      and ch.cancel_reason = 'after_billing_end'
      and (v_end is null or ch.period_start <= v_end)
  loop
    update public.charges set status = 'pending', cancel_reason = null where id = c.id;
    perform public.recompute_charge_status(c.id);
  end loop;
  if v_end is not null then
    update public.charges ch
    set status = 'cancelled', cancel_reason = 'after_billing_end'
    where ch.tenancy_id = new.id and ch.type = 'rent' and ch.period_start > v_end
      and ch.status in ('pending', 'overdue')
      and not exists (
        select 1 from public.payment_allocations a join public.payments p on p.id = a.payment_id
        where a.charge_id = ch.id and p.status in ('submitted', 'approved')
      );
  end if;
  perform set_config('app.charge_system', '', true);
  return new;
end;
$$;

create trigger tenancies_rent_after_notice
  after update of status, actual_end_date, notice_date, notice_period_days on public.tenancies
  for each row execute function public.tenancies_rent_after_notice();

-- Monthly charges stop at the billing end (not the move-out date).
create or replace function public.generate_rent_charges(p_today date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := coalesce(p_today, public.today_ist());
  t record;
  m date;
  v_due date;
  v_start date;
  v_end date;
  v_bill_end date;
  v_rent bigint;
  v_created integer := 0;
  v_rows integer;
begin
  for t in select * from public.tenancies where status in ('active', 'notice_period') loop
    v_bill_end := public.tenancy_billing_end(t.id);
    foreach m in array array[
      date_trunc('month', v_today)::date,
      (date_trunc('month', v_today) + interval '1 month')::date
    ] loop
      v_due := make_date(extract(year from m)::int, extract(month from m)::int, t.rent_due_day);
      continue when v_due - 7 > v_today;                         -- not yet 7 days before due
      continue when m <= date_trunc('month', t.start_date)::date; -- first month is created at activation
      v_start := m;
      v_end := (m + interval '1 month - 1 day')::date;
      if v_bill_end is not null then
        continue when v_bill_end < v_start;
        v_end := least(v_end, v_bill_end);
      end if;
      v_rent := public.rent_for(t.id, v_start);
      continue when v_rent is null;

      insert into public.charges (tenancy_id, type, period_start, period_end, amount_paise, due_date)
      values (t.id, 'rent', v_start, v_end, v_rent, v_due)
      on conflict (tenancy_id, period_start) where type = 'rent' do nothing;
      get diagnostics v_rows = row_count;
      v_created := v_created + v_rows;
    end loop;
  end loop;
  return v_created;
end;
$$;

revoke execute on function public.generate_rent_charges(date) from public, anon, authenticated;

-- Settlement: first make sure the notice-period months exist, then offset as before.
create or replace function public.share_settlement(p_tenancy_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  mo public.move_out_records;
  r record;
  v_balance bigint;
  v_take bigint;
  v_payment uuid;
begin
  if not public.is_tenancy_staff(p_tenancy_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into mo from public.move_out_records where tenancy_id = p_tenancy_id for update;
  if not found or mo.status <> 'draft' then
    raise exception 'Prepare the move-out record first' using errcode = 'check_violation';
  end if;

  perform public.ensure_rent_through(p_tenancy_id);

  if mo.final_eb_paise > 0 and not exists (
    select 1 from public.charges c where c.tenancy_id = p_tenancy_id and c.type = 'eb' and c.notes = 'final EB at move-out'
  ) then
    insert into public.charges (tenancy_id, type, period_start, period_end, amount_paise, due_date, notes)
    values (p_tenancy_id, 'eb', mo.move_out_date, mo.move_out_date, mo.final_eb_paise, mo.move_out_date, 'final EB at move-out');
  end if;

  perform set_config('app.deposit_system', 'on', true);
  for r in
    select c.id, c.type, c.amount_paise - public.charge_paid_paise(c.id) as outstanding
    from public.charges c
    where c.tenancy_id = p_tenancy_id and c.status in ('pending', 'partially_paid', 'overdue')
    order by c.due_date
  loop
    select balance into v_balance from public.deposit_summary(p_tenancy_id);
    exit when v_balance <= 0;
    v_take := least(v_balance, r.outstanding);
    continue when v_take <= 0;
    insert into public.payments (tenancy_id, charge_id, amount_paise, paid_on, method, paid_to, notes, submitted_by)
    values (p_tenancy_id, r.id, v_take, mo.move_out_date, 'deposit',
            case when r.type = 'eb' then 'tneb' else 'owner' end, 'Offset from deposit', auth.uid())
    returning id into v_payment;
    perform public.approve_payment(v_payment, jsonb_build_array(jsonb_build_object('charge_id', r.id, 'amount_paise', v_take)));
    insert into public.deposit_transactions (tenancy_id, type, amount_paise, reason, charge_id, created_by)
    values (p_tenancy_id, case when r.type in ('eb', 'eb_reimbursement') then 'offset_eb' else 'offset_rent' end,
            v_take, 'Unpaid ' || r.type, r.id, auth.uid());
  end loop;
  perform set_config('app.deposit_system', '', true);

  update public.move_out_records
  set status = 'shared_with_tenant', shared_at = now(),
      refund_paise = greatest((select balance from public.deposit_summary(p_tenancy_id)), 0)
  where id = mo.id;
  perform public.notify(public.tenancy_user_id(p_tenancy_id), 'settlement_shared', '{}'::jsonb, '/tenant/settlement');
end;
$$;

-- ---------------------------------------------------------------------------
-- Reminders pause while a payment is waiting for approval (they resume if it is rejected).
-- ---------------------------------------------------------------------------
create or replace function public.reminders_due(p_date date default null)
returns table (
  charge_id uuid, tenancy_id uuid, tenancy_code text, type text, amount_paise bigint, outstanding_paise bigint,
  due_date date, days_from_due integer, stage text, tenant_name text, tenant_phone text, tenant_language text,
  tenant_user_id uuid, house_unit text, property_id uuid
)
language sql
stable
security invoker
set search_path = ''
as $$
  with d as (select coalesce(p_date, public.today_ist()) as today)
  select c.id, c.tenancy_id, t.code, c.type, c.amount_paise,
         c.amount_paise - public.charge_paid_paise(c.id),
         c.due_date, (d.today - c.due_date)::int,
         case when d.today < c.due_date then 'upcoming' when d.today = c.due_date then 'due' else 'overdue' end,
         tn.full_name, tn.phone, coalesce(pr.preferred_language, 'en'), tn.user_id, h.unit_number, h.property_id
  from d
  cross join public.charges c
  join public.tenancies t on t.id = c.tenancy_id
  join public.tenants tn on tn.id = t.tenant_id
  left join public.profiles pr on pr.id = tn.user_id
  join public.houses h on h.id = t.house_id
  join public.reminder_rules rr on rr.property_id = h.property_id
  where c.status in ('pending', 'partially_paid', 'overdue')
    and c.type in ('rent', 'eb', 'eb_reimbursement')
    and t.status in ('active', 'notice_period')
    and not exists (
      select 1 from public.payments p
      where p.status = 'submitted'
        and (p.charge_id = c.id or (p.charge_id is null and p.tenancy_id = c.tenancy_id))
    )
    and (
      (d.today - c.due_date) = any (rr.offsets)
      or (d.today > c.due_date and ((d.today - c.due_date) % rr.overdue_every_days) = 0)
    )
  order by c.due_date, h.unit_number;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard: older unpaid rent and one card per house.
-- ---------------------------------------------------------------------------
create or replace function public.staff_dashboard()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with d as (
    select public.today_ist() as today, date_trunc('month', public.today_ist())::date as m0
  ),
  live as (
    select t.*, h.unit_number, h.property_id, tn.full_name as tenant_name, tn.phone as tenant_phone
    from public.tenancies t
    join public.houses h on h.id = t.house_id
    join public.tenants tn on tn.id = t.tenant_id
    where t.status in ('active', 'notice_period')
  ),
  open_charges as (
    select c.*, l.unit_number, l.tenant_name, l.code as tenancy_code,
           c.amount_paise - public.charge_paid_paise(c.id) as outstanding_paise
    from public.charges c join live l on l.id = c.tenancy_id
    where c.status in ('pending', 'partially_paid', 'overdue')
  ),
  month_rent as (
    select c.amount_paise, public.charge_paid_paise(c.id) as paid
    from public.charges c, d
    where c.type = 'rent' and c.status <> 'cancelled'
      and c.period_start >= d.m0 and c.period_start < (d.m0 + interval '1 month')
  )
  select jsonb_build_object(
    'pending_payments', coalesce((
      select jsonb_agg(x order by x.created_at) from (
        select p.id, p.amount_paise, p.paid_on, p.method, p.utr_reference, p.created_at,
               t.code as tenancy_code, h.unit_number, tn.full_name as tenant_name
        from public.payments p
        join public.tenancies t on t.id = p.tenancy_id
        join public.houses h on h.id = t.house_id
        join public.tenants tn on tn.id = t.tenant_id
        where p.status = 'submitted'
      ) x), '[]'::jsonb),
    'overdue', coalesce((
      select jsonb_agg(x order by x.due_date) from (
        select oc.id, oc.type, oc.outstanding_paise, oc.due_date, (d.today - oc.due_date) as days_overdue,
               oc.unit_number, oc.tenant_name, oc.tenancy_code
        from open_charges oc, d where oc.due_date < d.today
      ) x), '[]'::jsonb),
    'complaints', coalesce((
      select jsonb_agg(x order by x.priority_rank, x.created_at) from (
        select c.id, c.code, c.title, c.priority, c.status, c.created_at, h.unit_number,
               case c.priority when 'urgent' then 0 else 1 end as priority_rank
        from public.complaints c
        join public.tenancies t on t.id = c.tenancy_id
        join public.houses h on h.id = t.house_id
        where c.status = 'raised' or (c.priority = 'urgent' and c.status in ('acknowledged', 'assigned', 'in_progress'))
      ) x), '[]'::jsonb),
    'due_soon', coalesce((
      select jsonb_agg(x order by x.due_date) from (
        select oc.id, oc.type, oc.outstanding_paise, oc.due_date, oc.unit_number, oc.tenant_name, oc.tenancy_code
        from open_charges oc, d where oc.due_date between d.today and d.today + 7
      ) x), '[]'::jsonb),
    'ending', coalesce((
      select jsonb_agg(x order by x.end_date) from (
        select l.id, l.code, l.unit_number, l.tenant_name, l.status,
               coalesce(case when l.status = 'notice_period' then l.actual_end_date end, l.expected_end_date) as end_date
        from live l, d
        where l.status = 'notice_period'
           or (l.expected_end_date is not null and l.expected_end_date <= d.today + 90)
      ) x), '[]'::jsonb),
    'houses', coalesce((
      select jsonb_agg(x order by x.unit_number) from (
        select h.id, h.unit_number, h.status as house_status,
               l.id as tenancy_id, l.status as tenancy_status, l.tenant_name,
               coalesce((select sum(oc.outstanding_paise) from open_charges oc where oc.tenancy_id = l.id), 0) as outstanding_paise,
               exists (select 1 from open_charges oc, d where oc.tenancy_id = l.id and oc.due_date < d.today) as has_overdue
        from public.houses h
        left join live l on l.house_id = h.id
      ) x), '[]'::jsonb),
    'summary', jsonb_build_object(
      'houses_total', (select count(*) from public.houses),
      'houses_occupied', (select count(*) from public.houses where status = 'occupied'),
      'houses_vacant', (select count(*) from public.houses where status = 'vacant'),
      'rent_expected_paise', (select coalesce(sum(amount_paise), 0) from month_rent),
      'rent_collected_paise', (select coalesce(sum(paid), 0) from month_rent),
      'rent_pending_paise', (select coalesce(sum(amount_paise - paid), 0) from month_rent),
      'older_unpaid_paise', (
        select coalesce(sum(oc.outstanding_paise), 0) from open_charges oc, d
        where oc.type = 'rent' and oc.period_start < d.m0
      )
    )
  );
$$;

-- ---------------------------------------------------------------------------
-- Team: owners change roles (owner ⇄ manager) and remove members; never leave a property without an owner.
-- ---------------------------------------------------------------------------
create or replace function public.property_members_keep_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_property uuid := coalesce(old.property_id, new.property_id);
begin
  if not exists (select 1 from public.property_members m where m.property_id = v_property and m.role = 'owner') then
    raise exception 'A property must keep at least one owner' using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create constraint trigger property_members_keep_owner
  after update or delete on public.property_members
  deferrable initially deferred
  for each row execute function public.property_members_keep_owner();

-- Change a person's role on every property the caller owns.
create or replace function public.set_member_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_role not in ('owner', 'manager') then
    raise exception 'Unknown role' using errcode = 'check_violation';
  end if;
  if not public.is_any_owner() then
    raise exception 'Only an owner can change roles' using errcode = 'insufficient_privilege';
  end if;
  update public.property_members m set role = p_role
  where m.user_id = p_user_id and m.role <> p_role
    and exists (
      select 1 from public.property_members me
      where me.property_id = m.property_id and me.user_id = auth.uid() and me.role = 'owner'
    );
end;
$$;

-- Remove a person from every property the caller owns (their login stays, but sees nothing).
create or replace function public.remove_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_any_owner() then
    raise exception 'Only an owner can remove someone' using errcode = 'insufficient_privilege';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot remove yourself' using errcode = 'check_violation';
  end if;
  delete from public.property_members m
  where m.user_id = p_user_id
    and exists (
      select 1 from public.property_members me
      where me.property_id = m.property_id and me.user_id = auth.uid() and me.role = 'owner'
    );
end;
$$;

revoke execute on function public.set_member_role(uuid, text) from public, anon;
revoke execute on function public.remove_member(uuid) from public, anon;
grant execute on function public.set_member_role(uuid, text) to authenticated;
grant execute on function public.remove_member(uuid) to authenticated;
