-- 0008 guests, domestic help, announcements, push subscriptions + push dispatch.

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Guests: an ID document is mandatory for every guest, even one night.
-- ---------------------------------------------------------------------------
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies (id) on delete restrict,
  name text not null check (length(name) between 1 and 120),
  phone text check (phone is null or phone ~ '^[0-9]{10}$'),
  relationship text,
  purpose text,
  check_in date not null,
  expected_checkout date,
  checked_out_at timestamptz,
  status text not null default 'upcoming' check (status in ('upcoming', 'currently_staying', 'checked_out')),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (expected_checkout is null or expected_checkout >= check_in)
);

create index guests_tenancy_idx on public.guests (tenancy_id, check_in desc);
alter table public.guests enable row level security;
revoke delete, truncate on public.guests from anon, authenticated;

create policy guests_select_own on public.guests
  for select to authenticated using (public.is_my_open_tenancy(tenancy_id));
create policy guests_insert_own on public.guests
  for insert to authenticated with check (public.is_my_open_tenancy(tenancy_id));
create policy guests_update_own on public.guests
  for update to authenticated using (public.is_my_open_tenancy(tenancy_id)) with check (public.is_my_open_tenancy(tenancy_id));
create policy guests_staff on public.guests
  for all to authenticated using (public.is_tenancy_staff(tenancy_id)) with check (public.is_tenancy_staff(tenancy_id));

create or replace function public.guests_set_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.status := case
    when new.checked_out_at is not null then 'checked_out'
    when new.check_in <= public.today_ist() then 'currently_staying'
    else 'upcoming'
  end;
  return new;
end;
$$;

create trigger guests_set_status
  before insert or update on public.guests
  for each row execute function public.guests_set_status();

-- Checked at COMMIT, so the guest and their ID document must be saved in the same transaction.
create or replace function public.guests_require_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.identity_documents d
    where d.owner_type = 'guest' and d.owner_id = new.id and d.front_path is not null
  ) then
    raise exception 'An ID document is required for every guest' using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create constraint trigger guests_require_id
  after insert on public.guests
  deferrable initially deferred
  for each row execute function public.guests_require_id();

create or replace function public.guests_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unit text;
begin
  select h.unit_number into v_unit from public.tenancies t join public.houses h on h.id = t.house_id where t.id = new.tenancy_id;
  perform public.notify_property_staff(public.tenancy_property_id(new.tenancy_id), 'guest_registered',
    jsonb_build_object('name', new.name, 'house', v_unit, 'date', new.check_in), '/owner/guests');
  return new;
end;
$$;

create trigger guests_after_insert
  after insert on public.guests
  for each row execute function public.guests_after_insert();

create trigger guests_audit
  after insert or update on public.guests
  for each row execute function public.audit_row();

