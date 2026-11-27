begin;
create table if not exists public.guild_shop (item_id uuid primary key, item_name text not null, category text not null, unit text not null, price bigint not null check(price between 1 and 1000000000), updated_at timestamptz not null default now(), updated_by uuid not null);
create table if not exists public.guild_shop_history (id uuid primary key default gen_random_uuid(), item_id uuid not null, item_name text not null, old_price bigint, new_price bigint, actor_id uuid not null, created_at timestamptz not null default now());
alter table public.guild_shop enable row level security;
alter table public.guild_shop_history enable row level security;
revoke all on public.guild_shop,public.guild_shop_history from anon,authenticated;
grant select on public.guild_shop,public.guild_shop_history to authenticated;
drop policy if exists shop_read on public.guild_shop;
create policy shop_read on public.guild_shop for select to authenticated using(public.property_member());
drop policy if exists shop_history_read on public.guild_shop_history;
create policy shop_history_read on public.guild_shop_history for select to authenticated using(public.property_member());
create or replace function public.shop_save(p_items jsonb) returns void language plpgsql security definer set search_path='' as $$
declare x jsonb; k uuid; p bigint; oldp bigint; r public.storage_items; oldname text;
begin
 if auth.uid() is null or not public.is_site_admin() then raise exception 'Нет доступа'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 200 then raise exception 'Некорректный список'; end if;
 lock table public.guild_shop in share row exclusive mode;
 for x in select value from jsonb_array_elements(p_items) loop
  k:=(x->>'id')::uuid; p:=(x->>'price')::bigint;
  select price,item_name into oldp,oldname from public.guild_shop where item_id=k;
  if p is null then
   if oldp is null then continue; end if;
   delete from public.guild_shop where item_id=k;
  else
   if p not between 1 and 1000000000 then raise exception 'Некорректная цена'; end if;
   select * into r from public.storage_items where id=k and section='products';
   if not found then raise exception 'Товар не найден'; end if;
   oldname:=r.name;
   insert into public.guild_shop(item_id,item_name,category,unit,price,updated_by) values(k,r.name,r.category,coalesce(r.unit,'шт.'),p,auth.uid()) on conflict(item_id) do update set price=excluded.price,item_name=excluded.item_name,category=excluded.category,unit=excluded.unit,updated_by=excluded.updated_by,updated_at=now();
  end if;
  if oldp is distinct from p then insert into public.guild_shop_history(item_id,item_name,old_price,new_price,actor_id) values(k,oldname,oldp,p,auth.uid()); end if;
 end loop;
end $$;
revoke all on function public.shop_save(jsonb) from public,anon;
grant execute on function public.shop_save(jsonb) to authenticated;
commit;
