begin;
alter table public.guild_chronicle add column if not exists kind text not null default 'brotherhood' check (kind in ('brotherhood','lore'));
create or replace function public.guild_chronicle_create_v2852(
 p_title text, p_event_date date, p_summary text, p_body text, p_kind text, p_image_url text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if not public.is_site_admin() then raise exception 'Admin only'; end if;
 insert into public.guild_chronicle(title,event_date,summary,body,image_url,created_by,updated_by,kind)
 values(btrim(p_title),p_event_date,btrim(coalesce(p_summary,'')),btrim(p_body),nullif(btrim(p_image_url),''),auth.uid(),auth.uid(),p_kind)
 returning id into v_id;
 return v_id;
end; $$;

create or replace function public.guild_chronicle_update_v2852(
 p_id uuid, p_title text, p_event_date date, p_summary text, p_body text, p_kind text, p_image_url text default null
) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.is_site_admin() then raise exception 'Admin only'; end if;
 update public.guild_chronicle set title=btrim(p_title),event_date=p_event_date,
 summary=btrim(coalesce(p_summary,'')),body=btrim(p_body),image_url=nullif(btrim(p_image_url),''),
 updated_by=auth.uid(),updated_at=now(),kind=p_kind
 where id=p_id;
 if not found then raise exception 'Chronicle entry not found'; end if;
end; $$;

revoke all on function public.guild_chronicle_create_v2852(text,date,text,text,text,text) from public,anon;
grant execute on function public.guild_chronicle_create_v2852(text,date,text,text,text,text) to authenticated;
revoke all on function public.guild_chronicle_update_v2852(uuid,text,date,text,text,text,text) from public,anon;
grant execute on function public.guild_chronicle_update_v2852(uuid,text,date,text,text,text,text) to authenticated;
commit;
