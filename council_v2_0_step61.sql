-- Step 61: Council hierarchy rank descriptions.
-- Existing profiles.game_rank remains the sole source of rank assignments.
begin;
create table if not exists public.guild_rank_descriptions (
  rank_level smallint primary key check (rank_level between 1 and 11),
  rank_name text not null,
  description text not null default '' check (char_length(description) <= 1000),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
insert into public.guild_rank_descriptions(rank_level,rank_name) values
 (11,'Глава гильдии'),(10,'Старейшина гильдии'),(9,'Казначей'),
 (8,'Писарь'),(7,'Купец'),(6,'Гильдмастер'),(5,'Мастер'),
 (4,'Подмастерье'),(3,'Возница'),(2,'Последователь'),(1,'Послушник')
on conflict(rank_level) do nothing;
alter table public.guild_rank_descriptions enable row level security;
drop policy if exists guild_rank_descriptions_read on public.guild_rank_descriptions;
create policy guild_rank_descriptions_read on public.guild_rank_descriptions
for select to authenticated using (
  public.is_site_admin() or exists (
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.membership_status='approved'
  )
);
revoke all on public.guild_rank_descriptions from anon,authenticated;
grant select on public.guild_rank_descriptions to authenticated;
create or replace function public.guild_rank_description_set(p_rank_level smallint,p_description text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_site_admin() then raise exception 'Admin only'; end if;
  if p_rank_level not between 1 and 11 then raise exception 'Unknown rank'; end if;
  if char_length(coalesce(p_description,'')) > 1000 then raise exception 'Description too long'; end if;
  update public.guild_rank_descriptions
  set description=btrim(coalesce(p_description,'')),updated_at=now(),updated_by=auth.uid()
  where rank_level=p_rank_level;
  if not found then raise exception 'Rank not found'; end if;
end; $$;
revoke all on function public.guild_rank_description_set(smallint,text) from public,anon;
grant execute on function public.guild_rank_description_set(smallint,text) to authenticated;
commit;
