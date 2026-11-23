-- Step 65 — Cartographic Chamber v2.2 (markers and routes)
-- Run once in Supabase SQL Editor. Existing site tables are not modified.
-- Coordinates are normalized to the map image: x/y between 0 and 1.
begin;

create or replace function public.guild_map_points_valid(p_points jsonb)
returns boolean language sql immutable set search_path = '' as $$
 select case when jsonb_typeof(p_points) <> 'array' then false
 when jsonb_array_length(p_points) not between 2 and 250 then false
 else not exists (
   select 1 from jsonb_array_elements(p_points) as pt(value)
   where jsonb_typeof(pt.value) <> 'object'
      or jsonb_typeof(pt.value->'x') <> 'number'
      or jsonb_typeof(pt.value->'y') <> 'number'
      or (pt.value->>'x')::numeric not between 0 and 1
      or (pt.value->>'y')::numeric not between 0 and 1
 ) end;
$$;

create table if not exists public.guild_map_markers (
 id uuid primary key default gen_random_uuid(),
 map_key text not null default 'kuttenberg' check (map_key in ('kuttenberg','trosky')),
 x numeric not null check (x between 0 and 1),
 y numeric not null check (y between 0 and 1),
 title text not null check (char_length(btrim(title)) between 1 and 120),
 description text not null default '' check (char_length(description) <= 3000),
 category text not null default 'other' check (category in ('resource','trade','meeting','workshop','warning','other')),
 visibility text not null default 'guild' check (visibility in ('guild','personal','leadership')),
 created_by uuid not null default auth.uid() references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table if not exists public.guild_map_routes (
 id uuid primary key default gen_random_uuid(),
 map_key text not null default 'kuttenberg' check (map_key in ('kuttenberg','trosky')),
 title text not null check (char_length(btrim(title)) between 1 and 120),
 description text not null default '' check (char_length(description) <= 3000),
 category text not null default 'other' check (category in ('trade','expedition','resource','patrol','other')),
 color text not null default '#b88a4a' check (color ~ '^#[0-9A-Fa-f]{6}$'),
 points jsonb not null check (public.guild_map_points_valid(points)),
 visibility text not null default 'guild' check (visibility in ('guild','personal','leadership')),
 created_by uuid not null default auth.uid() references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create index if not exists guild_map_markers_map_idx on public.guild_map_markers(map_key,category);
create index if not exists guild_map_markers_owner_idx on public.guild_map_markers(created_by);
create index if not exists guild_map_routes_map_idx on public.guild_map_routes(map_key,category);
create index if not exists guild_map_routes_owner_idx on public.guild_map_routes(created_by);

create or replace function public.guild_map_is_member()
returns boolean language sql stable security definer set search_path = '' as $$
 select (select auth.uid()) is not null and (
   public.is_site_admin() or exists (
     select 1 from public.profiles p
     where p.id=(select auth.uid()) and p.membership_status='approved'
   )
 );
$$;

-- Shared trigger: prevent changing authorship and maintain timestamps.
create or replace function public.guild_map_touch()
returns trigger language plpgsql set search_path = '' as $$
begin
 if new.created_by is distinct from old.created_by then
   raise exception 'Cannot change map entry author';
 end if;
 new.created_at := old.created_at;
 new.updated_at := now();
 return new;
end; $$;

drop trigger if exists guild_map_markers_touch on public.guild_map_markers;
create trigger guild_map_markers_touch before update on public.guild_map_markers
for each row execute function public.guild_map_touch();
drop trigger if exists guild_map_routes_touch on public.guild_map_routes;
create trigger guild_map_routes_touch before update on public.guild_map_routes
for each row execute function public.guild_map_touch();

alter table public.guild_map_markers enable row level security;
alter table public.guild_map_routes enable row level security;

-- A leadership note is visible to its author and site admins only.
-- All policies additionally require approved guild membership or site admin.
drop policy if exists guild_map_markers_select on public.guild_map_markers;
create policy guild_map_markers_select on public.guild_map_markers
for select to authenticated using (
 public.guild_map_is_member() and (
 visibility='guild' or created_by=(select auth.uid()) or public.is_site_admin()
 )
);
drop policy if exists guild_map_markers_insert on public.guild_map_markers;
create policy guild_map_markers_insert on public.guild_map_markers
for insert to authenticated with check (
 public.guild_map_is_member() and created_by=(select auth.uid())
);
drop policy if exists guild_map_markers_update on public.guild_map_markers;
create policy guild_map_markers_update on public.guild_map_markers
for update to authenticated using (
 public.guild_map_is_member() and (created_by=(select auth.uid()) or public.is_site_admin())
) with check (
 public.guild_map_is_member() and (created_by=(select auth.uid()) or public.is_site_admin())
);
drop policy if exists guild_map_markers_delete on public.guild_map_markers;
create policy guild_map_markers_delete on public.guild_map_markers
for delete to authenticated using (
 public.guild_map_is_member() and (created_by=(select auth.uid()) or public.is_site_admin())
);

drop policy if exists guild_map_routes_select on public.guild_map_routes;
create policy guild_map_routes_select on public.guild_map_routes
for select to authenticated using (
 public.guild_map_is_member() and (
 visibility='guild' or created_by=(select auth.uid()) or public.is_site_admin()
 )
);
drop policy if exists guild_map_routes_insert on public.guild_map_routes;
create policy guild_map_routes_insert on public.guild_map_routes
for insert to authenticated with check (
 public.guild_map_is_member() and created_by=(select auth.uid())
);
drop policy if exists guild_map_routes_update on public.guild_map_routes;
create policy guild_map_routes_update on public.guild_map_routes
for update to authenticated using (
 public.guild_map_is_member() and (created_by=(select auth.uid()) or public.is_site_admin())
) with check (
 public.guild_map_is_member() and (created_by=(select auth.uid()) or public.is_site_admin())
);
drop policy if exists guild_map_routes_delete on public.guild_map_routes;
create policy guild_map_routes_delete on public.guild_map_routes
for delete to authenticated using (
 public.guild_map_is_member() and (created_by=(select auth.uid()) or public.is_site_admin())
);

revoke all on public.guild_map_markers,public.guild_map_routes from anon;
grant select,insert,update,delete on public.guild_map_markers,public.guild_map_routes to authenticated;
revoke all on function public.guild_map_is_member() from public,anon;
grant execute on function public.guild_map_is_member() to authenticated;
revoke all on function public.guild_map_points_valid(jsonb) from public,anon;
grant execute on function public.guild_map_points_valid(jsonb) to authenticated;
commit;
