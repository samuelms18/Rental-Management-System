-- 0005 complaints, expenses, dashboard + search functions.

create sequence public.complaint_code_seq;

create table public.complaints (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('CMP-' || lpad(nextval('public.complaint_code_seq')::text, 4, '0')),
  tenancy_id uuid not null references public.tenancies (id) on delete restrict,
  category text not null check (category in ('plumbing', 'electrical', 'water', 'bathroom', 'kitchen', 'leakage',
                                             'door_lock', 'appliance', 'cleaning', 'other')),
  title text not null check (length(title) between 1 and 140),
  description text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'urgent')),
  status text not null default 'raised'
    check (status in ('raised', 'acknowledged', 'assigned', 'in_progress', 'resolved', 'tenant_confirmed', 'closed')),
  assigned_name text,
  assigned_phone text,
  resolution_note text,
  resolution_cost_paise bigint check (resolution_cost_paise is null or resolution_cost_paise >= 0),
  reopened_count smallint not null default 0,
  resolved_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index complaints_tenancy_idx on public.complaints (tenancy_id, created_at desc);
create index complaints_status_idx on public.complaints (status);
alter table public.complaints enable row level security;
revoke delete, truncate on public.complaints from anon, authenticated;

create policy complaints_select_own on public.complaints
  for select to authenticated using (public.is_my_open_tenancy(tenancy_id));
create policy complaints_insert_own on public.complaints
  for insert to authenticated with check (public.is_my_open_tenancy(tenancy_id));
create policy complaints_select_staff on public.complaints
  for select to authenticated using (public.is_tenancy_staff(tenancy_id));
create policy complaints_insert_staff on public.complaints
  for insert to authenticated with check (public.is_tenancy_staff(tenancy_id));
create policy complaints_update_staff on public.complaints
  for update to authenticated using (public.is_tenancy_staff(tenancy_id))
  with check (public.is_tenancy_staff(tenancy_id));

create table public.complaint_updates (
  id bigint generated always as identity primary key,
  complaint_id uuid not null references public.complaints (id) on delete restrict,
  actor_id uuid references public.profiles (id) on delete set null,
  from_status text,
  to_status text not null,
  note text,
  created_at timestamptz not null default now()
);

create index complaint_updates_idx on public.complaint_updates (complaint_id, created_at);
alter table public.complaint_updates enable row level security;
revoke insert, update, delete, truncate on public.complaint_updates from anon, authenticated;

