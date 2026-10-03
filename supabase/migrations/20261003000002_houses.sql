-- 0002 houses: houses, house_photos, private storage buckets.
-- Files are never read or written directly by clients: the server checks authorization,
-- then uses the service role to upload or to mint a 300-second signed URL. storage.objects
-- therefore has no client policies at all (deny by default).

create table public.houses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete restrict,
  unit_number text not null check (length(unit_number) between 1 and 20),
  floor text,
  unit_type text,
  bedrooms smallint check (bedrooms is null or bedrooms between 0 and 20),
  bathrooms smallint check (bathrooms is null or bathrooms between 0 and 20),
  area_sqft integer check (area_sqft is null or area_sqft > 0),
  default_rent_paise bigint not null default 0 check (default_rent_paise >= 0),
  default_advance_paise bigint not null default 0 check (default_advance_paise >= 0),
  water_billing_enabled boolean not null default false,
  status text not null default 'vacant'
    check (status in ('occupied', 'vacant', 'reserved', 'under_maintenance')),
  notes text,
  created_at timestamptz not null default now(),
  unique (property_id, unit_number)
);

create index houses_property_idx on public.houses (property_id);

alter table public.houses enable row level security;

create policy houses_select_staff on public.houses
  for select to authenticated using (public.is_property_staff(property_id));
create policy houses_insert_staff on public.houses
  for insert to authenticated with check (public.is_property_staff(property_id));
create policy houses_update_staff on public.houses
  for update to authenticated using (public.is_property_staff(property_id))
  with check (public.is_property_staff(property_id));
create policy houses_delete_owner on public.houses
  for delete to authenticated using (public.is_property_owner(property_id));

-- Staff may set only reserved / under_maintenance by hand; occupied/vacant follow tenancies.
-- (The tenancy triggers run as security definer and set app.status_change = 'system'.)
create or replace function public.houses_guard_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('app.status_change', true), '') <> 'system' then
    if new.status = 'occupied' or old.status = 'occupied' then
      raise exception 'House status % is set automatically by tenancies', new.status
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger houses_guard_status
  before update of status on public.houses
  for each row execute function public.houses_guard_status();

create trigger houses_audit
  after insert or update or delete on public.houses
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
create table public.house_photos (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  area text not null check (area in ('exterior', 'living', 'bedroom', 'kitchen', 'bathroom', 'balcony',
                                     'parking', 'meter', 'other')),
  storage_path text not null unique,
  caption text,
  sort_order integer not null default 0,
  uploaded_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

create index house_photos_house_idx on public.house_photos (house_id, area, sort_order);

alter table public.house_photos enable row level security;

create or replace function public.house_property_id(p_house_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select property_id from public.houses where id = p_house_id;
$$;

create or replace function public.is_house_staff(p_house_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_property_staff(public.house_property_id(p_house_id));
$$;

create or replace function public.is_house_owner(p_house_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_property_owner(public.house_property_id(p_house_id));
$$;

create policy house_photos_select_staff on public.house_photos
  for select to authenticated using (public.is_house_staff(house_id));
create policy house_photos_insert_staff on public.house_photos
  for insert to authenticated with check (public.is_house_staff(house_id));
create policy house_photos_update_staff on public.house_photos
  for update to authenticated using (public.is_house_staff(house_id))
  with check (public.is_house_staff(house_id));
create policy house_photos_delete_owner on public.house_photos
  for delete to authenticated using (public.is_house_owner(house_id));

create trigger house_photos_audit
  after insert or update or delete on public.house_photos
  for each row execute function public.audit_row();

-- Audit scoping now knows about house_id.
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
  end if;
  return null;
end;
$$;
revoke execute on function public.property_id_for_row(text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Private buckets. Size limits are enforced again by the server before upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('house-photos', 'house-photos', false, 10485760, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
