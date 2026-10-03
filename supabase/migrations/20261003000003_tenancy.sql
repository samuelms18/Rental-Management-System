-- 0003 tenancy: tenants, tenancies, rent_revisions, occupants, consents, identity_documents.

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null check (length(full_name) between 1 and 120),
  phone text not null check (phone ~ '^[0-9]{10}$'),
  email text not null check (position('@' in email) > 1),
  photo_path text,
  permanent_address text,
  emergency_contact_name text,
  emergency_contact_phone text check (emergency_contact_phone is null or emergency_contact_phone ~ '^[0-9]{10}$'),
  status text not null default 'active' check (status in ('active', 'former')),
  created_at timestamptz not null default now()
);

create unique index tenants_email_idx on public.tenants (lower(email));

alter table public.tenants enable row level security;

-- ---------------------------------------------------------------------------
create table public.tenancies (
  id uuid primary key default gen_random_uuid(),
  code text not null default '',
  house_id uuid not null references public.houses (id) on delete restrict,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  start_date date not null,
  expected_end_date date,
  actual_end_date date,
  advance_paise bigint not null default 0 check (advance_paise >= 0),
  notice_period_days smallint not null default 30 check (notice_period_days between 0 and 365),
  rent_due_day smallint not null default 5 check (rent_due_day between 1 and 28),
  status text not null default 'draft'
    check (status in ('draft', 'pending_agreement', 'active', 'notice_period', 'completed', 'cancelled')),
  offline_agreement_path text,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  check (expected_end_date is null or expected_end_date > start_date),
  check (actual_end_date is null or actual_end_date >= start_date)
);

-- Codes like H01-T002 are unique per house (two properties may both have a house H01).
create unique index tenancies_code_per_house on public.tenancies (house_id, code);

-- Only one live tenancy per house.
create unique index tenancies_one_live_per_house
  on public.tenancies (house_id) where status in ('active', 'notice_period');
create index tenancies_tenant_idx on public.tenancies (tenant_id);
create index tenancies_house_idx on public.tenancies (house_id);

alter table public.tenancies enable row level security;

