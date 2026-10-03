-- 0004 finance: payee settings, charges ledger, payments, allocations, receipts, EB,
-- reminders, notifications, scheduled jobs.

-- ---------------------------------------------------------------------------
-- Notifications (in-app center) + helpers used by everything below
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  params jsonb not null default '{}'::jsonb,
  link text,
  dedupe_key text unique,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
revoke insert, update, delete, truncate on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = auth.uid());
create policy notifications_update_own on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.notify(
  p_user_id uuid, p_kind text, p_params jsonb, p_link text, p_dedupe text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    return;
  end if;
  insert into public.notifications (user_id, kind, params, link, dedupe_key)
  values (p_user_id, p_kind, coalesce(p_params, '{}'::jsonb), p_link, p_dedupe)
  on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function public.notify_property_staff(
  p_property_id uuid, p_kind text, p_params jsonb, p_link text, p_dedupe_prefix text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in select m.user_id from public.property_members m where m.property_id = p_property_id loop
    perform public.notify(r.user_id, p_kind, p_params, p_link,
      case when p_dedupe_prefix is null then null else p_dedupe_prefix || ':' || r.user_id end);
  end loop;
end;
$$;

create or replace function public.tenancy_user_id(p_tenancy_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tn.user_id from public.tenancies t join public.tenants tn on tn.id = t.tenant_id where t.id = p_tenancy_id;
$$;

revoke execute on function public.notify(uuid, text, jsonb, text, text) from public, anon, authenticated;
revoke execute on function public.notify_property_staff(uuid, text, jsonb, text, text) from public, anon, authenticated;
revoke execute on function public.tenancy_user_id(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Payee settings (father's UPI QR)
-- ---------------------------------------------------------------------------
create table public.payee_settings (
  property_id uuid primary key references public.properties (id) on delete cascade,
  payee_name text not null,
  upi_id text not null check (upi_id ~ '^[A-Za-z0-9._-]{2,256}@[A-Za-z0-9.-]{2,64}$'),
  qr_path text,
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);

alter table public.payee_settings enable row level security;

create policy payee_select_staff on public.payee_settings
  for select to authenticated using (public.is_property_staff(property_id));
create policy payee_select_tenant on public.payee_settings
  for select to authenticated using (
    exists (select 1 from public.houses h where h.property_id = payee_settings.property_id and public.is_my_house(h.id))
  );
create policy payee_write_staff on public.payee_settings
  for insert to authenticated with check (public.is_property_staff(property_id));
create policy payee_update_staff on public.payee_settings
  for update to authenticated using (public.is_property_staff(property_id))
  with check (public.is_property_staff(property_id));

create trigger payee_settings_audit
  after insert or update or delete on public.payee_settings
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Charges ledger
-- ---------------------------------------------------------------------------
create table public.charges (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies (id) on delete restrict,
  type text not null check (type in ('rent', 'eb', 'eb_reimbursement', 'water', 'maintenance', 'other')),
  period_start date not null,
  period_end date not null,
  amount_paise bigint not null check (amount_paise > 0),
  due_date date not null,
  status text not null default 'pending'
    check (status in ('pending', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  source_id uuid,
  notes text,
  cancel_reason text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (period_end >= period_start),
  check (status <> 'cancelled' or cancel_reason is not null)
);

-- One rent charge per tenancy per period start → the daily job is idempotent.
create unique index charges_rent_unique on public.charges (tenancy_id, period_start) where type = 'rent';
create index charges_tenancy_idx on public.charges (tenancy_id, due_date);
create index charges_status_idx on public.charges (status, due_date);

alter table public.charges enable row level security;
revoke delete, truncate on public.charges from anon, authenticated;

create policy charges_select_own on public.charges
  for select to authenticated using (public.is_my_open_tenancy(tenancy_id));
create policy charges_select_staff on public.charges
  for select to authenticated using (public.is_tenancy_staff(tenancy_id));
create policy charges_insert_staff on public.charges
  for insert to authenticated with check (public.is_tenancy_staff(tenancy_id));
create policy charges_update_staff on public.charges
  for update to authenticated using (public.is_tenancy_staff(tenancy_id))
  with check (public.is_tenancy_staff(tenancy_id));

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies (id) on delete restrict,
  charge_id uuid references public.charges (id) on delete restrict,
  amount_paise bigint not null check (amount_paise > 0),
  paid_on date not null,
  method text not null check (method in ('upi', 'cash', 'bank_transfer', 'other')),
  paid_to text not null default 'owner' check (paid_to in ('owner', 'tneb')),
  utr_reference text check (utr_reference is null or utr_reference ~ '^[A-Za-z0-9-]{6,40}$'),
  proof_path text,
  received_by text,
  notes text,
  status text not null default 'submitted' check (status in ('submitted', 'approved', 'rejected', 'reversed')),
  rejection_reason text,
  submitted_by uuid references public.profiles (id) on delete set null default auth.uid(),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (status not in ('rejected', 'reversed') or rejection_reason is not null),
  check (method <> 'cash' or received_by is not null)
);

-- The same UTR can't be pending/approved twice; it may be resubmitted after a rejection.
create unique index payments_utr_unique on public.payments (upper(utr_reference))
  where utr_reference is not null and status not in ('rejected', 'reversed');
create index payments_tenancy_idx on public.payments (tenancy_id, created_at desc);
create index payments_status_idx on public.payments (status);

alter table public.payments enable row level security;
-- Changes after submission happen only through the review functions below.
revoke update, delete, truncate on public.payments from anon, authenticated;

create policy payments_select_own on public.payments
  for select to authenticated using (public.is_my_open_tenancy(tenancy_id));
create policy payments_insert_own on public.payments
  for insert to authenticated with check (public.is_my_open_tenancy(tenancy_id));
create policy payments_select_staff on public.payments
  for select to authenticated using (public.is_tenancy_staff(tenancy_id));
create policy payments_insert_staff on public.payments
  for insert to authenticated with check (public.is_tenancy_staff(tenancy_id));

create or replace function public.payments_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.is_tenancy_staff(new.tenancy_id) then
    -- Tenant submission: only the tenant-owned fields are taken from the request.
    if new.method = 'cash' then
      raise exception 'Cash payments are recorded by a manager' using errcode = 'check_violation';
    end if;
    new.status := 'submitted';
    new.submitted_by := auth.uid();
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.rejection_reason := null;
    new.received_by := null;
  elsif new.status <> 'submitted' then
    raise exception 'Payments start as submitted; use approve_payment' using errcode = 'check_violation';
  end if;

  if new.charge_id is not null and not exists (
    select 1 from public.charges c where c.id = new.charge_id and c.tenancy_id = new.tenancy_id
  ) then
    raise exception 'Charge does not belong to this tenancy' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger payments_before_insert
  before insert on public.payments
  for each row execute function public.payments_before_insert();

create trigger payments_audit
  after insert or update or delete on public.payments
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Allocations (payment → charges)
-- ---------------------------------------------------------------------------
create table public.payment_allocations (
  payment_id uuid not null references public.payments (id) on delete restrict,
  charge_id uuid not null references public.charges (id) on delete restrict,
  amount_paise bigint not null check (amount_paise > 0),
  created_at timestamptz not null default now(),
  primary key (payment_id, charge_id)
);

create index payment_allocations_charge_idx on public.payment_allocations (charge_id);
alter table public.payment_allocations enable row level security;
revoke insert, update, delete, truncate on public.payment_allocations from anon, authenticated;

create policy allocations_select_staff on public.payment_allocations
  for select to authenticated using (
    exists (select 1 from public.charges c where c.id = charge_id and public.is_tenancy_staff(c.tenancy_id))
  );
create policy allocations_select_own on public.payment_allocations
  for select to authenticated using (
    exists (select 1 from public.charges c where c.id = charge_id and public.is_my_open_tenancy(c.tenancy_id))
  );

create or replace function public.allocations_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments;
  v_charge public.charges;
  v_pay_total bigint;
  v_charge_total bigint;
begin
  select * into v_payment from public.payments where id = new.payment_id for update;
  select * into v_charge from public.charges where id = new.charge_id for update;

  if v_payment.tenancy_id <> v_charge.tenancy_id then
    raise exception 'Payment and charge belong to different tenancies' using errcode = 'check_violation';
  end if;
  if v_charge.status = 'cancelled' then
    raise exception 'Cannot pay a cancelled charge' using errcode = 'check_violation';
  end if;

  select coalesce(sum(amount_paise), 0) into v_pay_total
  from public.payment_allocations where payment_id = new.payment_id;
  if v_pay_total + new.amount_paise > v_payment.amount_paise then
    raise exception 'Allocations exceed the payment amount' using errcode = 'check_violation';
  end if;

  -- Only allocations of live (submitted/approved) payments count toward a charge.
  select coalesce(sum(a.amount_paise), 0) into v_charge_total
  from public.payment_allocations a join public.payments p on p.id = a.payment_id
  where a.charge_id = new.charge_id and p.status in ('submitted', 'approved');
  if v_charge_total + new.amount_paise > v_charge.amount_paise then
    raise exception 'Allocations exceed the charge amount' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger allocations_check
  before insert on public.payment_allocations
  for each row execute function public.allocations_check();

create trigger payment_allocations_audit
  after insert or delete on public.payment_allocations
  for each row execute function public.audit_row();

-- Paid amount counts only approved payments.
create or replace function public.charge_paid_paise(p_charge_id uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(a.amount_paise), 0)
  from public.payment_allocations a join public.payments p on p.id = a.payment_id
  where a.charge_id = p_charge_id and p.status = 'approved';
$$;

create or replace function public.recompute_charge_status(p_charge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.charges;
  v_paid bigint;
  v_status text;
begin
  select * into c from public.charges where id = p_charge_id;
  if not found or c.status = 'cancelled' then
    return;
  end if;
  v_paid := public.charge_paid_paise(p_charge_id);
  v_status := case
    when v_paid >= c.amount_paise then 'paid'
    when v_paid > 0 then 'partially_paid'
    when c.due_date < public.today_ist() then 'overdue'
    else 'pending'
  end;
  if v_status <> c.status then
    perform set_config('app.charge_system', 'on', true);
    update public.charges set status = v_status where id = p_charge_id;
    perform set_config('app.charge_system', '', true);
  end if;
end;
$$;

revoke execute on function public.recompute_charge_status(uuid) from public, anon, authenticated;

-- Manual edits by staff: amount/due date/notes, or cancel. Status is otherwise computed.
create or replace function public.charges_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allocated bigint;
begin
  if coalesce(current_setting('app.charge_system', true), '') = 'on' then
    return new;
  end if;
  if new.tenancy_id <> old.tenancy_id or new.type <> old.type then
    raise exception 'tenancy and type of a charge cannot change' using errcode = 'check_violation';
  end if;
  if old.status = 'cancelled' then
    raise exception 'A cancelled charge cannot be changed' using errcode = 'check_violation';
  end if;

  select coalesce(sum(a.amount_paise), 0) into v_allocated
  from public.payment_allocations a join public.payments p on p.id = a.payment_id
  where a.charge_id = old.id and p.status in ('submitted', 'approved');

  if new.status is distinct from old.status then
    if new.status <> 'cancelled' then
      raise exception 'Charge status is computed from payments' using errcode = 'check_violation';
    end if;
    if v_allocated > 0 then
      raise exception 'Cannot cancel a charge that has payments against it' using errcode = 'check_violation';
    end if;
  end if;
  if new.amount_paise < v_allocated then
    raise exception 'Amount is below what has already been paid' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger charges_before_update
  before update on public.charges
  for each row execute function public.charges_before_update();

create or replace function public.charges_after_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.recompute_charge_status(new.id);
  return new;
end;
$$;

create trigger charges_after_edit
  after update of amount_paise, due_date on public.charges
  for each row execute function public.charges_after_edit();

create trigger charges_audit
  after insert or update or delete on public.charges
  for each row execute function public.audit_row();

create or replace function public.allocations_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.recompute_charge_status(coalesce(new.charge_id, old.charge_id));
  return coalesce(new, old);
end;
$$;

create trigger allocations_after_change
  after insert or delete on public.payment_allocations
  for each row execute function public.allocations_after_change();

-- ---------------------------------------------------------------------------
-- Receipts (gap-free yearly numbering)
-- ---------------------------------------------------------------------------
create table public.receipt_counters (
  year integer primary key,
  last_no integer not null
);
alter table public.receipt_counters enable row level security;
revoke all on public.receipt_counters from anon, authenticated;

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  payment_id uuid not null references public.payments (id) on delete restrict,
  pdf_path text,
  issued_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancel_reason text,
  replaced_by uuid references public.receipts (id),
  check (cancelled_at is null or cancel_reason is not null)
);

create unique index receipts_one_live_per_payment on public.receipts (payment_id) where cancelled_at is null;
alter table public.receipts enable row level security;
revoke insert, delete, truncate on public.receipts from anon, authenticated;
revoke update on public.receipts from anon, authenticated;

create or replace function public.payment_tenancy_id(p_payment_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tenancy_id from public.payments where id = p_payment_id;
$$;

create policy receipts_select_own on public.receipts
  for select to authenticated using (public.is_my_open_tenancy(public.payment_tenancy_id(payment_id)));
create policy receipts_select_staff on public.receipts
  for select to authenticated using (public.is_tenancy_staff(public.payment_tenancy_id(payment_id)));

create or replace function public.issue_receipt(p_payment_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer := extract(year from public.today_ist())::integer;
  v_no integer;
  v_id uuid;
begin
  -- Row lock on the year's counter: concurrent approvals queue here, so numbers never collide or skip.
  insert into public.receipt_counters (year, last_no) values (v_year, 1)
  on conflict (year) do update set last_no = public.receipt_counters.last_no + 1
  returning last_no into v_no;

  insert into public.receipts (number, payment_id)
  values ('RCPT-' || v_year || '-' || lpad(v_no::text, 4, '0'), p_payment_id)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.issue_receipt(uuid) from public, anon, authenticated;

create trigger receipts_audit
  after insert or update on public.receipts
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Review functions (the only way a payment changes after submission)
-- ---------------------------------------------------------------------------
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
    -- Auto-allocate: the charge the tenant picked first, then oldest open charges.
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

  -- Recompute every charge this payment touches (status depends on the approval).
  for r in select charge_id from public.payment_allocations where payment_id = p_payment_id loop
    perform public.recompute_charge_status(r.charge_id);
  end loop;

  if p.paid_to = 'owner' then
    v_receipt := public.issue_receipt(p_payment_id);
  end if;

  perform public.notify(public.tenancy_user_id(p.tenancy_id), 'payment_approved',
    jsonb_build_object('amount_paise', p.amount_paise), '/tenant/payments');
  return v_receipt;
end;
$$;

create or replace function public.reject_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments;
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required' using errcode = 'check_violation';
  end if;
  select * into p from public.payments where id = p_payment_id for update;
  if not found or not public.is_tenancy_staff(p.tenancy_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if p.status <> 'submitted' then
    raise exception 'Payment is already %', p.status using errcode = 'check_violation';
  end if;
  update public.payments
  set status = 'rejected', rejection_reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_payment_id;
  perform public.notify(public.tenancy_user_id(p.tenancy_id), 'payment_rejected',
    jsonb_build_object('amount_paise', p.amount_paise, 'reason', p_reason), '/tenant/payments');
end;
$$;

-- Undo an approved payment entered by mistake: allocations removed, receipt cancelled.
create or replace function public.reverse_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments;
  r record;
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required' using errcode = 'check_violation';
  end if;
  select * into p from public.payments where id = p_payment_id for update;
  if not found or not public.is_tenancy_staff(p.tenancy_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if p.status <> 'approved' then
    raise exception 'Only approved payments can be reversed' using errcode = 'check_violation';
  end if;
  update public.payments
  set status = 'reversed', rejection_reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_payment_id;
  for r in delete from public.payment_allocations where payment_id = p_payment_id returning charge_id loop
    perform public.recompute_charge_status(r.charge_id);
  end loop;
  update public.receipts set cancelled_at = now(), cancel_reason = p_reason
  where payment_id = p_payment_id and cancelled_at is null;
end;
$$;

-- Cash handed to the father: recorded by a manager and approved on entry.
create or replace function public.record_cash_payment(
  p_tenancy_id uuid, p_amount_paise bigint, p_paid_on date, p_received_by text,
  p_charge_id uuid default null, p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.is_tenancy_staff(p_tenancy_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  insert into public.payments (tenancy_id, charge_id, amount_paise, paid_on, method, received_by, notes, submitted_by)
  values (p_tenancy_id, p_charge_id, p_amount_paise, p_paid_on, 'cash', p_received_by, p_notes, auth.uid())
  returning id into v_id;
  perform public.approve_payment(v_id, null);
  return v_id;
end;
$$;

create or replace function public.cancel_receipt(p_receipt_id uuid, p_reason text, p_reissue boolean default true)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  rc public.receipts;
  v_new uuid;
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required' using errcode = 'check_violation';
  end if;
  select * into rc from public.receipts where id = p_receipt_id for update;
  if not found or not public.is_tenancy_staff(public.payment_tenancy_id(rc.payment_id)) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if rc.cancelled_at is not null then
    raise exception 'Receipt already cancelled' using errcode = 'check_violation';
  end if;
  update public.receipts set cancelled_at = now(), cancel_reason = p_reason where id = p_receipt_id;
  if p_reissue then
    v_new := public.issue_receipt(rc.payment_id);
    update public.receipts set replaced_by = v_new where id = p_receipt_id;
  end if;
  return v_new;
end;
$$;

-- Stores the generated PDF path (server-side, after rendering on first download).
create or replace function public.set_receipt_pdf(p_receipt_id uuid, p_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.receipts set pdf_path = p_path
  where id = p_receipt_id and pdf_path is null
    and (public.is_tenancy_staff(public.payment_tenancy_id(payment_id))
         or public.is_my_open_tenancy(public.payment_tenancy_id(payment_id)));
end;
$$;

-- Staff are told about new submissions.
create or replace function public.payments_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'submitted' and new.method <> 'cash' then
    perform public.notify_property_staff(public.tenancy_property_id(new.tenancy_id), 'payment_submitted',
      jsonb_build_object('amount_paise', new.amount_paise), '/owner/payments');
  end if;
  return new;
end;
$$;

create trigger payments_after_insert
  after insert on public.payments
  for each row execute function public.payments_after_insert();

-- ---------------------------------------------------------------------------
-- EB accounts and bills
-- ---------------------------------------------------------------------------
create table public.eb_accounts (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null unique references public.houses (id) on delete restrict,
  service_number text not null,
  consumer_name text,
  meter_number text,
  billing_cycle text not null default 'bimonthly' check (billing_cycle in ('bimonthly', 'monthly')),
  default_paid_by text not null default 'owner_reimbursed' check (default_paid_by in ('tenant_direct', 'owner_reimbursed')),
  created_at timestamptz not null default now()
);

alter table public.eb_accounts enable row level security;
revoke delete, truncate on public.eb_accounts from anon, authenticated;

create policy eb_accounts_select_own on public.eb_accounts
  for select to authenticated using (public.is_my_house(house_id));
create policy eb_accounts_all_staff on public.eb_accounts
  for all to authenticated using (public.is_house_staff(house_id)) with check (public.is_house_staff(house_id));

create trigger eb_accounts_audit
  after insert or update or delete on public.eb_accounts
  for each row execute function public.audit_row();

create table public.eb_bills (
  id uuid primary key default gen_random_uuid(),
  eb_account_id uuid not null references public.eb_accounts (id) on delete restrict,
  house_id uuid not null references public.houses (id) on delete restrict,
  tenancy_id uuid references public.tenancies (id) on delete restrict,
  period_start date not null,
  period_end date not null,
  units integer check (units is null or units >= 0),
  amount_paise bigint not null check (amount_paise >= 0),
  late_fee_paise bigint not null default 0 check (late_fee_paise >= 0),
  total_paise bigint generated always as (amount_paise + late_fee_paise) stored,
  bill_date date,
  due_date date not null,
  paid_by text not null check (paid_by in ('tenant_direct', 'owner_reimbursed')),
  owner_paid_on date,
  status text not null default 'pending' check (status in ('pending', 'paid', 'overdue')),
  proof_path text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (period_end >= period_start),
  unique (eb_account_id, period_start)
);

create index eb_bills_tenancy_idx on public.eb_bills (tenancy_id);
alter table public.eb_bills enable row level security;
revoke delete, truncate on public.eb_bills from anon, authenticated;

create policy eb_bills_select_own on public.eb_bills
  for select to authenticated using (tenancy_id is not null and public.is_my_open_tenancy(tenancy_id));
create policy eb_bills_select_staff on public.eb_bills
  for select to authenticated using (public.is_house_staff(house_id));
create policy eb_bills_insert_staff on public.eb_bills
  for insert to authenticated with check (public.is_house_staff(house_id));
create policy eb_bills_update_staff on public.eb_bills
  for update to authenticated using (public.is_house_staff(house_id)) with check (public.is_house_staff(house_id));

create or replace function public.eb_bills_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select a.house_id into new.house_id from public.eb_accounts a where a.id = new.eb_account_id;
  if new.tenancy_id is null then
    select t.id into new.tenancy_id
    from public.tenancies t
    where t.house_id = new.house_id and t.status in ('active', 'notice_period');
  end if;
  return new;
end;
$$;

create trigger eb_bills_before_insert
  before insert on public.eb_bills
  for each row execute function public.eb_bills_before_insert();

-- Tenant pays TNEB directly → an 'eb' charge the tenant clears by uploading proof.
create or replace function public.eb_bills_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.paid_by = 'tenant_direct' and new.tenancy_id is not null and new.total_paise > 0 then
    insert into public.charges (tenancy_id, type, period_start, period_end, amount_paise, due_date, source_id, created_by)
    values (new.tenancy_id, 'eb', new.period_start, new.period_end, new.total_paise, new.due_date, new.id, auth.uid());
    perform public.notify(public.tenancy_user_id(new.tenancy_id), 'eb_bill_added',
      jsonb_build_object('amount_paise', new.total_paise, 'due_date', new.due_date), '/tenant/eb');
  end if;
  return new;
end;
$$;

create trigger eb_bills_after_insert
  after insert on public.eb_bills
  for each row execute function public.eb_bills_after_insert();

create trigger eb_bills_audit
  after insert or update or delete on public.eb_bills
  for each row execute function public.audit_row();

-- Father paid TNEB → mark bill paid and create a reimbursement charge for the tenant.
create or replace function public.record_owner_eb_payment(
  p_bill_id uuid, p_paid_on date, p_reimburse_due date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.eb_bills;
  v_charge uuid;
begin
  select * into b from public.eb_bills where id = p_bill_id for update;
  if not found or not public.is_house_staff(b.house_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if b.owner_paid_on is not null then
    raise exception 'Owner payment already recorded' using errcode = 'check_violation';
  end if;
  update public.eb_bills
  set owner_paid_on = p_paid_on, status = 'paid', paid_by = 'owner_reimbursed'
  where id = p_bill_id;
  if b.tenancy_id is not null and b.total_paise > 0 then
    insert into public.charges (tenancy_id, type, period_start, period_end, amount_paise, due_date, source_id, created_by)
    values (b.tenancy_id, 'eb_reimbursement', b.period_start, b.period_end, b.total_paise,
            coalesce(p_reimburse_due, p_paid_on + 7), b.id, auth.uid())
    returning id into v_charge;
    perform public.notify(public.tenancy_user_id(b.tenancy_id), 'eb_reimbursement_added',
      jsonb_build_object('amount_paise', b.total_paise), '/tenant/rent');
  end if;
  return v_charge;
end;
$$;

-- When the tenant's direct-to-TNEB 'eb' charge is cleared, the bill is paid.
create or replace function public.charges_after_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.type = 'eb' and new.source_id is not null and new.status = 'paid' and old.status <> 'paid' then
    update public.eb_bills set status = 'paid' where id = new.source_id;
  end if;
  return new;
end;
$$;

create trigger charges_after_status
  after update of status on public.charges
  for each row execute function public.charges_after_status();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('payee', 'payee', false, 5242880, array['image/webp', 'image/jpeg', 'image/png']),
  ('payment-proofs', 'payment-proofs', false, 10485760, array['image/webp', 'image/jpeg', 'image/png', 'application/pdf']),
  ('receipts', 'receipts', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Reminder rules
-- ---------------------------------------------------------------------------
create table public.reminder_rules (
  property_id uuid primary key references public.properties (id) on delete cascade,
  offsets integer[] not null default '{-5,-2,0}',
  overdue_every_days integer not null default 3 check (overdue_every_days between 1 and 30),
  quiet_start time not null default '21:00',
  quiet_end time not null default '08:00'
);

alter table public.reminder_rules enable row level security;
create policy reminder_rules_select_staff on public.reminder_rules
  for select to authenticated using (public.is_property_staff(property_id));
create policy reminder_rules_update_staff on public.reminder_rules
  for update to authenticated using (public.is_property_staff(property_id))
  with check (public.is_property_staff(property_id));

create or replace function public.properties_default_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.reminder_rules (property_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger properties_default_rules
  after insert on public.properties
  for each row execute function public.properties_default_rules();

insert into public.reminder_rules (property_id) select id from public.properties on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Rent charge generation
-- ---------------------------------------------------------------------------
create or replace function public.prorate(p_monthly bigint, p_from date, p_to date)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select round(
    p_monthly::numeric * ((p_to - p_from) + 1)
    / extract(day from (date_trunc('month', p_from) + interval '1 month - 1 day'))::numeric
  )::bigint;
$$;

-- First (pro-rated) month: created when the tenancy is activated, for new move-ins only.
-- Existing tenants onboarded later (start date before this month) join the regular cycle.
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
    values (new.id, 'rent', new.start_date, v_end, public.prorate(v_rent, new.start_date, v_end),
            new.start_date, 'first month')
    on conflict (tenancy_id, period_start) where type = 'rent' do nothing;
  end if;

  -- Notice given: shrink the last month's rent if it is unpaid.
  if new.status = 'notice_period' and old.status = 'active' and new.actual_end_date is not null then
    update public.charges c
    set amount_paise = public.prorate(public.rent_for(new.id, c.period_start), c.period_start, new.actual_end_date),
        period_end = new.actual_end_date,
        notes = coalesce(c.notes || '; ', '') || 'pro-rated to move-out'
    where c.tenancy_id = new.id and c.type = 'rent'
      and new.actual_end_date between c.period_start and c.period_end
      and c.status in ('pending', 'overdue')
      and not exists (select 1 from public.payment_allocations a where a.charge_id = c.id);
  end if;
  return new;
end;
$$;

create trigger tenancies_first_charge
  after update of status on public.tenancies
  for each row execute function public.tenancies_first_charge();

create table public.scheduled_job_runs (
  id bigint generated always as identity primary key,
  job text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  ok boolean,
  details jsonb
);

alter table public.scheduled_job_runs enable row level security;
revoke insert, update, delete, truncate on public.scheduled_job_runs from anon, authenticated;
create policy scheduled_job_runs_select_staff on public.scheduled_job_runs
  for select to authenticated using (public.is_staff());

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
      values (t.id, 'rent', v_start, v_end, public.prorate(v_rent, v_start, v_end), v_due)
      on conflict (tenancy_id, period_start) where type = 'rent' do nothing;
      get diagnostics v_rows = row_count;
      v_created := v_created + v_rows;
    end loop;
  end loop;
  return v_created;
end;
$$;

create or replace function public.mark_overdue(p_today date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := coalesce(p_today, public.today_ist());
  v_n integer;
begin
  perform set_config('app.charge_system', 'on', true);
  update public.charges set status = 'overdue' where status = 'pending' and due_date < v_today;
  get diagnostics v_n = row_count;
  perform set_config('app.charge_system', '', true);
  update public.eb_bills set status = 'overdue' where status = 'pending' and due_date < v_today;
  return v_n;
end;
$$;

-- Charges that should get a reminder on a date (per property rules). Used by the job and by
-- the staff "WhatsApp reminders to send today" screen (runs with the caller's RLS).
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
    and (
      (d.today - c.due_date) = any (rr.offsets)
      or (d.today > c.due_date and ((d.today - c.due_date) % rr.overdue_every_days) = 0)
    )
  order by c.due_date, h.unit_number;
$$;

create or replace function public.queue_reminders(p_today date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := coalesce(p_today, public.today_ist());
  r record;
  v_n integer := 0;
  s record;
begin
  for r in select * from public.reminders_due(v_today) loop
    perform public.notify(r.tenant_user_id, 'charge_' || r.stage,
      jsonb_build_object('type', r.type, 'amount_paise', r.outstanding_paise, 'due_date', r.due_date,
                         'days', abs(r.days_from_due)),
      case when r.type = 'eb' then '/tenant/eb' else '/tenant/rent' end,
      'rem:' || r.charge_id || ':' || v_today);
    v_n := v_n + 1;
  end loop;

  -- One digest per staff member: "N WhatsApp reminders to send today".
  for s in
    select m.user_id, count(*) as n
    from public.reminders_due(v_today) rd
    join public.property_members m on m.property_id = rd.property_id
    group by m.user_id
  loop
    perform public.notify(s.user_id, 'reminders_digest', jsonb_build_object('count', s.n),
      '/owner/reminders', 'digest:' || s.user_id || ':' || v_today);
  end loop;
  return v_n;
end;
$$;

-- Wrapper that records each run for debugging.
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

revoke execute on function public.generate_rent_charges(date) from public, anon, authenticated;
revoke execute on function public.mark_overdue(date) from public, anon, authenticated;
revoke execute on function public.queue_reminders(date) from public, anon, authenticated;
revoke execute on function public.run_job(text) from public, anon, authenticated;
revoke execute on function public.issue_receipt(uuid) from public, anon, authenticated;

-- pg_cron runs in UTC. 01:00 IST = 19:30 UTC (previous day), 09:00 IST = 03:30 UTC.
select cron.schedule('generate_rent_charges', '30 19 * * *', $$select public.run_job('generate_rent_charges')$$);
select cron.schedule('mark_overdue', '35 19 * * *', $$select public.run_job('mark_overdue')$$);
select cron.schedule('queue_reminders', '30 3 * * *', $$select public.run_job('queue_reminders')$$);

-- Audit scoping: payments/charges/receipts resolve through their tenancy.
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
  end if;
  return null;
end;
$$;
revoke execute on function public.property_id_for_row(text, jsonb) from public, anon, authenticated;
