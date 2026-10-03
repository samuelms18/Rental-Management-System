-- 0011 Full-month rent.
-- Family rule: the agreed rent is fixed. A tenant who moves in on the 4th (or mid-month) pays the full
-- month's rent for that month, and the last month is not reduced at move-out either. Rent is normally due on
-- the 1st, so that is the new default due day.

alter table public.tenancies alter column rent_due_day set default 1;

-- First month: full rent, due on the move-in date.
create or replace function public.tenancies_first_charge()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rent bigint;
  v_end date;
begin
  if new.status = 'active' and old.status = 'pending_agreement'
     and new.start_date >= date_trunc('month', public.today_ist())::date then
    v_rent := public.rent_for(new.id, new.start_date);
    if v_rent is null then
      raise exception 'Add the starting rent before activating' using errcode = 'check_violation';
    end if;
    v_end := (date_trunc('month', new.start_date) + interval '1 month - 1 day')::date;
    insert into public.charges (tenancy_id, type, period_start, period_end, amount_paise, due_date, notes)
    values (new.id, 'rent', new.start_date, v_end, v_rent, new.start_date, 'first month')
    on conflict (tenancy_id, period_start) where type = 'rent' do nothing;
  end if;
  -- Notice given: the last month's rent stays the full amount (no change).
  return new;
end;
$$;

-- Monthly charges: always the full rent, also for the month the tenant leaves.
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
  v_rent bigint;
  v_created integer := 0;
  v_rows integer;
begin
  for t in select * from public.tenancies where status in ('active', 'notice_period') loop
    foreach m in array array[
      date_trunc('month', v_today)::date,
      (date_trunc('month', v_today) + interval '1 month')::date
    ] loop
      v_due := make_date(extract(year from m)::int, extract(month from m)::int, t.rent_due_day);
      continue when v_due - 7 > v_today;                         -- not yet 7 days before due
      continue when m <= date_trunc('month', t.start_date)::date; -- first month is created at activation
      v_start := m;
      v_end := (m + interval '1 month - 1 day')::date;
      if t.status = 'notice_period' and t.actual_end_date is not null then
        continue when t.actual_end_date < v_start;
        v_end := least(v_end, t.actual_end_date);
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

-- The due-day placeholder now fills in "1st", "2nd", "5th"… so the template must not add its own "th".
update public.agreement_templates
set body_markdown = replace(body_markdown, '{{due_day}}th day', '{{due_day}} day')
where body_markdown like '%{{due_day}}th day%';
