-- 0007 move-in, move-out, deposit settlement, meter readings, retention purge, former-tenant access.

create table public.meter_readings (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete restrict,
  tenancy_id uuid references public.tenancies (id) on delete restrict,
  reading numeric(12, 1) not null check (reading >= 0),
  read_on date not null default public.today_ist(),
  photo_path text,
  stage text not null default 'regular' check (stage in ('move_in', 'move_out', 'regular')),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index meter_readings_house_idx on public.meter_readings (house_id, read_on);
alter table public.meter_readings enable row level security;
revoke delete, truncate on public.meter_readings from anon, authenticated;

create policy meter_readings_staff on public.meter_readings
  for all to authenticated using (public.is_house_staff(house_id)) with check (public.is_house_staff(house_id));
create policy meter_readings_select_own on public.meter_readings
  for select to authenticated using (tenancy_id is not null and public.is_my_open_tenancy(tenancy_id));

create trigger meter_readings_audit
  after insert or update on public.meter_readings
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
create table public.move_in_records (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null unique references public.tenancies (id) on delete restrict,
  checklist jsonb not null default '{}'::jsonb,
  meter_reading_id uuid references public.meter_readings (id),
  advance_received_paise bigint check (advance_received_paise is null or advance_received_paise >= 0),
  advance_received_on date,
  advance_method text check (advance_method is null or advance_method in ('upi', 'cash', 'bank_transfer', 'other')),
  advance_reference text,
  completed_at timestamptz,
  completed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.move_in_records enable row level security;
revoke delete, truncate on public.move_in_records from anon, authenticated;
create policy move_in_staff on public.move_in_records
  for all to authenticated using (public.is_tenancy_staff(tenancy_id)) with check (public.is_tenancy_staff(tenancy_id));
create policy move_in_select_own on public.move_in_records
  for select to authenticated using (public.is_my_open_tenancy(tenancy_id));

create trigger move_in_records_audit
  after insert or update on public.move_in_records
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
create table public.tenancy_photos (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies (id) on delete restrict,
  stage text not null check (stage in ('move_in', 'move_out')),
  area text not null check (area in ('exterior', 'living', 'bedroom', 'kitchen', 'bathroom', 'balcony',
                                     'parking', 'meter', 'other')),
  path text not null unique,
  caption text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index tenancy_photos_idx on public.tenancy_photos (tenancy_id, stage, area);
alter table public.tenancy_photos enable row level security;
revoke update, delete, truncate on public.tenancy_photos from anon, authenticated;
create policy tenancy_photos_staff on public.tenancy_photos
  for all to authenticated using (public.is_tenancy_staff(tenancy_id)) with check (public.is_tenancy_staff(tenancy_id));

-- ---------------------------------------------------------------------------
-- Deposit ledger. The refund is always computed from these rows, never typed in.
create table public.deposit_transactions (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies (id) on delete restrict,
  type text not null check (type in ('received', 'deduction', 'offset_rent', 'offset_eb', 'refund')),
  amount_paise bigint not null check (amount_paise > 0),
  reason text,
  photo_path text,
  charge_id uuid references public.charges (id) on delete restrict,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (type <> 'deduction' or coalesce(trim(reason), '') <> '')
);

create index deposit_transactions_tenancy_idx on public.deposit_transactions (tenancy_id, created_at);
alter table public.deposit_transactions enable row level security;
revoke update, truncate on public.deposit_transactions from anon, authenticated;

create trigger deposit_transactions_audit
  after insert or update or delete on public.deposit_transactions
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
create table public.move_out_records (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null unique references public.tenancies (id) on delete restrict,
  notice_date date,
  move_out_date date not null,
  meter_reading_id uuid references public.meter_readings (id),
  eb_units numeric(12, 1),
  eb_rate_paise integer check (eb_rate_paise is null or eb_rate_paise >= 0),
  final_eb_paise bigint not null default 0 check (final_eb_paise >= 0),
  inspection_notes text,
  status text not null default 'draft' check (status in ('draft', 'shared_with_tenant', 'acknowledged', 'disputed', 'settled')),
  tenant_note text,
  refund_paise bigint,
  refund_date date,
  refund_method text check (refund_method is null or refund_method in ('upi', 'cash', 'bank_transfer', 'other')),
  refund_reference text,
  statement_path text,
  shared_at timestamptz,
  settled_at timestamptz,
  settled_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.move_out_records enable row level security;
revoke delete, truncate on public.move_out_records from anon, authenticated;

-- Former tenants keep read-only access to their own settlement for 90 days after it is settled.
create or replace function public.is_my_settlement(p_tenancy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_my_open_tenancy(p_tenancy_id) or exists (
    select 1
    from public.tenancies t
    join public.tenants tn on tn.id = t.tenant_id
    join public.move_out_records mo on mo.tenancy_id = t.id
    where t.id = p_tenancy_id and tn.user_id = auth.uid() and t.status = 'completed'
      and mo.settled_at > now() - interval '90 days'
  );
$$;

create policy deposit_staff_select on public.deposit_transactions
  for select to authenticated using (public.is_tenancy_staff(tenancy_id));
create policy deposit_staff_insert on public.deposit_transactions
  for insert to authenticated with check (public.is_tenancy_staff(tenancy_id) and type in ('received', 'deduction'));
-- Deductions can be removed while the settlement is still a draft (guarded below).
create policy deposit_staff_delete on public.deposit_transactions
  for delete to authenticated using (public.is_tenancy_staff(tenancy_id) and type = 'deduction');

create policy move_out_staff_select on public.move_out_records
  for select to authenticated using (public.is_tenancy_staff(tenancy_id));
create policy move_out_staff_insert on public.move_out_records
  for insert to authenticated with check (public.is_tenancy_staff(tenancy_id));
create policy move_out_staff_update on public.move_out_records
  for update to authenticated using (public.is_tenancy_staff(tenancy_id) and status = 'draft')
  with check (public.is_tenancy_staff(tenancy_id) and status = 'draft');
create policy move_out_select_own on public.move_out_records
  for select to authenticated using (status <> 'draft' and public.is_my_settlement(tenancy_id));
create policy deposit_select_own on public.deposit_transactions
  for select to authenticated using (
    public.is_my_settlement(tenancy_id)
    and exists (select 1 from public.move_out_records mo where mo.tenancy_id = deposit_transactions.tenancy_id and mo.status <> 'draft')
  );

create trigger move_out_records_audit
  after insert or update on public.move_out_records
  for each row execute function public.audit_row();

-- Deductions are frozen once the statement is shared.
create or replace function public.deposit_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select status into v_status from public.move_out_records where tenancy_id = coalesce(new.tenancy_id, old.tenancy_id);
  if coalesce(current_setting('app.deposit_system', true), '') <> 'on' and v_status is not null and v_status <> 'draft' then
    raise exception 'The settlement statement has been shared; deposit entries are locked' using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger deposit_guard
  before insert or delete on public.deposit_transactions
  for each row execute function public.deposit_guard();

-- Totals for a tenancy's deposit (paise). refund = received − deductions − offsets − already refunded.
create or replace function public.deposit_summary(p_tenancy_id uuid)
returns table (received bigint, deductions bigint, offset_rent bigint, offset_eb bigint, refunded bigint, balance bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(sum(amount_paise) filter (where type = 'received'), 0),
    coalesce(sum(amount_paise) filter (where type = 'deduction'), 0),
    coalesce(sum(amount_paise) filter (where type = 'offset_rent'), 0),
    coalesce(sum(amount_paise) filter (where type = 'offset_eb'), 0),
    coalesce(sum(amount_paise) filter (where type = 'refund'), 0),
    coalesce(sum(case when type = 'received' then amount_paise else -amount_paise end), 0)
  from public.deposit_transactions
  where tenancy_id = p_tenancy_id;
$$;

-- Move-in completion records the advance as "received" in the deposit ledger.
create or replace function public.complete_move_in(p_tenancy_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.move_in_records;
begin
  if not public.is_tenancy_staff(p_tenancy_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into m from public.move_in_records where tenancy_id = p_tenancy_id for update;
  if not found or m.advance_received_paise is null then
    raise exception 'Record the advance received first' using errcode = 'check_violation';
  end if;
  if m.completed_at is not null then
    return;
  end if;
  if m.advance_received_paise > 0 and not exists (
    select 1 from public.deposit_transactions where tenancy_id = p_tenancy_id and type = 'received'
  ) then
    insert into public.deposit_transactions (tenancy_id, type, amount_paise, reason, created_by)
    values (p_tenancy_id, 'received', m.advance_received_paise, 'Advance at move-in', auth.uid());
  end if;
  update public.move_in_records set completed_at = now(), completed_by = auth.uid() where id = m.id;
end;
$$;

-- Payments made from the deposit don't get a rent receipt.
alter table public.payments drop constraint payments_method_check;
alter table public.payments add constraint payments_method_check
  check (method in ('upi', 'cash', 'bank_transfer', 'other', 'deposit'));

create or replace function public.approve_payment(p_payment_id uuid, p_allocations jsonb default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments;
  v_remaining bigint;
  v_take bigint;
  v_outstanding bigint;
  r record;
  v_receipt uuid;
begin
  select * into p from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found';
  end if;
  if not public.is_tenancy_staff(p.tenancy_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if p.status <> 'submitted' then
    raise exception 'Payment is already %', p.status using errcode = 'check_violation';
  end if;

  update public.payments
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_payment_id;

  if p_allocations is not null and jsonb_array_length(p_allocations) > 0 then
    insert into public.payment_allocations (payment_id, charge_id, amount_paise)
    select p_payment_id, (a ->> 'charge_id')::uuid, (a ->> 'amount_paise')::bigint
    from jsonb_array_elements(p_allocations) a;
  else
    v_remaining := p.amount_paise;
    for r in
      select c.id, c.amount_paise
      from public.charges c
      where c.tenancy_id = p.tenancy_id
        and c.status in ('pending', 'partially_paid', 'overdue')
        and (case when p.paid_to = 'tneb' then c.type = 'eb' else c.type <> 'eb' end)
      order by (c.id = p.charge_id) desc nulls last, c.due_date, c.created_at
    loop
      exit when v_remaining <= 0;
      select r.amount_paise - coalesce(sum(a.amount_paise), 0) into v_outstanding
      from public.payment_allocations a join public.payments pp on pp.id = a.payment_id
      where a.charge_id = r.id and pp.status in ('submitted', 'approved');
      v_take := least(v_remaining, v_outstanding);
      if v_take > 0 then
        insert into public.payment_allocations (payment_id, charge_id, amount_paise)
        values (p_payment_id, r.id, v_take);
        v_remaining := v_remaining - v_take;
      end if;
    end loop;
  end if;

  for r in select charge_id from public.payment_allocations where payment_id = p_payment_id loop
    perform public.recompute_charge_status(r.charge_id);
  end loop;

  if p.paid_to = 'owner' and p.method <> 'deposit' then
    v_receipt := public.issue_receipt(p_payment_id);
  end if;

  if p.method <> 'deposit' then
    perform public.notify(public.tenancy_user_id(p.tenancy_id), 'payment_approved',
      jsonb_build_object('amount_paise', p.amount_paise), '/tenant/payments');
  end if;
  return v_receipt;
end;
$$;

-- Prepare the move-out: final EB as a charge, then share the statement with the tenant.
-- Outstanding rent/EB is offset against the deposit (recorded as deposit-method payments, so charges close).
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

-- Tenant: acknowledge or dispute the statement.
create or replace function public.respond_settlement(p_tenancy_id uuid, p_accept boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  mo public.move_out_records;
begin
  if not public.is_my_settlement(p_tenancy_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into mo from public.move_out_records where tenancy_id = p_tenancy_id for update;
  if mo.status not in ('shared_with_tenant', 'disputed') then
    raise exception 'Nothing to respond to' using errcode = 'check_violation';
  end if;
  if not p_accept and coalesce(trim(p_note), '') = '' then
    raise exception 'Please write what you disagree with' using errcode = 'check_violation';
  end if;
  update public.move_out_records
  set status = case when p_accept then 'acknowledged' else 'disputed' end, tenant_note = coalesce(p_note, tenant_note)
  where id = mo.id;
  perform public.notify_property_staff(public.tenancy_property_id(p_tenancy_id),
    case when p_accept then 'settlement_acknowledged' else 'settlement_disputed' end,
    jsonb_build_object('note', coalesce(p_note, '')), '/owner/tenancies/' || p_tenancy_id || '/move-out');
end;
$$;

-- Staff: reopen a shared/disputed statement for corrections (offsets stay; deductions editable again).
create or replace function public.reopen_settlement(p_tenancy_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_tenancy_staff(p_tenancy_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  update public.move_out_records set status = 'draft', shared_at = null
  where tenancy_id = p_tenancy_id and status in ('shared_with_tenant', 'disputed', 'acknowledged');
end;
$$;

-- Settle: record the refund, complete the tenancy, start the 12-month ID retention clock.
create or replace function public.settle_move_out(
  p_tenancy_id uuid, p_refund_date date, p_method text, p_reference text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  mo public.move_out_records;
  t public.tenancies;
  v_balance bigint;
begin
  if not public.is_tenancy_staff(p_tenancy_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  select * into mo from public.move_out_records where tenancy_id = p_tenancy_id for update;
  if not found or mo.status not in ('shared_with_tenant', 'acknowledged', 'disputed') then
    raise exception 'Share the statement with the tenant first' using errcode = 'check_violation';
  end if;
  select * into t from public.tenancies where id = p_tenancy_id for update;
  select balance into v_balance from public.deposit_summary(p_tenancy_id);

  perform set_config('app.deposit_system', 'on', true);
  if v_balance > 0 then
    insert into public.deposit_transactions (tenancy_id, type, amount_paise, reason, created_by)
    values (p_tenancy_id, 'refund', v_balance, coalesce(p_method, '') || ' ' || coalesce(p_reference, ''), auth.uid());
  end if;
  perform set_config('app.deposit_system', '', true);

  update public.move_out_records
  set status = 'settled', settled_at = now(), settled_by = auth.uid(), refund_paise = greatest(v_balance, 0),
      refund_date = p_refund_date, refund_method = p_method, refund_reference = p_reference
  where id = mo.id;

  if t.status = 'active' then
    update public.tenancies set status = 'notice_period', actual_end_date = mo.move_out_date where id = t.id;
  elsif t.actual_end_date is distinct from mo.move_out_date then
    update public.tenancies set actual_end_date = mo.move_out_date where id = t.id;
  end if;
  update public.tenancies set status = 'completed' where id = t.id;

  -- End occupants and the active agreement.
  update public.occupants set end_date = mo.move_out_date where tenancy_id = t.id and end_date is null;
  perform set_config('app.agreement_system', 'on', true);
  update public.agreements set status = 'expired' where tenancy_id = t.id and status in ('active', 'approved');
  perform set_config('app.agreement_system', '', true);

  -- Identity documents (tenant, occupants, guests, domestic help) are purged 12 months after settlement.
  update public.identity_documents set purge_after = (now() + interval '12 months')::date
  where tenancy_id = t.id and purge_after is null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Retention: documents past purge_after. The server deletes the files, then calls purge_documents().
create or replace function public.documents_due_for_purge(p_today date default null)
returns table (id uuid, front_path text, back_path text)
language sql
stable
security definer
set search_path = ''
as $$
  select d.id, d.front_path, d.back_path
  from public.identity_documents d
  where d.purge_after is not null and d.purge_after <= coalesce(p_today, public.today_ist());
$$;

create or replace function public.purge_documents(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  insert into public.activity_logs (actor_id, property_id, action, table_name, record_id, before)
  select null, public.tenancy_property_id(d.tenancy_id), 'purge', 'identity_documents', d.id::text,
         jsonb_build_object('owner_type', d.owner_type, 'doc_type', d.doc_type, 'purge_after', d.purge_after)
  from public.identity_documents d where d.id = any (p_ids) and d.purge_after <= public.today_ist();
  delete from public.identity_documents where id = any (p_ids) and purge_after <= public.today_ist();
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Former tenants: sign-in disabled 90 days after settlement (and never earlier than settlement).
create or replace function public.disable_former_tenants(p_now timestamptz default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  update public.profiles p set disabled_at = coalesce(p_now, now())
  from public.tenants tn
  where tn.user_id = p.id and p.disabled_at is null and p.app_role = 'tenant'
    and tn.status = 'former'
    and not exists (
      select 1 from public.tenancies t where t.tenant_id = tn.id and t.status in ('draft', 'pending_agreement', 'active', 'notice_period')
    )
    and not exists (
      select 1 from public.tenancies t join public.move_out_records mo on mo.tenancy_id = t.id
      where t.tenant_id = tn.id and mo.settled_at > coalesce(p_now, now()) - interval '90 days'
    );
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- A returning tenant gets a new tenancy: re-enable the login when a new tenancy is created for them.
create or replace function public.tenancies_reenable_tenant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles p set disabled_at = null
  from public.tenants tn where tn.id = new.tenant_id and tn.user_id = p.id and p.disabled_at is not null;
  return new;
end;
$$;

create trigger tenancies_reenable_tenant
  after insert on public.tenancies
  for each row execute function public.tenancies_reenable_tenant();

revoke execute on function public.documents_due_for_purge(date) from public, anon, authenticated;
revoke execute on function public.purge_documents(uuid[]) from public, anon, authenticated;
revoke execute on function public.disable_former_tenants(timestamptz) from public, anon, authenticated;

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
      when 'agreements_daily' then public.agreements_daily()
      when 'disable_former_tenants' then public.disable_former_tenants()
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

-- 01:15 IST = 19:45 UTC
select cron.schedule('disable_former_tenants', '45 19 * * *', $$select public.run_job('disable_former_tenants')$$);

-- Staff can see tenants' profile rows (already), and former tenants' settlement-related houses: no change needed.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tenancy-photos', 'tenancy-photos', false, 10485760, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

-- Names for the statement header. Former tenants can no longer read their tenancy/house rows, so this
-- returns just the header fields to anyone who may see the settlement.
create or replace function public.settlement_header(p_tenancy_id uuid)
returns table (tenant_name text, unit_number text, property_name text, code text, payee_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select tn.full_name, h.unit_number, p.name, t.code, ps.payee_name
  from public.tenancies t
  join public.tenants tn on tn.id = t.tenant_id
  join public.houses h on h.id = t.house_id
  join public.properties p on p.id = h.property_id
  left join public.payee_settings ps on ps.property_id = p.id
  where t.id = p_tenancy_id and (public.is_tenancy_staff(t.id) or public.is_my_settlement(t.id));
$$;
