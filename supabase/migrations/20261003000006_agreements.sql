-- 0006 agreements: templates, agreements, versions, signatures, expiry reminders.
-- The in-app signature is a record of acceptance. The stamped / registered copy uploaded by staff is the legal copy.

create table public.agreement_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  language text not null default 'en' check (language in ('en', 'ta', 'hi', 'ml')),
  body_markdown text not null,
  version integer not null default 1,
  is_active boolean not null default true,
  reviewed_by_note text,
  updated_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.agreement_templates enable row level security;
revoke delete, truncate on public.agreement_templates from anon, authenticated;
create policy agreement_templates_staff on public.agreement_templates
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create trigger agreement_templates_audit
  after insert or update on public.agreement_templates
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
create table public.agreements (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies (id) on delete restrict,
  template_id uuid references public.agreement_templates (id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'generated', 'sent', 'awaiting_signature', 'signed', 'approved', 'active', 'expired', 'terminated')),
  start_date date not null,
  end_date date not null,
  rent_paise bigint not null check (rent_paise > 0),
  advance_paise bigint not null default 0 check (advance_paise >= 0),
  current_version_id uuid,
  final_stamped_path text,
  renewal_of uuid references public.agreements (id) on delete set null,
  sent_at timestamptz,
  signed_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  terminated_reason text,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (end_date > start_date)
);

create index agreements_tenancy_idx on public.agreements (tenancy_id, created_at desc);
alter table public.agreements enable row level security;
revoke delete, truncate on public.agreements from anon, authenticated;

create policy agreements_select_own on public.agreements
  for select to authenticated using (public.is_my_open_tenancy(tenancy_id) and status <> 'draft' and status <> 'generated');
create policy agreements_select_staff on public.agreements
  for select to authenticated using (public.is_tenancy_staff(tenancy_id));
create policy agreements_insert_staff on public.agreements
  for insert to authenticated with check (public.is_tenancy_staff(tenancy_id));
create policy agreements_update_staff on public.agreements
  for update to authenticated using (public.is_tenancy_staff(tenancy_id))
  with check (public.is_tenancy_staff(tenancy_id));

-- ---------------------------------------------------------------------------
create table public.agreement_versions (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete restrict,
  version_no integer not null,
  body_text text not null,
  rendered_pdf_path text,
  data_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (agreement_id, version_no)
);

alter table public.agreements
  add constraint agreements_current_version_fk foreign key (current_version_id) references public.agreement_versions (id);

alter table public.agreement_versions enable row level security;
revoke delete, truncate on public.agreement_versions from anon, authenticated;

