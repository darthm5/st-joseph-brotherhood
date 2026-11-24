begin;
create table if not exists public.market_deals_v2823 (
 id uuid primary key default gen_random_uuid(), position_id uuid not null,
 item_name text not null, unit text not null, buyer_id uuid not null, seller_id uuid not null,
 quantity integer not null check(quantity between 1 and 100000000), price bigint not null check(price between 0 and 1000000000), created_at timestamptz not null default now(), check(buyer_id<>seller_id)
);
alter table public.market_deals_v2823 enable row level security;
revoke all on public.market_deals_v2823 from anon,authenticated;
grant select on public.market_deals_v2823 to authenticated;
drop policy if exists market_deals_read_v2823 on public.market_deals_v2823;
create policy market_deals_read_v2823 on public.market_deals_v2823 for select to authenticated using (public.is_site_admin() or exists(select 1 from public.profiles where id=auth.uid() and membership_status='approved'));
create or replace function public.market_finish_v2823(p_position uuid,p_partner uuid,p_quantity integer,p_price bigint) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r record;
begin
 if u is null or not (public.is_site_admin() or exists(select 1 from public.profiles where id=u and membership_status='approved')) then raise exception 'Access denied'; end if;
 select i.*,a.author_id,a.ad_type,a.status into r from public.market_ad_items i join public.market_ads a on a.id=i.ad_id where i.id=p_position for update of i,a;
 if not found or r.author_id<>u or r.status<>'active' or r.closed_v2822 or r.ad_type not in ('buy','sell') then raise exception 'Position unavailable'; end if;
 if p_partner is null or p_partner=u or not exists(select 1 from public.market_reactions_v2822 where position_id=p_position and user_id=p_partner) then raise exception 'Invalid partner'; end if;
 if p_quantity is null or p_quantity not between 1 and r.quantity or p_price is null or p_price not between 0 and 1000000000 then raise exception 'Invalid quantity or price'; end if;
 insert into public.market_deals_v2823(position_id,item_name,unit,buyer_id,seller_id,quantity,price) values(p_position,r.item_name,coalesce(r.unit,'шт.'),case when r.ad_type='buy' then u else p_partner end,case when r.ad_type='sell' then u else p_partner end,p_quantity,p_price);
 if p_quantity=r.quantity then update public.market_ad_items set closed_v2822=true where id=p_position; else update public.market_ad_items set quantity=quantity-p_quantity where id=p_position; end if;
end $$;
revoke all on function public.market_finish_v2823(uuid,uuid,integer,bigint) from public,anon;
grant execute on function public.market_finish_v2823(uuid,uuid,integer,bigint) to authenticated;
commit;
