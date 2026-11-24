begin;
alter table public.storage_craft_batches add column if not exists request_type text not null default 'withdraw' check(request_type in ('withdraw','deposit'));
create or replace function public.storage_submit_deposit_batch_2763(p_token text,p_order_name text,p_items jsonb) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare result text; v_type text;
begin
 if p_token is null or p_token !~ '^CRAFT-DEPOSIT-' then raise exception 'Неверный токен'; end if;
 result:=public.storage_submit_craft_batch(p_token,p_order_name,p_items);
 select request_type into v_type from public.storage_craft_batches where token=p_token for update;
 if v_type='withdraw' then
  if result<>'pending' then raise exception 'Заявка уже обработана'; end if;
  update public.storage_craft_batches set request_type='deposit' where token=p_token;
 end if;
 return result;
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
   if v.request_type='withdraw' and available<r.q then raise exception 'Недостаточно ресурса: % (есть %, нужно %)',r.id,available,r.q; end if;
  end loop;
  insert into public.storage_transactions(item_id,member_id,quantity,description,recorded_by)
  select id,v.user_id,case when v.request_type='deposit' then q else -q end,'Заказ «'||v.order_name||'» '||v.token,auth.uid() from jsonb_to_recordset(v.items) as x(id uuid,q numeric);
 end if;
 update public.storage_craft_batches set status=case when p_approve then 'approved' else 'rejected' end, reviewed_at=now(),reviewed_by=auth.uid() where token=p_token returning status into v.status;
 return v.status;
end $$;

create table if not exists public.storage_manual_batch_tokens_2763(token text primary key, actor uuid not null, payload jsonb not null);
alter table public.storage_manual_batch_tokens_2763 enable row level security;
revoke all on public.storage_manual_batch_tokens_2763 from public,anon,authenticated;
create or replace function public.storage_manual_batch_2763(p_token text,p_order_name text,p_items jsonb,p_deposit boolean,p_member uuid) returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare r record; payload jsonb; prior jsonb; actor_id uuid;
begin
 if auth.uid() is null or not coalesce(public.is_site_admin(),false) then raise exception 'Нет доступа'; end if;
 if p_token is null or length(p_token)>120 or p_deposit is null or p_order_name is null or length(p_order_name)>500 or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Неверные данные'; end if;
 if jsonb_array_length(p_items) not between 1 and 500 then raise exception 'Неверный список'; end if;
 if exists(select 1 from jsonb_to_recordset(p_items) as x(id uuid,q numeric) where id is null or q is null or q<=0 or q<>trunc(q) or q>1000000000) then raise exception 'Неверное количество'; end if;
 payload:=jsonb_build_object('items',p_items,'name',p_order_name,'deposit',p_deposit,'member',p_member);
 insert into public.storage_manual_batch_tokens_2763 values(p_token,auth.uid(),payload) on conflict do nothing;
 if not found then select actor,t.payload into actor_id,prior from public.storage_manual_batch_tokens_2763 t where token=p_token; if actor_id<>auth.uid() or prior<>payload then raise exception 'Конфликт операции'; end if; return 'approved'; end if;
 lock table public.storage_transactions in share row exclusive mode;
 for r in select id,sum(q) q from jsonb_to_recordset(p_items) as x(id uuid,q numeric) group by id loop
  if r.q>1000000000 or not exists(select 1 from public.storage_items where id=r.id) then raise exception 'Неверный ресурс'; end if;
  if not p_deposit and (select coalesce(sum(quantity),0) from public.storage_transactions where item_id=r.id)<r.q then raise exception 'Недостаточно ресурсов'; end if;
  insert into public.storage_transactions(item_id,member_id,quantity,description,recorded_by) values(r.id,p_member,case when p_deposit then r.q else -r.q end,p_order_name,auth.uid());
 end loop;
 return 'approved';
end $$;
revoke all on function public.storage_submit_deposit_batch_2763(text,text,jsonb),public.storage_manual_batch_2763(text,text,jsonb,boolean,uuid) from public,anon;
grant execute on function public.storage_submit_deposit_batch_2763(text,text,jsonb),public.storage_manual_batch_2763(text,text,jsonb,boolean,uuid) to authenticated;
commit;