create or replace function public.complaint_tenancy_id(p_complaint_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tenancy_id from public.complaints where id = p_complaint_id;
$$;

create policy complaint_updates_select_own on public.complaint_updates
  for select to authenticated using (public.is_my_open_tenancy(public.complaint_tenancy_id(complaint_id)));
create policy complaint_updates_select_staff on public.complaint_updates
  for select to authenticated using (public.is_tenancy_staff(public.complaint_tenancy_id(complaint_id)));

create table public.complaint_media (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints (id) on delete restrict,
  path text not null unique,
  kind text not null check (kind in ('image', 'video')),
  uploaded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.complaint_media enable row level security;
revoke update, delete, truncate on public.complaint_media from anon, authenticated;

create policy complaint_media_select_own on public.complaint_media
  for select to authenticated using (public.is_my_open_tenancy(public.complaint_tenancy_id(complaint_id)));
create policy complaint_media_insert_own on public.complaint_media
  for insert to authenticated with check (public.is_my_open_tenancy(public.complaint_tenancy_id(complaint_id)));
create policy complaint_media_select_staff on public.complaint_media
  for select to authenticated using (public.is_tenancy_staff(public.complaint_tenancy_id(complaint_id)));
create policy complaint_media_insert_staff on public.complaint_media
  for insert to authenticated with check (public.is_tenancy_staff(public.complaint_tenancy_id(complaint_id)));

-- ---------------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete restrict,
  house_id uuid references public.houses (id) on delete restrict,
  category text not null check (category in ('plumbing', 'electrical', 'painting', 'cleaning', 'appliance', 'repair',
                                             'property_tax', 'other')),
  amount_paise bigint not null check (amount_paise > 0),
  spent_on date not null,
  description text not null,
  receipt_path text,
  complaint_id uuid references public.complaints (id) on delete restrict,
  notes text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index expenses_property_idx on public.expenses (property_id, spent_on desc);
alter table public.expenses enable row level security;

create policy expenses_select_staff on public.expenses
  for select to authenticated using (public.is_property_staff(property_id));
create policy expenses_insert_staff on public.expenses
  for insert to authenticated with check (public.is_property_staff(property_id));
create policy expenses_update_staff on public.expenses
  for update to authenticated using (public.is_property_staff(property_id))
  with check (public.is_property_staff(property_id));
create policy expenses_delete_owner on public.expenses
  for delete to authenticated using (public.is_property_owner(property_id));

create trigger expenses_audit
  after insert or update or delete on public.expenses
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Workflow
-- ---------------------------------------------------------------------------
create or replace function public.complaint_step(p_status text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'raised' then 1 when 'acknowledged' then 2 when 'assigned' then 3 when 'in_progress' then 4
    when 'resolved' then 5 when 'tenant_confirmed' then 6 when 'closed' then 7 end;
$$;

create or replace function public.complaints_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.status := 'raised';
  new.reopened_count := 0;
  new.resolved_at := null;
  if not public.is_tenancy_staff(new.tenancy_id) then
    new.assigned_name := null;
    new.assigned_phone := null;
    new.resolution_note := null;
    new.resolution_cost_paise := null;
  end if;
  return new;
end;
$$;

create trigger complaints_before_insert
  before insert on public.complaints
  for each row execute function public.complaints_before_insert();

-- Staff move complaints forward up to "resolved". Tenant confirm / reopen and the auto-close job
-- go through security-definer functions that set app.complaint_system.
create or replace function public.complaints_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tenancy_id <> old.tenancy_id or new.code <> old.code then
    raise exception 'tenancy and code cannot change' using errcode = 'check_violation';
  end if;
  if new.status is distinct from old.status
     and coalesce(current_setting('app.complaint_system', true), '') <> 'on' then
    if public.complaint_step(new.status) <= public.complaint_step(old.status)
       or public.complaint_step(new.status) > 5 then
      raise exception 'Complaint cannot move from % to %', old.status, new.status using errcode = 'check_violation';
    end if;
  end if;
  if new.status = 'resolved' and old.status <> 'resolved' then
    new.resolved_at := now();
  end if;
  new.reopened_count := case
    when coalesce(current_setting('app.complaint_system', true), '') = 'on' then new.reopened_count
    else old.reopened_count end;
  return new;
end;
$$;

create trigger complaints_before_update
  before update on public.complaints
  for each row execute function public.complaints_before_update();

create or replace function public.complaints_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_property uuid := public.tenancy_property_id(new.tenancy_id);
  v_house uuid;
begin
  if tg_op = 'INSERT' then
    insert into public.complaint_updates (complaint_id, actor_id, from_status, to_status)
    values (new.id, auth.uid(), null, 'raised');
    perform public.notify_property_staff(v_property, 'complaint_raised',
      jsonb_build_object('code', new.code, 'title', new.title, 'priority', new.priority),
      '/owner/complaints/' || new.id);
    return new;
  end if;

  if new.status is distinct from old.status then
    insert into public.complaint_updates (complaint_id, actor_id, from_status, to_status, note)
    values (new.id, auth.uid(), old.status, new.status,
            nullif(coalesce(current_setting('app.complaint_note', true), ''), ''));
    perform public.notify(public.tenancy_user_id(new.tenancy_id), 'complaint_status',
      jsonb_build_object('code', new.code, 'status', new.status), '/tenant/complaints/' || new.id);

    -- A resolution cost becomes an expense. It never touches the deposit automatically.
    if new.status = 'resolved' and coalesce(new.resolution_cost_paise, 0) > 0
       and not exists (select 1 from public.expenses e where e.complaint_id = new.id) then
      select t.house_id into v_house from public.tenancies t where t.id = new.tenancy_id;
      insert into public.expenses (property_id, house_id, category, amount_paise, spent_on, description, complaint_id)
      values (v_property, v_house,
              case when new.category in ('plumbing', 'electrical', 'appliance', 'cleaning') then new.category else 'repair' end,
              new.resolution_cost_paise, public.today_ist(), new.code || ': ' || new.title, new.id);
    end if;
  end if;
  return new;
end;
$$;

create trigger complaints_after_change
  after insert or update on public.complaints
  for each row execute function public.complaints_after_change();

create trigger complaints_audit
  after insert or update on public.complaints
  for each row execute function public.audit_row();

-- Staff status change with an optional note in one call.
create or replace function public.update_complaint(
  p_complaint_id uuid, p_status text, p_note text default null,
  p_assigned_name text default null, p_assigned_phone text default null,
  p_resolution_note text default null, p_resolution_cost_paise bigint default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform set_config('app.complaint_note', coalesce(p_note, ''), true);
  update public.complaints
  set status = p_status,
      assigned_name = coalesce(p_assigned_name, assigned_name),
      assigned_phone = coalesce(p_assigned_phone, assigned_phone),
      resolution_note = coalesce(p_resolution_note, resolution_note),
      resolution_cost_paise = coalesce(p_resolution_cost_paise, resolution_cost_paise)
  where id = p_complaint_id;
  if not found then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  perform set_config('app.complaint_note', '', true);
end;
$$;

create or replace function public.confirm_complaint(p_complaint_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.complaints;
begin
  select * into c from public.complaints where id = p_complaint_id for update;
  if not found or not public.is_my_open_tenancy(c.tenancy_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if c.status <> 'resolved' then
    raise exception 'Only a resolved complaint can be confirmed' using errcode = 'check_violation';
  end if;
  perform set_config('app.complaint_system', 'on', true);
  update public.complaints set status = 'tenant_confirmed' where id = p_complaint_id;
  perform set_config('app.complaint_system', '', true);
end;
$$;

create or replace function public.reopen_complaint(p_complaint_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.complaints;
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required' using errcode = 'check_violation';
  end if;
  select * into c from public.complaints where id = p_complaint_id for update;
  if not found or not public.is_my_open_tenancy(c.tenancy_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if c.status <> 'resolved' then
    raise exception 'Only a resolved complaint can be reopened' using errcode = 'check_violation';
  end if;
  if c.reopened_count >= 1 then
    raise exception 'A complaint can be reopened only once' using errcode = 'check_violation';
  end if;
  perform set_config('app.complaint_system', 'on', true);
  perform set_config('app.complaint_note', p_reason, true);
  update public.complaints
  set status = 'in_progress', reopened_count = reopened_count + 1, resolved_at = null
  where id = p_complaint_id;
  perform set_config('app.complaint_system', '', true);
  perform set_config('app.complaint_note', '', true);
  perform public.notify_property_staff(public.tenancy_property_id(c.tenancy_id), 'complaint_reopened',
    jsonb_build_object('code', c.code, 'reason', p_reason), '/owner/complaints/' || c.id);
end;
$$;

create or replace function public.auto_close_complaints(p_now timestamptz default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  perform set_config('app.complaint_system', 'on', true);
  perform set_config('app.complaint_note', 'Closed automatically: not confirmed within 7 days', true);
  update public.complaints
  set status = 'closed'
  where status = 'resolved' and resolved_at < coalesce(p_now, now()) - interval '7 days';
  get diagnostics v_n = row_count;
  perform set_config('app.complaint_system', '', true);
  perform set_config('app.complaint_note', '', true);
  return v_n;
end;
$$;

revoke execute on function public.auto_close_complaints(timestamptz) from public, anon, authenticated;

create or replace function public.run_job(p_job text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_result integer;
begin
  insert into public.scheduled_job_runs (job) values (p_job) returning id into v_id;
  begin
    v_result := case p_job
      when 'generate_rent_charges' then public.generate_rent_charges()
      when 'mark_overdue' then public.mark_overdue()
      when 'queue_reminders' then public.queue_reminders()
      when 'auto_close_complaints' then public.auto_close_complaints()
      else null
    end;
    if v_result is null then
      raise exception 'Unknown job %', p_job;
    end if;
    update public.scheduled_job_runs
    set finished_at = now(), ok = true, details = jsonb_build_object('rows', v_result)
    where id = v_id;
  exception when others then
    update public.scheduled_job_runs
    set finished_at = now(), ok = false, details = jsonb_build_object('error', sqlerrm)
    where id = v_id;
  end;
end;
$$;
revoke execute on function public.run_job(text) from public, anon, authenticated;

-- 01:10 IST = 19:40 UTC
select cron.schedule('auto_close_complaints', '40 19 * * *', $$select public.run_job('auto_close_complaints')$$);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('complaint-media', 'complaint-media', false, 52428800, array['image/webp', 'image/jpeg', 'image/png', 'video/mp4']),
  ('expense-receipts', 'expense-receipts', false, 10485760, array['image/webp', 'image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

-- Audit scoping for complaint rows.
create or replace function public.property_id_for_row(p_table text, p_row jsonb)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_table = 'properties' then
    return (p_row ->> 'id')::uuid;
  elsif p_row ? 'property_id' then
    return (p_row ->> 'property_id')::uuid;
  elsif p_row ? 'house_id' then
    return (select h.property_id from public.houses h where h.id = (p_row ->> 'house_id')::uuid);
  elsif p_row ? 'tenancy_id' then
    return public.tenancy_property_id((p_row ->> 'tenancy_id')::uuid);
  elsif p_row ? 'payment_id' then
    return public.tenancy_property_id(public.payment_tenancy_id((p_row ->> 'payment_id')::uuid));
  elsif p_row ? 'charge_id' then
    return public.tenancy_property_id((select c.tenancy_id from public.charges c where c.id = (p_row ->> 'charge_id')::uuid));
  elsif p_row ? 'complaint_id' then
    return public.tenancy_property_id(public.complaint_tenancy_id((p_row ->> 'complaint_id')::uuid));
  end if;
  return null;
end;
$$;
revoke execute on function public.property_id_for_row(text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Owner dashboard: "What needs my attention today?" (runs with the caller's RLS)
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
    'summary', jsonb_build_object(
      'houses_total', (select count(*) from public.houses),
      'houses_occupied', (select count(*) from public.houses where status = 'occupied'),
      'houses_vacant', (select count(*) from public.houses where status = 'vacant'),
      'rent_expected_paise', (select coalesce(sum(amount_paise), 0) from month_rent),
      'rent_collected_paise', (select coalesce(sum(paid), 0) from month_rent),
      'rent_pending_paise', (select coalesce(sum(amount_paise - paid), 0) from month_rent)
    )
  );
$$;

-- Global staff search (RLS limits results to the caller's properties).
create or replace function public.staff_search(p_q text)
returns table (kind text, id uuid, label text, sublabel text, link text)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (select '%' || lower(trim(p_q)) || '%' as pat)
  select 'tenant', tn.id, tn.full_name, tn.phone, '/owner/tenants/' || tn.id
  from public.tenants tn, q
  where public.is_staff() and (lower(tn.full_name) like q.pat or tn.phone like q.pat or lower(tn.email) like q.pat)
  union all
  select 'house', h.id, h.unit_number, p.name, '/owner/houses/' || h.id
  from public.houses h join public.properties p on p.id = h.property_id, q
  where lower(h.unit_number) like q.pat or lower(p.name) like q.pat
  union all
  select 'tenancy', t.id, t.code, tn.full_name, '/owner/tenancies/' || t.id
  from public.tenancies t join public.tenants tn on tn.id = t.tenant_id, q
  where lower(t.code) like q.pat
  union all
  select 'complaint', c.id, c.code, c.title, '/owner/complaints/' || c.id
  from public.complaints c, q
  where lower(c.code) like q.pat or lower(c.title) like q.pat
  union all
  select 'payment', p.id, coalesce(p.utr_reference, ''), p.amount_paise::text, '/owner/payments?id=' || p.id
  from public.payments p, q
  where p.utr_reference is not null and lower(p.utr_reference) like q.pat
  limit 30;
$$;