-- One call: guest + ID in a single transaction (runs with the caller's RLS).
create or replace function public.register_guest(
  p_tenancy_id uuid, p_name text, p_phone text, p_relationship text, p_purpose text,
  p_check_in date, p_expected_checkout date,
  p_doc_type text, p_number_last4 text, p_front_path text, p_back_path text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if coalesce(p_front_path, '') = '' then
    raise exception 'An ID document is required for every guest' using errcode = 'check_violation';
  end if;
  insert into public.guests (tenancy_id, name, phone, relationship, purpose, check_in, expected_checkout)
  values (p_tenancy_id, p_name, nullif(p_phone, ''), nullif(p_relationship, ''), nullif(p_purpose, ''), p_check_in, p_expected_checkout)
  returning id into v_id;
  insert into public.identity_documents (owner_type, owner_id, tenancy_id, doc_type, number_last4, front_path, back_path)
  values ('guest', v_id, p_tenancy_id, p_doc_type, nullif(p_number_last4, ''), p_front_path, p_back_path);
  return v_id;
end;
$$;

-- Guest IDs are personal data too: they follow the 12-month retention rule from the checkout date.
create or replace function public.guest_checkout(p_guest_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.guests set checked_out_at = now() where id = p_guest_id and checked_out_at is null;
  if not found then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
end;
$$;

create or replace function public.guests_retention()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.checked_out_at is not null and old.checked_out_at is null then
    update public.identity_documents set purge_after = (new.checked_out_at + interval '12 months')::date
    where owner_type = 'guest' and owner_id = new.id and purge_after is null;
  end if;
  return new;
end;
$$;

create trigger guests_retention
  after update of checked_out_at on public.guests
  for each row execute function public.guests_retention();

-- ---------------------------------------------------------------------------
create table public.domestic_help (
  id uuid primary key default gen_random_uuid(),
  tenancy_id uuid not null references public.tenancies (id) on delete restrict,
  name text not null check (length(name) between 1 and 120),
  phone text check (phone is null or phone ~ '^[0-9]{10}$'),
  address text,
  role text not null check (role in ('maid', 'cook', 'driver', 'caretaker', 'other')),
  photo_path text,
  start_date date not null default public.today_ist(),
  end_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.domestic_help enable row level security;
revoke delete, truncate on public.domestic_help from anon, authenticated;
create policy domestic_help_own on public.domestic_help
  for all to authenticated using (public.is_my_open_tenancy(tenancy_id)) with check (public.is_my_open_tenancy(tenancy_id));
create policy domestic_help_staff on public.domestic_help
  for all to authenticated using (public.is_tenancy_staff(tenancy_id)) with check (public.is_tenancy_staff(tenancy_id));

create trigger domestic_help_audit
  after insert or update on public.domestic_help
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Announcements
-- ---------------------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  target text not null check (target in ('all', 'property', 'house', 'tenant')),
  target_id uuid,
  property_id uuid references public.properties (id) on delete cascade,
  title text not null check (length(title) between 1 and 140),
  body text not null check (length(body) between 1 and 4000),
  translations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check ((target = 'all') = (target_id is null))
);

alter table public.announcements enable row level security;
revoke update, delete, truncate on public.announcements from anon, authenticated;

-- Resolve property for scoping, and check the author may address that target.
create or replace function public.announcements_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.property_id := case new.target
    when 'property' then new.target_id
    when 'house' then public.house_property_id(new.target_id)
    when 'tenant' then (
      select h.property_id from public.tenancies t join public.houses h on h.id = t.house_id
      where t.tenant_id = new.target_id order by t.created_at desc limit 1)
    else null
  end;
  if new.target <> 'all' and (new.property_id is null or not public.is_property_staff(new.property_id)) then
    raise exception 'Not allowed' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger announcements_before_insert
  before insert on public.announcements
  for each row execute function public.announcements_before_insert();

create or replace function public.announcement_targets_me(p_target text, p_target_id uuid)
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
    join public.houses h on h.id = t.house_id
    where tn.user_id = auth.uid()
      and t.status in ('pending_agreement', 'active', 'notice_period')
      and case p_target
        when 'all' then true
        when 'property' then h.property_id = p_target_id
        when 'house' then h.id = p_target_id
        when 'tenant' then tn.id = p_target_id
        else false end
  );
$$;

create policy announcements_select_staff on public.announcements
  for select to authenticated using (
    public.is_staff() and (property_id is null or public.is_property_staff(property_id))
  );
create policy announcements_insert_staff on public.announcements
  for insert to authenticated with check (public.is_staff());
create policy announcements_select_tenant on public.announcements
  for select to authenticated using (public.announcement_targets_me(target, target_id));

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);

alter table public.announcement_reads enable row level security;
revoke update, delete, truncate on public.announcement_reads from anon, authenticated;

create or replace function public.announcement_visible(p_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.announcements a where a.id = p_id and public.announcement_targets_me(a.target, a.target_id));
$$;

create or replace function public.announcement_property(p_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select property_id from public.announcements where id = p_id;
$$;

create policy announcement_reads_own on public.announcement_reads
  for select to authenticated using (user_id = auth.uid());
create policy announcement_reads_insert_own on public.announcement_reads
  for insert to authenticated with check (user_id = auth.uid() and public.announcement_visible(announcement_id));
create policy announcement_reads_staff on public.announcement_reads
  for select to authenticated using (
    public.is_staff() and (public.announcement_property(announcement_id) is null
                           or public.is_property_staff(public.announcement_property(announcement_id)))
  );

-- Fan-out: each targeted tenant gets an in-app notification (and a push, see below).
create or replace function public.announcements_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select distinct tn.user_id
    from public.tenancies t
    join public.tenants tn on tn.id = t.tenant_id
    join public.houses h on h.id = t.house_id
    where tn.user_id is not null
      and t.status in ('pending_agreement', 'active', 'notice_period')
      and case new.target
        when 'all' then (h.property_id in (select m.property_id from public.property_members m where m.user_id = new.author_id))
        when 'property' then h.property_id = new.target_id
        when 'house' then h.id = new.target_id
        when 'tenant' then tn.id = new.target_id
        else false end
  loop
    perform public.notify(r.user_id, 'announcement', jsonb_build_object('title', new.title), '/tenant/announcements',
      'ann:' || new.id || ':' || r.user_id);
  end loop;
  return new;
end;
$$;

create trigger announcements_after_insert
  after insert on public.announcements
  for each row execute function public.announcements_after_insert();

create trigger announcements_audit
  after insert on public.announcements
  for each row execute function public.audit_row();

-- ---------------------------------------------------------------------------
-- Web push
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  endpoint text not null unique,
  keys jsonb not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_own on public.push_subscriptions
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Server-only settings (push dispatch URL + shared secret). No client access at all.
create table public.app_settings (
  key text primary key,
  value text not null
);
alter table public.app_settings enable row level security;
revoke all on public.app_settings from anon, authenticated;

-- New notification → ask the app to send a web push (if the user has subscribed and push is configured).
create or replace function public.notifications_push()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select value into v_url from public.app_settings where key = 'push_dispatch_url';
  select value into v_secret from public.app_settings where key = 'push_dispatch_secret';
  if v_url is null or v_secret is null then
    return new;
  end if;
  if not exists (select 1 from public.push_subscriptions s where s.user_id = new.user_id) then
    return new;
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('notification_id', new.id),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

create trigger notifications_push
  after insert on public.notifications
  for each row execute function public.notifications_push();

-- ---------------------------------------------------------------------------
create or replace function public.guests_daily()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  update public.guests set status = 'currently_staying'
  where status = 'upcoming' and check_in <= public.today_ist() and checked_out_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke execute on function public.guests_daily() from public, anon, authenticated;

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
      when 'guests_daily' then public.guests_daily()
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

-- 00:05 IST = 18:35 UTC
select cron.schedule('guests_daily', '35 18 * * *', $$select public.run_job('guests_daily')$$);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('people-photos', 'people-photos', false, 10485760, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
