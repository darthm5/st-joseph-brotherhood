-- Step 57 · v1.8 Ratusha: decrees and delegated leaders
-- Execute in Supabase SQL Editor AFTER v1.7. Existing data is preserved.
begin;

-- Delegation is independent of site administrator status and guild rank.
create table if not exists public.guild_decree_officers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 appointed_by uuid not null references auth.users(id),
 appointed_at timestamptz not null default now()
);
alter table public.guild_decree_officers enable row level security;
revoke all on public.guild_decree_officers from anon,authenticated;

create or replace function public.guild_decree_member_ok() returns boolean
language sql stable security definer set search_path = '' as $$
 select (select auth.uid()) is not null and (
  public.is_site_admin() or exists (
   select 1 from public.profiles p where p.id=(select auth.uid()) and p.membership_status='approved'
  )
 );
$$;

create or replace function public.guild_decree_can_issue() returns boolean
language sql stable security definer set search_path = '' as $$
 select public.is_site_admin() or (
  public.guild_decree_member_ok() and exists (
   select 1 from public.guild_decree_officers o where o.user_id=(select auth.uid())
  )
 );
$$;

-- List officers for display; appointment/revocation reserved to site administrators.
create or replace function public.guild_decree_officers_list()
returns table(user_id uuid, appointed_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
 if not public.guild_decree_member_ok() then raise exception 'Access denied'; end if;
 return query select o.user_id,o.appointed_at from public.guild_decree_officers o order by o.appointed_at;
end; $$;

create or replace function public.guild_decree_officer_set(p_user_id uuid,p_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_site_admin() then raise exception 'Admin only'; end if;
 if p_user_id is null or p_enabled is null then raise exception 'Invalid arguments'; end if;
 if p_enabled then
  if not exists(select 1 from public.profiles p where p.id=p_user_id and p.membership_status='approved') then
   raise exception 'Only approved members can be appointed';
  end if;
  insert into public.guild_decree_officers(user_id,appointed_by)
  values(p_user_id,auth.uid()) on conflict (user_id) do nothing;
 else
  delete from public.guild_decree_officers where user_id=p_user_id;
 end if;
end; $$;

create table if not exists public.guild_decrees (
 id uuid primary key default gen_random_uuid(),
 decree_number integer generated always as identity unique,
 decree_year smallint not null check (decree_year between 1300 and 2200),
 kind text not null check (kind in ('decree','order','resolution')),
 title text not null check (char_length(btrim(title)) between 3 and 180),
 body text not null check (char_length(btrim(body)) between 1 and 30000),
 issued_on date not null default current_date,
 signed_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 repealed_at timestamptz,
 repealed_by uuid references auth.users(id),
 repeal_reason text check (char_length(repeal_reason) <= 2000)
);
create index if not exists guild_decrees_order_idx on public.guild_decrees(issued_on desc,decree_number desc);
alter table public.guild_decrees enable row level security;
revoke all on public.guild_decrees from anon,authenticated;
grant select on public.guild_decrees to authenticated;
drop policy if exists guild_decrees_read on public.guild_decrees;
create policy guild_decrees_read on public.guild_decrees for select to authenticated
using (public.guild_decree_member_ok());

create or replace function public.guild_decree_create(
 p_decree_year smallint,p_kind text,p_title text,p_body text,p_issued_on date
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if not public.guild_decree_can_issue() then raise exception 'Not authorized to issue decrees'; end if;
 insert into public.guild_decrees(decree_year,kind,title,body,issued_on,signed_by)
 values(p_decree_year,p_kind,btrim(p_title),btrim(p_body),coalesce(p_issued_on,current_date),auth.uid())
 returning id into v_id;
 return v_id;
end; $$;

create or replace function public.guild_decree_update(
 p_decree_id uuid,p_decree_year smallint,p_kind text,p_title text,p_body text,p_issued_on date
) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.guild_decree_can_issue() then raise exception 'Not authorized'; end if;
 update public.guild_decrees
 set decree_year=p_decree_year,kind=p_kind,title=btrim(p_title),body=btrim(p_body),
     issued_on=p_issued_on,updated_at=now()
 where id=p_decree_id and repealed_at is null
   and (public.is_site_admin() or signed_by=auth.uid());
 if not found then raise exception 'Decree not found, repealed, or not yours'; end if;
end; $$;

-- Repeal, don't delete: historical records remain readable.
create or replace function public.guild_decree_repeal(p_decree_id uuid,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.guild_decree_can_issue() then raise exception 'Not authorized'; end if;
 if p_reason is null or char_length(btrim(p_reason)) < 3 then raise exception 'Reason required'; end if;
 update public.guild_decrees
 set repealed_at=now(),repealed_by=auth.uid(),repeal_reason=btrim(p_reason),updated_at=now()
 where id=p_decree_id and repealed_at is null
   and (public.is_site_admin() or signed_by=auth.uid());
 if not found then raise exception 'Decree not found, repealed, or not yours'; end if;
end; $$;

revoke all on function public.guild_decree_member_ok() from public,anon;
revoke all on function public.guild_decree_can_issue() from public,anon;
revoke all on function public.guild_decree_officers_list() from public,anon;
revoke all on function public.guild_decree_officer_set(uuid,boolean) from public,anon;
revoke all on function public.guild_decree_create(smallint,text,text,text,date) from public,anon;
revoke all on function public.guild_decree_update(uuid,smallint,text,text,text,date) from public,anon;
revoke all on function public.guild_decree_repeal(uuid,text) from public,anon;
grant execute on function public.guild_decree_member_ok() to authenticated;
grant execute on function public.guild_decree_can_issue() to authenticated;
grant execute on function public.guild_decree_officers_list() to authenticated;
grant execute on function public.guild_decree_officer_set(uuid,boolean) to authenticated;
grant execute on function public.guild_decree_create(smallint,text,text,text,date) to authenticated;
grant execute on function public.guild_decree_update(uuid,smallint,text,text,text,date) to authenticated;
grant execute on function public.guild_decree_repeal(uuid,text) to authenticated;
commit;