create or replace function public.agreement_tenancy_id(p_agreement_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select tenancy_id from public.agreements where id = p_agreement_id;
$$;

create or replace function public.agreement_visible_to_tenant(p_agreement_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.agreements a
    where a.id = p_agreement_id and a.status not in ('draft', 'generated') and public.is_my_open_tenancy(a.tenancy_id)
  );
$$;

create policy agreement_versions_select_own on public.agreement_versions
  for select to authenticated using (public.agreement_visible_to_tenant(agreement_id));
create policy agreement_versions_select_staff on public.agreement_versions
  for select to authenticated using (public.is_tenancy_staff(public.agreement_tenancy_id(agreement_id)));
create policy agreement_versions_insert_staff on public.agreement_versions
  for insert to authenticated with check (public.is_tenancy_staff(public.agreement_tenancy_id(agreement_id)));
create policy agreement_versions_update_staff on public.agreement_versions
  for update to authenticated using (public.is_tenancy_staff(public.agreement_tenancy_id(agreement_id)))
  with check (public.is_tenancy_staff(public.agreement_tenancy_id(agreement_id)));

-- ---------------------------------------------------------------------------
create table public.signatures (
  id uuid primary key default gen_random_uuid(),
  agreement_version_id uuid not null references public.agreement_versions (id) on delete restrict,
  signer_role text not null check (signer_role in ('tenant', 'owner')),
  signer_id uuid references public.profiles (id) on delete set null default auth.uid(),
  method text not null check (method in ('drawn', 'uploaded_pdf')),
  image_path text not null,
  signed_at timestamptz not null default now(),
  ip text,
  user_agent text
);

alter table public.signatures enable row level security;
revoke insert, update, delete, truncate on public.signatures from anon, authenticated;

create or replace function public.version_agreement_id(p_version_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select agreement_id from public.agreement_versions where id = p_version_id;
$$;

create policy signatures_select_own on public.signatures
  for select to authenticated using (public.agreement_visible_to_tenant(public.version_agreement_id(agreement_version_id)));
create policy signatures_select_staff on public.signatures
  for select to authenticated using (
    public.is_tenancy_staff(public.agreement_tenancy_id(public.version_agreement_id(agreement_version_id)))
  );

-- ---------------------------------------------------------------------------
-- Versioning and status rules
-- ---------------------------------------------------------------------------
create or replace function public.agreement_versions_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  select status into v_status from public.agreements where id = new.agreement_id for update;
  if v_status in ('approved', 'active', 'expired', 'terminated') then
    raise exception 'An approved agreement cannot be edited; create a renewal instead' using errcode = 'check_violation';
  end if;
  select coalesce(max(version_no), 0) + 1 into new.version_no
  from public.agreement_versions where agreement_id = new.agreement_id;
  new.rendered_pdf_path := null;
  return new;
end;
$$;

create trigger agreement_versions_before_insert
  before insert on public.agreement_versions
  for each row execute function public.agreement_versions_before_insert();

-- A new version becomes current and sends the agreement back to draft: old signatures no longer count.
create or replace function public.agreement_versions_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.agreement_system', 'on', true);
  update public.agreements
  set current_version_id = new.id, status = 'draft', signed_at = null
  where id = new.agreement_id;
  perform set_config('app.agreement_system', '', true);
  return new;
end;
$$;

create trigger agreement_versions_after_insert
  after insert on public.agreement_versions
  for each row execute function public.agreement_versions_after_insert();

-- Only the PDF path of the current version may change after insert.
create or replace function public.agreement_versions_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.body_text <> old.body_text or new.agreement_id <> old.agreement_id or new.version_no <> old.version_no then
    raise exception 'Agreement versions are immutable; add a new version' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger agreement_versions_before_update
  before update on public.agreement_versions
  for each row execute function public.agreement_versions_before_update();

-- Status changes only through the functions below (they set app.agreement_system).
create or replace function public.agreements_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.tenancy_id <> old.tenancy_id then
    raise exception 'tenancy of an agreement cannot change' using errcode = 'check_violation';
  end if;
  if coalesce(current_setting('app.agreement_system', true), '') <> 'on' then
    if new.status is distinct from old.status or new.current_version_id is distinct from old.current_version_id
       or new.approved_at is distinct from old.approved_at or new.signed_at is distinct from old.signed_at then
      raise exception 'Use the agreement actions to change its status' using errcode = 'check_violation';
    end if;
    if old.status not in ('draft') and (new.start_date <> old.start_date or new.end_date <> old.end_date
       or new.rent_paise <> old.rent_paise or new.advance_paise <> old.advance_paise) then
      raise exception 'Terms can change only while the agreement is a draft' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger agreements_before_update
  before update on public.agreements
  for each row execute function public.agreements_before_update();

create trigger agreements_audit
  after insert or update on public.agreements
  for each row execute function public.audit_row();
create trigger agreement_versions_audit
  after insert on public.agreement_versions
  for each row execute function public.audit_row();
create trigger signatures_audit
  after insert on public.signatures
  for each row execute function public.audit_row();

-- A draft tenancy moves to pending_agreement once an agreement exists for it.
create or replace function public.agreements_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.tenancies set status = 'pending_agreement' where id = new.tenancy_id and status = 'draft';
  return new;
end;
$$;

create trigger agreements_after_insert
  after insert on public.agreements
  for each row execute function public.agreements_after_insert();

create or replace function public.set_agreement_status(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.agreement_system', 'on', true);
  update public.agreements set status = p_status where id = p_id;
  perform set_config('app.agreement_system', '', true);
end;
$$;
revoke execute on function public.set_agreement_status(uuid, text) from public, anon, authenticated;

-- Staff: PDF for the current version is ready.
create or replace function public.mark_agreement_generated(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.agreements;
begin
  select * into a from public.agreements where id = p_id for update;
  if not found or not public.is_tenancy_staff(a.tenancy_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if a.status <> 'draft' then
    raise exception 'Only a draft can be generated' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.agreement_versions v where v.id = a.current_version_id and v.rendered_pdf_path is not null) then
    raise exception 'Generate the PDF first' using errcode = 'check_violation';
  end if;
  perform public.set_agreement_status(p_id, 'generated');
end;
$$;

create or replace function public.send_agreement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.agreements;
begin
  select * into a from public.agreements where id = p_id for update;
  if not found or not public.is_tenancy_staff(a.tenancy_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if a.status <> 'generated' then
    raise exception 'Generate the agreement before sending' using errcode = 'check_violation';
  end if;
  perform public.set_agreement_status(p_id, 'sent');
  perform set_config('app.agreement_system', 'on', true);
  update public.agreements set sent_at = now() where id = p_id;
  perform set_config('app.agreement_system', '', true);
  perform public.notify(public.tenancy_user_id(a.tenancy_id), 'agreement_sent', '{}'::jsonb, '/tenant/agreement');
end;
$$;

-- Tenant opened it.
create or replace function public.view_agreement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.agreements;
begin
  select * into a from public.agreements where id = p_id;
  if found and public.is_my_open_tenancy(a.tenancy_id) and a.status = 'sent' then
    perform public.set_agreement_status(p_id, 'awaiting_signature');
  end if;
end;
$$;

-- Tenant signs the CURRENT version (drawn signature image or uploaded signed PDF, stored by the server first).
create or replace function public.sign_agreement(
  p_id uuid, p_method text, p_image_path text, p_ip text default null, p_user_agent text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.agreements;
begin
  select * into a from public.agreements where id = p_id for update;
  if not found or not public.is_my_open_tenancy(a.tenancy_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if a.status not in ('sent', 'awaiting_signature') then
    raise exception 'This agreement is not waiting for your signature' using errcode = 'check_violation';
  end if;
  insert into public.signatures (agreement_version_id, signer_role, signer_id, method, image_path, ip, user_agent)
  values (a.current_version_id, 'tenant', auth.uid(), p_method, p_image_path, p_ip, p_user_agent);
  perform public.set_agreement_status(p_id, 'signed');
  perform set_config('app.agreement_system', 'on', true);
  update public.agreements set signed_at = now() where id = p_id;
  perform set_config('app.agreement_system', '', true);
  perform public.notify_property_staff(public.tenancy_property_id(a.tenancy_id), 'agreement_signed', '{}'::jsonb,
    '/owner/agreements/' || p_id);
end;
$$;

-- Activate: agreement active, tenancy active, terms copied onto the tenancy.
create or replace function public.activate_agreement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.agreements;
  t public.tenancies;
begin
  select * into a from public.agreements where id = p_id for update;
  select * into t from public.tenancies where id = a.tenancy_id for update;
  -- Any earlier active agreement for the tenancy is superseded.
  perform set_config('app.agreement_system', 'on', true);
  update public.agreements set status = 'expired' where tenancy_id = a.tenancy_id and id <> p_id and status = 'active';
  perform set_config('app.agreement_system', '', true);
  perform public.set_agreement_status(p_id, 'active');
  update public.tenancies set expected_end_date = a.end_date where id = a.tenancy_id;
  if t.status = 'draft' then
    update public.tenancies set status = 'pending_agreement' where id = t.id;
  end if;
  if t.status in ('draft', 'pending_agreement') then
    update public.tenancies set status = 'active' where id = t.id;
  end if;
end;
$$;
revoke execute on function public.activate_agreement(uuid) from public, anon, authenticated;

create or replace function public.approve_agreement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.agreements;
begin
  select * into a from public.agreements where id = p_id for update;
  if not found or not public.is_tenancy_staff(a.tenancy_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if a.status <> 'signed' then
    raise exception 'Only a signed agreement can be approved' using errcode = 'check_violation';
  end if;
  if not exists (
    select 1 from public.signatures s where s.agreement_version_id = a.current_version_id and s.signer_role = 'tenant'
  ) then
    raise exception 'The current version has no tenant signature' using errcode = 'check_violation';
  end if;
  perform public.set_agreement_status(p_id, 'approved');
  perform set_config('app.agreement_system', 'on', true);
  update public.agreements set approved_at = now(), approved_by = auth.uid() where id = p_id;
  perform set_config('app.agreement_system', '', true);

  -- Renewal with a new rent → rent revision from the new start date.
  if a.renewal_of is not null and coalesce(public.rent_for(a.tenancy_id, a.start_date), 0) <> a.rent_paise then
    insert into public.rent_revisions (tenancy_id, amount_paise, effective_from, reason, set_by)
    values (a.tenancy_id, a.rent_paise, a.start_date, 'Agreement renewal', auth.uid())
    on conflict (tenancy_id, effective_from) do nothing;
  end if;

  if a.start_date <= public.today_ist() then
    perform public.activate_agreement(p_id);
  end if;
  perform public.notify(public.tenancy_user_id(a.tenancy_id), 'agreement_approved', '{}'::jsonb, '/tenant/agreement');
end;
$$;

create or replace function public.terminate_agreement(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.agreements;
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required' using errcode = 'check_violation';
  end if;
  select * into a from public.agreements where id = p_id for update;
  if not found or not public.is_tenancy_staff(a.tenancy_id) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  if a.status in ('expired', 'terminated') then
    raise exception 'Agreement already %', a.status using errcode = 'check_violation';
  end if;
  perform public.set_agreement_status(p_id, 'terminated');
  perform set_config('app.agreement_system', 'on', true);
  update public.agreements set terminated_reason = p_reason where id = p_id;
  perform set_config('app.agreement_system', '', true);
end;
$$;

-- Daily: start approved agreements, expire finished ones, expiry reminders at 90/60/30/7 days.
create or replace function public.agreements_daily(p_today date default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := coalesce(p_today, public.today_ist());
  r record;
  v_n integer := 0;
  v_days integer;
begin
  for r in select id from public.agreements where status = 'approved' and start_date <= v_today loop
    perform public.activate_agreement(r.id);
    v_n := v_n + 1;
  end loop;

  for r in select id from public.agreements where status = 'active' and end_date < v_today loop
    perform public.set_agreement_status(r.id, 'expired');
    v_n := v_n + 1;
  end loop;

  for r in
    select a.id, a.tenancy_id, a.end_date from public.agreements a
    where a.status in ('active', 'approved') and (a.end_date - v_today) in (90, 60, 30, 7)
      and not exists (
        select 1 from public.agreements n where n.renewal_of = a.id and n.status not in ('terminated')
      )
  loop
    v_days := r.end_date - v_today;
    perform public.notify(public.tenancy_user_id(r.tenancy_id), 'agreement_expiring',
      jsonb_build_object('days', v_days, 'date', r.end_date), '/tenant/agreement',
      'agr:' || r.id || ':' || v_days);
    perform public.notify_property_staff(public.tenancy_property_id(r.tenancy_id), 'agreement_expiring',
      jsonb_build_object('days', v_days, 'date', r.end_date), '/owner/agreements/' || r.id,
      'agr:' || r.id || ':' || v_days);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke execute on function public.agreements_daily(date) from public, anon, authenticated;

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

-- 00:50 IST = 19:20 UTC (before rent generation, so activated tenancies get their charges)
select cron.schedule('agreements_daily', '20 19 * * *', $$select public.run_job('agreements_daily')$$);

-- Audit scoping for versions/signatures.
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
  elsif p_row ? 'agreement_id' then
    return public.tenancy_property_id(public.agreement_tenancy_id((p_row ->> 'agreement_id')::uuid));
  elsif p_row ? 'agreement_version_id' then
    return public.tenancy_property_id(public.agreement_tenancy_id(public.version_agreement_id((p_row ->> 'agreement_version_id')::uuid)));
  end if;
  return null;
end;
$$;
revoke execute on function public.property_id_for_row(text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Starter template (English). DRAFT: to be reviewed by the family's law student before real use,
-- including Tamil Nadu registration rules and any cap on the advance.
insert into public.agreement_templates (name, language, body_markdown, reviewed_by_note)
values ('Residential rental agreement (11 months)', 'en', $tpl$# RENTAL AGREEMENT

This Rental Agreement is made on {{agreement_date}} between:

**{{owner_name}}** (the "Owner"), and

**{{tenant_name}}** (the "Tenant").

## 1. Property

The Owner lets to the Tenant the residential house **{{house_unit}}**, {{property_address}} (the "House"), for residential use only by the Tenant and the occupants named below.

Occupants: {{occupants}}

## 2. Term

The tenancy starts on **{{start_date}}** and ends on **{{end_date}}**, unless ended earlier under clause 7 or renewed in writing.

## 3. Rent

- Monthly rent: **{{rent}}** ({{rent_in_words}}).
- Rent is paid in advance on or before the **{{due_day}}th day** of every month, to the Owner's UPI ID {{owner_upi}} or as the Owner directs.
- The Tenant records each payment (with UTR / reference) in the Family Property Manager app. A receipt is issued for every approved payment.
- Rent for a part month is charged in proportion to the days of occupation.

## 4. Advance / security deposit

- The Tenant has paid an advance of **{{advance}}** ({{advance_in_words}}).
- No interest is payable on the advance.
- At the end of the tenancy the advance is refunded after deducting unpaid rent, unpaid electricity charges and the cost of repairing damage beyond normal wear and tear, with an itemised statement.

## 5. Electricity and other charges

- The House has its own electricity (TNEB) meter. Electricity charges are paid by the Tenant as agreed: either directly to TNEB, or reimbursed to the Owner when the Owner pays the bill.
- A meter reading is recorded on the day the Tenant moves in and the day the Tenant moves out.

## 6. Use and care of the House

- The Tenant keeps the House clean and in good condition and reports repairs promptly through the app.
- The Tenant does not sub-let, make structural changes or use the House for any unlawful or commercial purpose.
- Every guest staying overnight is registered in the app with an identity document.
- The Owner may inspect the House at a reasonable time with prior notice.

## 7. Notice and ending the tenancy

- Either party may end this agreement by giving **{{notice_days}} days'** written notice (a notice recorded in the app counts as written notice).
- On leaving, the Tenant hands over the House and keys in the condition received, subject to normal wear and tear.

## 8. Signatures

Accepting this agreement in the app is a record of acceptance. The parties will also execute this agreement on stamp paper of the correct value and register it where the law requires; that executed copy is the final, legally binding agreement.

Owner: {{owner_name}}

Tenant: {{tenant_name}}
$tpl$, 'DRAFT — to be reviewed by Samuel''s brother (law student) before use, including Tamil Nadu registration rules and any cap on the advance.');
