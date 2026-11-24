begin;
create table if not exists public.storage_craft_batches (
 token text primary key, user_id uuid not null references auth.users(id), order_name text not null,
 items jsonb not null, status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(), reviewed_at timestamptz, reviewed_by uuid references auth.users(id)
);
alter table public.storage_craft_batches enable row level security;
revoke all on public.storage_craft_batches from public, anon, authenticated;
grant select on public.storage_craft_batches to authenticated;
drop policy if exists craft_batch_read on public.storage_craft_batches;
create policy craft_batch_read on public.storage_craft_batches for select to authenticated using (user_id=auth.uid() or public.is_site_admin());
create or replace function public.storage_submit_craft_batch(p_token text,p_order_name text,p_items jsonb) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.storage_craft_batches%rowtype; normalized jsonb;
begin
 if auth.uid() is null or not (coalesce(public.guild_is_approved(),false) or coalesce(public.is_site_admin(),false)) then raise exception 'Нет доступа'; end if;
 if p_token is null or length(p_token)>120 or p_token !~ '^CRAFT-' or p_order_name is null or length(p_order_name)>500 then raise exception 'Неверные данные заказа'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Неверный список'; end if;
 if jsonb_array_length(p_items) not between 1 and 500 then raise exception 'Неверный размер списка'; end if;
 if exists(select 1 from jsonb_to_recordset(p_items) as x(id uuid,q numeric) where id is null or q is null or q<=0 or q<>trunc(q) or q>1000000000 or not exists(select 1 from public.storage_items i where i.id=x.id)) then raise exception 'Неверный ресурс или количество'; end if;
 select jsonb_agg(jsonb_build_object('id',id,'q',q) order by id) into normalized from (select id,sum(q) q from jsonb_to_recordset(p_items) as x(id uuid,q numeric) group by id) s;
 insert into public.storage_craft_batches(token,user_id,order_name,items) values(p_token,auth.uid(),p_order_name,normalized) on conflict(token) do nothing;
 select * into v from public.storage_craft_batches where token=p_token;
 if v.user_id<>auth.uid() or v.items<>normalized or v.order_name<>p_order_name then raise exception 'Конфликт идентификатора заявки'; end if;
 return v.status;
end $$;
create or replace function public.storage_review_craft_batch(p_token text,p_approve boolean) returns text
language plpgsql security definer set search_path=public,pg_temp as $$
declare v public.storage_craft_batches%rowtype; r record; available numeric;
begin
 if auth.uid() is null or not coalesce(public.is_site_admin(),false) then raise exception 'Только администрация'; end if;
 if p_approve is null then raise exception 'Не указано решение'; end if;
 select * into v from public.storage_craft_batches where token=p_token for update;
 if not found then raise exception 'Заявка не найдена'; end if;
 if v.status<>'pending' then return v.status; end if;
 if p_approve then
  lock table public.storage_transactions in share row exclusive mode;
  for r in select * from jsonb_to_recordset(v.items) as x(id uuid,q numeric) loop
   select coalesce(sum(quantity),0) into available from public.storage_transactions where item_id=r.id;
   if available<r.q then raise exception 'Недостаточно ресурса: % (есть %, нужно %)',r.id,available,r.q; end if;
  end loop;
  insert into public.storage_transactions(item_id,member_id,quantity,description,recorded_by)
  select id,v.user_id,-q,'Заказ «'||v.order_name||'» '||v.token,auth.uid() from jsonb_to_recordset(v.items) as x(id uuid,q numeric);
 end if;
 update public.storage_craft_batches set status=case when p_approve then 'approved' else 'rejected' end, reviewed_at=now(),reviewed_by=auth.uid() where token=p_token returning status into v.status;
 return v.status;
end $$;
revoke all on function public.storage_submit_craft_batch(text,text,jsonb), public.storage_review_craft_batch(text,boolean) from public,anon;
grant execute on function public.storage_submit_craft_batch(text,text,jsonb), public.storage_review_craft_batch(text,boolean) to authenticated;
commit;
