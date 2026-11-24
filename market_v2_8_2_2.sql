begin;
alter table public.market_ad_items add column if not exists closed_v2822 boolean not null default false;
create table if not exists public.market_reactions_v2822(position_id uuid not null references public.market_ad_items(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now(),primary key(position_id,user_id));
alter table public.market_reactions_v2822 enable row level security;
revoke all on public.market_reactions_v2822 from anon,authenticated;
grant select on public.market_reactions_v2822 to authenticated;
drop policy if exists market_reactions_read_v2822 on public.market_reactions_v2822;
create policy market_reactions_read_v2822 on public.market_reactions_v2822 for select to authenticated using ((public.is_site_admin() or exists(select 1 from public.profiles p where p.id=auth.uid() and p.membership_status='approved')) and exists(select 1 from public.market_ad_items i where i.id=position_id));
create or replace function public.market_react_v2822(p_position uuid,p_on boolean) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); owner_id uuid; st text; closed boolean;
begin
 if u is null or not (public.is_site_admin() or exists(select 1 from public.profiles where id=u and membership_status='approved')) then raise exception 'Access denied'; end if;
 select a.author_id,a.status,i.closed_v2822 into owner_id,st,closed from public.market_ad_items i join public.market_ads a on a.id=i.ad_id where i.id=p_position for update of i,a;
 if not found or owner_id=u or st<>'active' or closed then raise exception 'Position unavailable'; end if;
 if p_on then insert into public.market_reactions_v2822(position_id,user_id) values(p_position,u) on conflict do nothing; else delete from public.market_reactions_v2822 where position_id=p_position and user_id=u; end if;
end $$;
create or replace function public.market_position_v2822(p_position uuid,p_closed boolean,p_quantity integer,p_price bigint,p_max bigint) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); owner_id uuid; st text;
begin
 if u is null or not (public.is_site_admin() or exists(select 1 from public.profiles where id=u and membership_status='approved')) then raise exception 'Access denied'; end if;
 select a.author_id,a.status into owner_id,st from public.market_ad_items i join public.market_ads a on a.id=i.ad_id where i.id=p_position for update of i,a;
 if not found or owner_id<>u or st<>'active' then raise exception 'Position unavailable'; end if;
 if p_closed is not null then update public.market_ad_items set closed_v2822=p_closed where id=p_position;
 else
 if p_quantity is null or p_quantity not between 1 and 100000000 or (p_price is null)<>(p_max is null) or p_price<0 or p_max<p_price or p_max>1000000000 then raise exception 'Invalid quantity or price'; end if;
 -- Existing range trigger reads this transaction-local setting.
 perform set_config('brotherhood.market_ranges_v282', (select jsonb_build_array(jsonb_build_object('item_id',item_id,'price_max',p_max))::text from public.market_ad_items where id=p_position),true);
 update public.market_ad_items set quantity=p_quantity,price=p_price,price_max=p_max where id=p_position;
 perform set_config('brotherhood.market_ranges_v282','',true);
 end if;
end $$;
revoke all on function public.market_react_v2822(uuid,boolean),public.market_position_v2822(uuid,boolean,integer,bigint,bigint) from public,anon;
grant execute on function public.market_react_v2822(uuid,boolean),public.market_position_v2822(uuid,boolean,integer,bigint,bigint) to authenticated;
commit;
