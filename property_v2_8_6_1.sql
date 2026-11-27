begin;
alter table public.guild_property add column if not exists weekly_cost bigint not null default 0 check (weekly_cost between 0 and 1000000000);
create or replace function public.property_save_v2861(p_id uuid,p_kind text,p_owner uuid,p_title text,p_location text,p_description text,p_image text,p_available boolean,p_archive boolean,p_weekly_cost bigint) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_weekly_cost is null or p_weekly_cost not between 0 and 1000000000 then raise exception 'Некорректное содержание'; end if;
 -- Reuse existing authorization, validation and locking for edits.
 if p_id is not null then
  perform public.property_save(p_id,p_kind,p_owner,p_title,p_location,p_description,p_image,p_available,p_archive);
  update public.guild_property set weekly_cost=p_weekly_cost where id=p_id;
 else
  if not public.property_member() then raise exception 'Нет доступа'; end if;
  if not public.is_site_admin() and p_owner is distinct from auth.uid() then raise exception 'Нет доступа'; end if;
  if p_owner is not null and not exists(select 1 from public.profiles where id=p_owner and (membership_status='approved' or id=auth.uid())) then raise exception 'Владелец не найден'; end if;
  if p_kind not in ('house','cart') or length(trim(p_title)) not between 1 and 120 or length(p_location)>200 or length(p_description)>4000 or (p_image<>'' and p_image !~ '^https://codmkmlbezxjccccswjp\.supabase\.co/storage/v1/object/public/brotherhood-media/[0-9a-f-]+/[0-9a-f-]+\.webp$') then raise exception 'Некорректные данные'; end if;
  insert into public.guild_property(kind,owner_id,title,location,description,image_url,available,weekly_cost) values(p_kind,p_owner,trim(p_title),p_location,p_description,p_image,true,p_weekly_cost);
 end if;
end $$;
revoke all on function public.property_save_v2861(uuid,text,uuid,text,text,text,text,boolean,boolean,bigint) from public,anon;
grant execute on function public.property_save_v2861(uuid,text,uuid,text,text,text,text,boolean,boolean,bigint) to authenticated;
commit;
