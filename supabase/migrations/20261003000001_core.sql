-- 0001 core: profiles, properties, property_members, activity_logs, security helpers.
-- Every table gets RLS + policies in the same migration that creates it.

create extension if not exists pg_cron with schema pg_catalog;

-- ---------------------------------------------------------------------------
-- Small helpers
-- ---------------------------------------------------------------------------

-- Business "today" is always India time.
create or replace function public.today_ist()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Kolkata')::date;
$$;

-- True when the current session passed 2FA (TOTP). Staff policies require it.
create or replace function public.is_aal2()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'aal') = 'aal2', false);
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  email text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'ta', 'hi', 'ml')),
  app_role text not null default 'tenant' check (app_role in ('staff', 'tenant')),
  disabled_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users may change only these columns on their own row. app_role/email are server-only.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone, preferred_language) on public.profiles to authenticated;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_aal2() and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.app_role = 'staff' and p.disabled_at is null
  );
$$;

-- New auth user → profile row (tenant by default; staff is set by server code only).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------------
create table public.properties (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  address_line text not null default '',
  city text not null default '',
  state text not null default 'Tamil Nadu',
  pin text check (pin is null or pin ~ '^[0-9]{6}$'),
  description text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.properties enable row level security;

-- ---------------------------------------------------------------------------
-- property_members
-- ---------------------------------------------------------------------------
create table public.property_members (
  property_id uuid not null references public.properties (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'manager')),
  created_at timestamptz not null default now(),
  primary key (property_id, user_id)
);

create index property_members_user_idx on public.property_members (user_id);

alter table public.property_members enable row level security;

create or replace function public.is_property_staff(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_aal2() and exists (
    select 1
    from public.property_members m
    join public.profiles p on p.id = m.user_id
    where m.property_id = p_property_id and m.user_id = auth.uid() and p.disabled_at is null
  );
$$;

create or replace function public.is_property_owner(p_property_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_aal2() and exists (
    select 1
    from public.property_members m
    join public.profiles p on p.id = m.user_id
    where m.property_id = p_property_id and m.user_id = auth.uid() and m.role = 'owner' and p.disabled_at is null
  );
$$;

-- True if the user is an owner of any property (used for family-wide owner-only actions).
create or replace function public.is_any_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_aal2() and exists (
    select 1 from public.property_members m where m.user_id = auth.uid() and m.role = 'owner'
  );
$$;

-- properties policies
create policy properties_select_staff on public.properties
  for select to authenticated using (public.is_property_staff(id));
create policy properties_insert_staff on public.properties
  for insert to authenticated with check (public.is_staff());
create policy properties_update_staff on public.properties
  for update to authenticated using (public.is_property_staff(id)) with check (public.is_property_staff(id));
create policy properties_delete_owner on public.properties
  for delete to authenticated using (public.is_property_owner(id));

-- A new property gets the whole family team: everyone who is a member anywhere keeps
-- their role, and the creator is added as manager if not already present.
create or replace function public.add_team_to_new_property()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.property_members (property_id, user_id, role)
  select distinct on (m.user_id) new.id, m.user_id, m.role
  from public.property_members m
  order by m.user_id, case m.role when 'owner' then 0 else 1 end
  on conflict do nothing;

  if auth.uid() is not null then
    insert into public.property_members (property_id, user_id, role)
    values (new.id, auth.uid(), 'manager')
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger properties_add_team
  after insert on public.properties
  for each row execute function public.add_team_to_new_property();

-- property_members policies: staff of the property can see the team; only owners change it.
create policy members_select_staff on public.property_members
  for select to authenticated using (public.is_property_staff(property_id));
create policy members_insert_owner on public.property_members
  for insert to authenticated with check (public.is_property_owner(property_id));
create policy members_update_owner on public.property_members
  for update to authenticated using (public.is_property_owner(property_id))
  with check (public.is_property_owner(property_id));
create policy members_delete_owner on public.property_members
  for delete to authenticated using (public.is_property_owner(property_id));

-- profiles policies: own row; staff can read fellow staff of shared properties.
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_select_team on public.profiles
  for select to authenticated using (
    exists (
      select 1 from public.property_members m
      where m.user_id = profiles.id and public.is_property_staff(m.property_id)
    )
  );
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- activity_logs (insert-only audit trail)
-- ---------------------------------------------------------------------------
create table public.activity_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  action text not null,
  table_name text not null,
  record_id text,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index activity_logs_property_idx on public.activity_logs (property_id, created_at desc);
create index activity_logs_record_idx on public.activity_logs (table_name, record_id);

alter table public.activity_logs enable row level security;

-- Nobody (not even owners) can change or remove audit entries. Inserts happen only
-- through security-definer triggers/functions.
revoke insert, update, delete, truncate on public.activity_logs from anon, authenticated;

create policy activity_logs_select_staff on public.activity_logs
  for select to authenticated using (
    (property_id is not null and public.is_property_staff(property_id))
    or (property_id is null and public.is_staff())
  );

-- Block updates/deletes even for table owners going through the API roles.
create or replace function public.activity_logs_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'activity_logs is insert-only';
end;
$$;

create trigger activity_logs_no_update
  before update or delete on public.activity_logs
  for each row execute function public.activity_logs_immutable();

-- Resolve which property a row belongs to (for audit scoping). Extended as tables are added.
create or replace function public.property_id_for_row(p_table text, p_row jsonb)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v uuid;
begin
  if p_table = 'properties' then
    return (p_row ->> 'id')::uuid;
  elsif p_row ? 'property_id' then
    return (p_row ->> 'property_id')::uuid;
  end if;
  return null;
end;
$$;

-- Generic audit trigger.
create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb;
  v_before jsonb;
  v_after jsonb;
begin
  if tg_op = 'DELETE' then
    v_row := to_jsonb(old);
    v_before := v_row;
  elsif tg_op = 'UPDATE' then
    v_row := to_jsonb(new);
    v_before := to_jsonb(old);
    v_after := v_row;
    if v_before = v_after then
      return new;
    end if;
  else
    v_row := to_jsonb(new);
    v_after := v_row;
  end if;

  insert into public.activity_logs (actor_id, property_id, action, table_name, record_id, before, after)
  values (
    auth.uid(),
    public.property_id_for_row(tg_table_name, v_row),
    lower(tg_op),
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'payment_id'),
    v_before,
    v_after
  );
  return coalesce(new, old);
end;
$$;

create trigger properties_audit
  after insert or update or delete on public.properties
  for each row execute function public.audit_row();
create trigger property_members_audit
  after insert or update or delete on public.property_members
  for each row execute function public.audit_row();

-- Explicit log entry for actions that are not row writes (document views, downloads).
-- Called by server code; the actor is the signed-in user.
create or replace function public.log_action(
  p_action text,
  p_table text,
  p_record_id text,
  p_property_id uuid default null,
  p_details jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.activity_logs (actor_id, property_id, action, table_name, record_id, after)
  values (auth.uid(), p_property_id, p_action, p_table, p_record_id, p_details);
end;
$$;

revoke execute on function public.log_action(text, text, text, uuid, jsonb) from public, anon;
grant execute on function public.log_action(text, text, text, uuid, jsonb) to authenticated;

-- Internal helpers are not part of the public API.
revoke execute on function public.property_id_for_row(text, jsonb) from public, anon, authenticated;
revoke execute on function public.add_team_to_new_property() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.audit_row() from public, anon, authenticated;
