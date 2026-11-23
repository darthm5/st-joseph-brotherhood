-- Step 63: Hall of Fame v2.1 — manual awards only.
-- Run once in Supabase SQL Editor. No existing tables are changed.
begin;

create table if not exists public.guild_award_types (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 3 and 120),
  description text not null default '' check (char_length(description) <= 1500),
  category text not null check (category in ('order','medal','certificate','honorary','other')),
  image_url text check (image_url is null or (char_length(image_url) <= 2000 and image_url ~ '^https://[^[:space:]]+$')),
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guild_award_grants (
  id uuid primary key default gen_random_uuid(),
  award_type_id uuid not null references public.guild_award_types(id),
  recipient_id uuid not null references public.profiles(id),
  reason text not null check (char_length(btrim(reason)) between 3 and 3000),
  awarded_on date not null default current_date,
  granted_by uuid not null references auth.users(id),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  revocation_reason text check (revocation_reason is null or char_length(revocation_reason) <= 2000)
);
create index if not exists guild_award_grants_recipient_idx on public.guild_award_grants(recipient_id,granted_at desc);
create index if not exists guild_award_grants_type_idx on public.guild_award_grants(award_type_id,granted_at desc);

alter table public.guild_award_types enable row level security;
alter table public.guild_award_grants enable row level security;

drop policy if exists guild_award_types_read on public.guild_award_types;
create policy guild_award_types_read on public.guild_award_types
 for select to authenticated using (
   public.is_site_admin() or exists (
     select 1 from public.profiles p where p.id=(select auth.uid()) and p.membership_status='approved'
   )
 );
drop policy if exists guild_award_grants_read on public.guild_award_grants;
create policy guild_award_grants_read on public.guild_award_grants
 for select to authenticated using (
   public.is_site_admin() or exists (
     select 1 from public.profiles p where p.id=(select auth.uid()) and p.membership_status='approved'
   )
 );

revoke all on public.guild_award_types, public.guild_award_grants from anon, authenticated;
grant select on public.guild_award_types, public.guild_award_grants to authenticated;

create or replace function public.guild_award_type_create(
 p_name text, p_description text, p_category text, p_image_url text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if not public.is_site_admin() then raise exception 'Admin only'; end if;
 insert into public.guild_award_types(name,description,category,image_url,created_by)
 values (btrim(p_name),btrim(coalesce(p_description,'')),p_category,nullif(btrim(p_image_url),''),auth.uid())
 returning id into v_id;
 return v_id;
end; $$;

create or replace function public.guild_award_type_update(
 p_award_type_id uuid, p_name text, p_description text, p_category text,
 p_image_url text, p_is_active boolean
) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_site_admin() then raise exception 'Admin only'; end if;
 update public.guild_award_types set name=btrim(p_name),description=btrim(coalesce(p_description,'')),
 category=p_category,image_url=nullif(btrim(p_image_url),''),is_active=coalesce(p_is_active,true),updated_at=now()
 where id=p_award_type_id;
 if not found then raise exception 'Award not found'; end if;
end; $$;

create or replace function public.guild_award_grant(
 p_award_type_id uuid, p_recipient_id uuid, p_reason text, p_awarded_on date default current_date
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if not public.is_site_admin() then raise exception 'Admin only'; end if;
 if not exists (select 1 from public.guild_award_types where id=p_award_type_id and is_active) then
   raise exception 'Award type not active';
 end if;
 if not exists (select 1 from public.profiles where id=p_recipient_id and membership_status='approved') then
   raise exception 'Recipient must be an approved member';
 end if;
 insert into public.guild_award_grants(award_type_id,recipient_id,reason,awarded_on,granted_by)
 values(p_award_type_id,p_recipient_id,btrim(p_reason),coalesce(p_awarded_on,current_date),auth.uid())
 returning id into v_id;
 return v_id;
end; $$;

create or replace function public.guild_award_revoke(p_grant_id uuid,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_site_admin() then raise exception 'Admin only'; end if;
 if char_length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'Reason required'; end if;
 update public.guild_award_grants
 set revoked_at=now(),revoked_by=auth.uid(),revocation_reason=btrim(p_reason)
 where id=p_grant_id and revoked_at is null;
 if not found then raise exception 'Active grant not found'; end if;
end; $$;

revoke all on function public.guild_award_type_create(text,text,text,text) from public,anon;
revoke all on function public.guild_award_type_update(uuid,text,text,text,text,boolean) from public,anon;
revoke all on function public.guild_award_grant(uuid,uuid,text,date) from public,anon;
revoke all on function public.guild_award_revoke(uuid,text) from public,anon;
grant execute on function public.guild_award_type_create(text,text,text,text) to authenticated;
grant execute on function public.guild_award_type_update(uuid,text,text,text,text,boolean) to authenticated;
grant execute on function public.guild_award_grant(uuid,uuid,text,date) to authenticated;
grant execute on function public.guild_award_revoke(uuid,text) to authenticated;
commit;