-- No deletes, ever: old tenancies are history.
revoke delete, truncate on public.tenancies from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------
create or replace function public.tenancy_property_id(p_tenancy_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select h.property_id
  from public.tenancies t join public.houses h on h.id = t.house_id
  where t.id = p_tenancy_id;
$$;

create or replace function public.is_tenancy_staff(p_tenancy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_property_staff(public.tenancy_property_id(p_tenancy_id));
$$;

-- The signed-in tenant's own tenancy that is not finished (draft → notice_period).
-- Former tenants lose access when the tenancy is completed.
create or replace function public.is_my_open_tenancy(p_tenancy_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenancies t
    join public.tenants tn on tn.id = t.tenant_id
    join public.profiles p on p.id = tn.user_id
    where t.id = p_tenancy_id
      and tn.user_id = auth.uid()
      and p.disabled_at is null
      and t.status in ('draft', 'pending_agreement', 'active', 'notice_period')
  );
$$;

create or replace function public.my_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.tenants where user_id = auth.uid();
$$;

create or replace function public.is_my_house(p_house_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.tenancies t
    join public.tenants tn on tn.id = t.tenant_id
    where t.house_id = p_house_id
      and tn.user_id = auth.uid()
      and t.status in ('draft', 'pending_agreement', 'active', 'notice_period')
  );
$$;

-- Staff see a tenant when the tenant has (or had) a tenancy in one of their properties,
-- or has no tenancy yet (just created by the family team).
create or replace function public.is_tenant_staff(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_staff() and (
    not exists (select 1 from public.tenancies t where t.tenant_id = p_tenant_id)
    or exists (
      select 1 from public.tenancies t
      join public.houses h on h.id = t.house_id
      where t.tenant_id = p_tenant_id and public.is_property_staff(h.property_id)
    )
  );
$$;

-- tenants policies
create policy tenants_select_own on public.tenants
  for select to authenticated using (user_id = auth.uid());
create policy tenants_select_staff on public.tenants
  for select to authenticated using (public.is_tenant_staff(id));
create policy tenants_insert_staff on public.tenants
  for insert to authenticated with check (public.is_staff());
create policy tenants_update_staff on public.tenants
  for update to authenticated using (public.is_tenant_staff(id)) with check (public.is_staff());
revoke delete, truncate on public.tenants from anon, authenticated;

-- tenancies policies
create policy tenancies_select_own on public.tenancies
  for select to authenticated using (public.is_my_open_tenancy(id));
create policy tenancies_select_staff on public.tenancies
  for select to authenticated using (public.is_house_staff(house_id));
create policy tenancies_insert_staff on public.tenancies
  for insert to authenticated with check (public.is_house_staff(house_id));
create policy tenancies_update_staff on public.tenancies
  for update to authenticated using (public.is_house_staff(house_id))
  with check (public.is_house_staff(house_id));

-- Tenants may see their own current house and its photos.
create policy houses_select_tenant on public.houses
  for select to authenticated using (public.is_my_house(id));
create policy house_photos_select_tenant on public.house_photos
  for select to authenticated using (public.is_my_house(house_id));
-- ...and the property it belongs to (name/address only matter, but RLS is row-level).
create policy properties_select_tenant on public.properties
  for select to authenticated using (
    exists (select 1 from public.houses h where h.property_id = properties.id and public.is_my_house(h.id))
  );

-- ---------------------------------------------------------------------------
-- Tenancy code + status machine
-- ---------------------------------------------------------------------------
create or replace function public.tenancies_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unit text;
  v_n integer;
begin
  if new.status not in ('draft', 'pending_agreement') then
    raise exception 'A tenancy starts as draft or pending_agreement' using errcode = 'check_violation';
  end if;
  if new.code is null or new.code = '' then
    select regexp_replace(upper(h.unit_number), '[^A-Z0-9]', '', 'g') into v_unit
    from public.houses h where h.id = new.house_id;
    select count(*) + 1 into v_n from public.tenancies t where t.house_id = new.house_id;
    new.code := v_unit || '-T' || lpad(v_n::text, 3, '0');
  end if;
  return new;
end;
$$;

create trigger tenancies_before_insert
  before insert on public.tenancies
  for each row execute function public.tenancies_before_insert();

create or replace function public.tenancies_status_machine()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ok boolean;
begin
  if new.house_id <> old.house_id or new.tenant_id <> old.tenant_id or new.code <> old.code then
    raise exception 'house, tenant and code of a tenancy cannot change' using errcode = 'check_violation';
  end if;

  if new.status is distinct from old.status then
    ok := case old.status
      when 'draft' then new.status in ('pending_agreement', 'cancelled')
      when 'pending_agreement' then new.status in ('active', 'cancelled')
      when 'active' then new.status in ('notice_period')
      when 'notice_period' then new.status in ('completed', 'active')
      else false
    end;
    if not ok then
      raise exception 'Tenancy cannot move from % to %', old.status, new.status using errcode = 'check_violation';
    end if;

    if new.status = 'active' and old.status = 'pending_agreement' then
      new.activated_at := now();
    end if;
    if new.status = 'notice_period' and new.actual_end_date is null then
      raise exception 'Set the planned move-out date (actual_end_date) when giving notice'
        using errcode = 'check_violation';
    end if;
    if new.status = 'active' and old.status = 'notice_period' then
      new.actual_end_date := null; -- notice withdrawn
    end if;
  end if;
  return new;
end;
$$;

create trigger tenancies_status_machine
  before update on public.tenancies
  for each row execute function public.tenancies_status_machine();

-- House and tenant status follow the tenancy.
create or replace function public.tenancies_after_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    perform set_config('app.status_change', 'system', true);
    if new.status = 'active' then
      update public.houses set status = 'occupied' where id = new.house_id;
      update public.tenants set status = 'active' where id = new.tenant_id;
    elsif new.status = 'completed' then
      update public.houses set status = 'vacant' where id = new.house_id;
      update public.tenants set status = 'former'
      where id = new.tenant_id
        and not exists (
          select 1 from public.tenancies t
          where t.tenant_id = new.tenant_id and t.id <> new.id
            and t.status in ('draft', 'pending_agreement', 'active', 'notice_period')
        );
    end if;
    perform set_config('app.status_change', '', true);
  end if;
  return new;
end;
$$;

create trigger tenancies_after_status
  after update of status on public.tenancies
  for each row execute function public.tenancies_after_status();

create trigger tenants_audit
  after insert or update or delete on public.tenants
  for each row execute function public.audit_row();
create trigger tenancies_audit
  after insert or update or delete on public.tenancies
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Rent revisions
-- ---------------------------------------------------------------------------
create table public.rent_revisions (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies (id) on delete restrict,
  amount_paise bigint not null check (amount_paise > 0),
  effective_from date not null,
  reason text,
  set_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (tenancy_id, effective_from)
);

alter table public.rent_revisions enable row level security;
revoke update, delete, truncate on public.rent_revisions from anon, authenticated;

create policy rent_revisions_select_own on public.rent_revisions
  for select to authenticated using (public.is_my_open_tenancy(tenancy_id));
create policy rent_revisions_select_staff on public.rent_revisions
  for select to authenticated using (public.is_tenancy_staff(tenancy_id));
create policy rent_revisions_insert_staff on public.rent_revisions
  for insert to authenticated with check (public.is_tenancy_staff(tenancy_id));

create trigger rent_revisions_audit
  after insert or update or delete on public.rent_revisions
  for each row execute function public.audit_row();

-- Monthly rent (paise) in effect on a given date.
create or replace function public.rent_for(p_tenancy_id uuid, p_on date)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select r.amount_paise
  from public.rent_revisions r
  where r.tenancy_id = p_tenancy_id and r.effective_from <= p_on
  order by r.effective_from desc
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Occupants
-- ---------------------------------------------------------------------------
create table public.occupants (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies (id) on delete restrict,
  name text not null check (length(name) between 1 and 120),
  relationship text,
  age smallint check (age is null or age between 0 and 120),
  phone text check (phone is null or phone ~ '^[0-9]{10}$'),
  photo_path text,
  start_date date not null default public.today_ist(),
  end_date date,
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create index occupants_tenancy_idx on public.occupants (tenancy_id);
alter table public.occupants enable row level security;
revoke delete, truncate on public.occupants from anon, authenticated;

create policy occupants_select_own on public.occupants
  for select to authenticated using (public.is_my_open_tenancy(tenancy_id));
create policy occupants_insert_own on public.occupants
  for insert to authenticated with check (public.is_my_open_tenancy(tenancy_id));
create policy occupants_update_own on public.occupants
  for update to authenticated using (public.is_my_open_tenancy(tenancy_id))
  with check (public.is_my_open_tenancy(tenancy_id));
create policy occupants_all_staff on public.occupants
  for all to authenticated using (public.is_tenancy_staff(tenancy_id))
  with check (public.is_tenancy_staff(tenancy_id));

-- ---------------------------------------------------------------------------
-- Consents (DPDP Act 2023)
-- ---------------------------------------------------------------------------
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  purpose text not null,
  notice_version text not null,
  language text not null check (language in ('en', 'ta', 'hi', 'ml')),
  accepted_at timestamptz not null default now()
);

create index consents_tenant_idx on public.consents (tenant_id);
alter table public.consents enable row level security;
revoke update, delete, truncate on public.consents from anon, authenticated;

create policy consents_select_own on public.consents
  for select to authenticated using (tenant_id = public.my_tenant_id());
create policy consents_insert_own on public.consents
  for insert to authenticated with check (tenant_id = public.my_tenant_id());
create policy consents_select_staff on public.consents
  for select to authenticated using (public.is_tenant_staff(tenant_id));

create or replace function public.has_consent(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.consents c where c.tenant_id = p_tenant_id);
$$;

-- ---------------------------------------------------------------------------
-- Identity documents (masked numbers only)
-- ---------------------------------------------------------------------------
create table public.identity_documents (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('tenant', 'occupant', 'guest', 'domestic_help')),
  owner_id uuid not null,
  tenancy_id uuid not null references public.tenancies (id) on delete restrict,
  doc_type text not null check (doc_type in ('aadhaar', 'pan', 'driving_licence', 'passport', 'voter_id',
                                             'student_id', 'employee_id', 'address_proof', 'other')),
  number_last4 text check (number_last4 is null or number_last4 ~ '^[0-9A-Za-z]{4}$'),
  front_path text,
  back_path text,
  verification text not null default 'pending' check (verification in ('pending', 'verified', 'rejected')),
  rejection_reason text,
  expiry_date date,
  uploaded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  purge_after date,
  check (verification <> 'rejected' or rejection_reason is not null)
);

create index identity_documents_tenancy_idx on public.identity_documents (tenancy_id);
create index identity_documents_owner_idx on public.identity_documents (owner_type, owner_id);
alter table public.identity_documents enable row level security;
revoke delete, truncate on public.identity_documents from anon, authenticated;

-- Tenants can upload only after consent, only for their open tenancy, and only as 'pending'.
create policy identity_documents_select_own on public.identity_documents
  for select to authenticated using (public.is_my_open_tenancy(tenancy_id));
create policy identity_documents_insert_own on public.identity_documents
  for insert to authenticated with check (
    public.is_my_open_tenancy(tenancy_id)
    and public.has_consent(public.my_tenant_id())
    and verification = 'pending'
  );
create policy identity_documents_all_staff on public.identity_documents
  for all to authenticated using (public.is_tenancy_staff(tenancy_id))
  with check (public.is_tenancy_staff(tenancy_id));

-- Tenants may not change verification fields.
create or replace function public.identity_documents_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_tenancy_staff(new.tenancy_id) and auth.uid() is not null then
    if tg_op = 'INSERT' then
      new.verification := 'pending';
      new.rejection_reason := null;
      new.purge_after := null;
      new.uploaded_by := auth.uid();
    end if;
  end if;
  return new;
end;
$$;

create trigger identity_documents_guard
  before insert or update on public.identity_documents
  for each row execute function public.identity_documents_guard();

create trigger identity_documents_audit
  after insert or update or delete on public.identity_documents
  for each row execute function public.audit_row();
create trigger occupants_audit
  after insert or update or delete on public.occupants
  for each row execute function public.audit_row();
create trigger consents_audit
  after insert on public.consents
  for each row execute function public.audit_row();

-- Staff can read tenant profiles (name/phone/language) for their tenants.
create policy profiles_select_tenant_by_staff on public.profiles
  for select to authenticated using (
    exists (select 1 from public.tenants tn where tn.user_id = profiles.id and public.is_tenant_staff(tn.id))
  );

-- Audit scoping now knows about tenancy_id.
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
  end if;
  return null;
end;
$$;
revoke execute on function public.property_id_for_row(text, jsonb) from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('tenant-photos', 'tenant-photos', false, 10485760, array['image/webp', 'image/jpeg', 'image/png']),
  ('identity-docs', 'identity-docs', false, 10485760, array['image/webp', 'image/jpeg', 'image/png', 'application/pdf']),
  ('agreements', 'agreements', false, 10485760, array['image/webp', 'image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;
