-- Requires existing multi-item market migration (market_create_listing / market_edit_listing).
begin;
do $$ begin
 if to_regprocedure('public.market_create_listing(text,text,text,text,jsonb)') is null or to_regprocedure('public.market_edit_listing(uuid,text,text,text,text,jsonb)') is null then
 raise exception 'Existing multi-item market RPC signatures differ. Stop and inspect database before migrating.'; end if;
end $$;
alter table public.market_ad_items add column if not exists price_max bigint;
alter table public.market_ad_items drop constraint if exists market_price_range_v282;
alter table public.market_ad_items add constraint market_price_range_v282 check (price_max is null or (price is not null and price_max >= price and price_max <= 1000000000));
create or replace function public.market_range_items_v282(p_items jsonb) returns jsonb language plpgsql set search_path='' as $$
declare x jsonb; lo bigint; hi bigint; result jsonb:='[]'::jsonb;
begin
 if p_items is null or jsonb_typeof(p_items)<>'array' then raise exception 'Invalid items'; end if;
 if jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Invalid item count'; end if;
 for x in select value from jsonb_array_elements(p_items) loop
  lo:=(x->>'price')::bigint; hi:=(x->>'price_max')::bigint;
  if (lo is null)<>(hi is null) or lo<0 or hi<lo or hi>1000000000 then raise exception 'Invalid price range'; end if;
  result:=result||jsonb_build_array(x-'price_max');
 end loop;
 return result;
end $$;
create or replace function public.market_range_trigger_v282() returns trigger language plpgsql set search_path='' as $$
declare raw text; x jsonb;
begin
 raw:=current_setting('brotherhood.market_ranges_v282',true);
 if raw is not null and raw<>'' then
  select value into x from jsonb_array_elements(raw::jsonb) where value->>'item_id'=new.item_id::text limit 1;
  if found then new.price_max:=(x->>'price_max')::bigint; end if;
 elsif tg_op='UPDATE' then
  if new.price is distinct from old.price then new.price_max:=null; end if;
 end if;
 return new;
end $$;
drop trigger if exists market_range_v282 on public.market_ad_items;
create trigger market_range_v282 before insert or update on public.market_ad_items for each row execute function public.market_range_trigger_v282();
create or replace function public.market_create_listing_v282(p_type text,p_title text,p_description text,p_contact text,p_items jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare clean jsonb;
begin
 clean:=public.market_range_items_v282(p_items);
 perform set_config('brotherhood.market_ranges_v282',p_items::text,true);
 perform public.market_create_listing(p_type=>p_type,p_title=>p_title,p_description=>p_description,p_contact=>p_contact,p_items=>clean);
 perform set_config('brotherhood.market_ranges_v282','',true);
end $$;
create or replace function public.market_edit_listing_v282(p_id uuid,p_type text,p_title text,p_description text,p_contact text,p_items jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare clean jsonb;
begin
 clean:=public.market_range_items_v282(p_items);
 perform set_config('brotherhood.market_ranges_v282',p_items::text,true);
 perform public.market_edit_listing(p_id=>p_id,p_type=>p_type,p_title=>p_title,p_description=>p_description,p_contact=>p_contact,p_items=>clean);
 perform set_config('brotherhood.market_ranges_v282','',true);
end $$;
revoke all on function public.market_create_listing_v282(text,text,text,text,jsonb),public.market_edit_listing_v282(uuid,text,text,text,text,jsonb),public.market_range_items_v282(jsonb) from public,anon;
grant execute on function public.market_create_listing_v282(text,text,text,text,jsonb),public.market_edit_listing_v282(uuid,text,text,text,text,jsonb),public.market_range_items_v282(jsonb) to authenticated;
commit;
