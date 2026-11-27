BEGIN;
CREATE OR REPLACE FUNCTION public.household_access_v288() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND membership_status='approved' AND game_rank IN ('Глава гильдии','Старейшина гильдии','Казначей','Писарь','Купец','Десятник','Гильдмастер','Мастер','Подмастерье','Возница','Охрана','Последователь'));
$$;
REVOKE ALL ON FUNCTION public.household_access_v288() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.household_access_v288() TO authenticated, anon;
ALTER TABLE public.guild_cart_loans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_rank_v288 ON public.guild_cart_loans;
CREATE POLICY household_rank_v288 ON public.guild_cart_loans AS RESTRICTIVE FOR ALL TO PUBLIC USING (public.household_access_v288()) WITH CHECK (public.household_access_v288());
ALTER TABLE public.guild_map_markers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_rank_v288 ON public.guild_map_markers;
CREATE POLICY household_rank_v288 ON public.guild_map_markers AS RESTRICTIVE FOR ALL TO PUBLIC USING (public.household_access_v288()) WITH CHECK (public.household_access_v288());
ALTER TABLE public.guild_map_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_rank_v288 ON public.guild_map_routes;
CREATE POLICY household_rank_v288 ON public.guild_map_routes AS RESTRICTIVE FOR ALL TO PUBLIC USING (public.household_access_v288()) WITH CHECK (public.household_access_v288());
ALTER TABLE public.guild_property ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_rank_v288 ON public.guild_property;
CREATE POLICY household_rank_v288 ON public.guild_property AS RESTRICTIVE FOR ALL TO PUBLIC USING (public.household_access_v288()) WITH CHECK (public.household_access_v288());
ALTER TABLE public.guild_shop ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_rank_v288 ON public.guild_shop;
CREATE POLICY household_rank_v288 ON public.guild_shop AS RESTRICTIVE FOR ALL TO PUBLIC USING (public.household_access_v288()) WITH CHECK (public.household_access_v288());
ALTER TABLE public.guild_shop_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_rank_v288 ON public.guild_shop_history;
CREATE POLICY household_rank_v288 ON public.guild_shop_history AS RESTRICTIVE FOR ALL TO PUBLIC USING (public.household_access_v288()) WITH CHECK (public.household_access_v288());
ALTER TABLE public.market_ad_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_rank_v288 ON public.market_ad_items;
CREATE POLICY household_rank_v288 ON public.market_ad_items AS RESTRICTIVE FOR ALL TO PUBLIC USING (public.household_access_v288()) WITH CHECK (public.household_access_v288());
ALTER TABLE public.market_ads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_rank_v288 ON public.market_ads;
CREATE POLICY household_rank_v288 ON public.market_ads AS RESTRICTIVE FOR ALL TO PUBLIC USING (public.household_access_v288()) WITH CHECK (public.household_access_v288());
ALTER TABLE public.market_deals_v2823 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_rank_v288 ON public.market_deals_v2823;
CREATE POLICY household_rank_v288 ON public.market_deals_v2823 AS RESTRICTIVE FOR ALL TO PUBLIC USING (public.household_access_v288()) WITH CHECK (public.household_access_v288());
ALTER TABLE public.market_reactions_v2822 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_rank_v288 ON public.market_reactions_v2822;
CREATE POLICY household_rank_v288 ON public.market_reactions_v2822 AS RESTRICTIVE FOR ALL TO PUBLIC USING (public.household_access_v288()) WITH CHECK (public.household_access_v288());
ALTER TABLE public.storage_craft_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_rank_v288 ON public.storage_craft_batches;
CREATE POLICY household_rank_v288 ON public.storage_craft_batches AS RESTRICTIVE FOR ALL TO PUBLIC USING (public.household_access_v288()) WITH CHECK (public.household_access_v288());
ALTER TABLE public.storage_manual_batch_tokens_2763 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_rank_v288 ON public.storage_manual_batch_tokens_2763;
CREATE POLICY household_rank_v288 ON public.storage_manual_batch_tokens_2763 AS RESTRICTIVE FOR ALL TO PUBLIC USING (public.household_access_v288()) WITH CHECK (public.household_access_v288());
ALTER TABLE public.storage_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_rank_v288 ON public.storage_requests;
CREATE POLICY household_rank_v288 ON public.storage_requests AS RESTRICTIVE FOR ALL TO PUBLIC USING (public.household_access_v288()) WITH CHECK (public.household_access_v288());
ALTER TABLE public.storage_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_rank_v288 ON public.storage_transactions;
CREATE POLICY household_rank_v288 ON public.storage_transactions AS RESTRICTIVE FOR ALL TO PUBLIC USING (public.household_access_v288()) WITH CHECK (public.household_access_v288());
ALTER TABLE public.treasury_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_rank_v288 ON public.treasury_requests;
CREATE POLICY household_rank_v288 ON public.treasury_requests AS RESTRICTIVE FOR ALL TO PUBLIC USING (public.household_access_v288()) WITH CHECK (public.household_access_v288());
ALTER TABLE public.treasury_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS household_rank_v288 ON public.treasury_transactions;
CREATE POLICY household_rank_v288 ON public.treasury_transactions AS RESTRICTIVE FOR ALL TO PUBLIC USING (public.household_access_v288()) WITH CHECK (public.household_access_v288());
CREATE OR REPLACE FUNCTION public.treasury_submit_request(p_amount bigint, p_comment text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
  if auth.uid() is null or not exists (
    select 1 from public.profiles
    where id = auth.uid()
      and membership_status = 'approved'
  ) then
    raise exception 'Доступ разрешён только членам братства';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Сумма должна быть положительной';
  end if;

  if length(coalesce(p_comment, '')) > 500 then
    raise exception 'Комментарий слишком длинный';
  end if;

  insert into public.treasury_requests (
    user_id, amount, comment
  )
  values (
    auth.uid(), p_amount, coalesce(p_comment, '')
  )
  returning id into v_id;

  return v_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.treasury_review_request(p_request_id uuid, p_approve boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_request public.treasury_requests%rowtype;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
  if auth.uid() is null
     or not public.is_site_admin() then
    raise exception 'Недостаточно прав';
  end if;

  if p_approve is null then
    raise exception 'Не указано решение';
  end if;

  -- Общая блокировка финансовых операций
  perform pg_catalog.pg_advisory_xact_lock(784321, 1);

  select * into v_request
  from public.treasury_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Заявка не найдена';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Заявка уже рассмотрена';
  end if;

  update public.treasury_requests
  set status = case
      when p_approve then 'approved'
      else 'rejected'
    end,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_request_id;

  if p_approve then
    insert into public.treasury_transactions (
      request_id,
      member_id,
      amount,
      description,
      recorded_by
    )
    values (
      v_request.id,
      v_request.user_id,
      v_request.amount,
      'Подтверждённый взнос: ' ||
        coalesce(v_request.comment, ''),
      auth.uid()
    );
  end if;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.treasury_add_transaction(p_amount bigint, p_description text, p_member_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_balance numeric;
  v_id uuid;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
  if auth.uid() is null
     or not public.is_site_admin() then
    raise exception 'Недостаточно прав';
  end if;

  if p_amount is null or p_amount = 0 then
    raise exception 'Сумма не может быть нулевой';
  end if;

  if p_description is null
     or length(btrim(p_description)) < 3
     or length(p_description) > 500 then
    raise exception 'Укажите назначение операции';
  end if;

  if p_member_id is not null and not exists (
    select 1 from public.profiles
    where id = p_member_id
  ) then
    raise exception 'Участник не найден';
  end if;

  -- Не допускаем одновременных конфликтующих расходов
  perform pg_catalog.pg_advisory_xact_lock(784321, 1);

  select coalesce(sum(amount), 0)
  into v_balance
  from public.treasury_transactions;

  if p_amount < 0 and v_balance + p_amount < 0 then
    raise exception 'Недостаточно грошей в казне';
  end if;

  insert into public.treasury_transactions (
    member_id,
    amount,
    description,
    recorded_by
  )
  values (
    p_member_id,
    p_amount,
    btrim(p_description),
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.storage_add_item(p_name text, p_category text DEFAULT 'Прочее'::text, p_unit text DEFAULT 'шт.'::text, p_description text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
  if auth.uid() is null or not public.is_site_admin() then
    raise exception 'Недостаточно прав';
  end if;

  if p_name is null
     or length(btrim(p_name)) not between 2 and 150 then
    raise exception 'Название должно содержать от 2 до 150 символов';
  end if;

  if p_category is null
     or length(btrim(p_category)) not between 1 and 100 then
    raise exception 'Укажите категорию';
  end if;

  if p_unit is null
     or length(btrim(p_unit)) not between 1 and 30 then
    raise exception 'Укажите единицу измерения';
  end if;

  if length(coalesce(p_description, '')) > 1000 then
    raise exception 'Описание слишком длинное';
  end if;

  insert into public.storage_items (
    name, category, unit, description, created_by
  )
  values (
    btrim(p_name),
    btrim(p_category),
    btrim(p_unit),
    coalesce(p_description, ''),
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.storage_submit_request(p_item_id uuid, p_request_type text, p_quantity bigint, p_comment text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
  if auth.uid() is null or not exists (
    select 1 from public.profiles
    where id = auth.uid()
      and membership_status = 'approved'
  ) then
    raise exception 'Доступ разрешён только членам братства';
  end if;

  if p_request_type is null
     or p_request_type not in ('deposit', 'withdraw') then
    raise exception 'Неверный тип заявки';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Количество должно быть положительным';
  end if;

  if length(coalesce(p_comment, '')) > 500 then
    raise exception 'Комментарий слишком длинный';
  end if;

  if not exists (
    select 1 from public.storage_items
    where id = p_item_id
  ) then
    raise exception 'Предмет не найден';
  end if;

  insert into public.storage_requests (
    user_id, item_id, request_type, quantity, comment
  )
  values (
    auth.uid(),
    p_item_id,
    p_request_type,
    p_quantity,
    coalesce(p_comment, '')
  )
  returning id into v_id;

  return v_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.storage_review_request(p_request_id uuid, p_approve boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_request public.storage_requests%rowtype;
  v_balance numeric;
  v_change bigint;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
  if auth.uid() is null or not public.is_site_admin() then
    raise exception 'Недостаточно прав';
  end if;

  if p_request_id is null or p_approve is null then
    raise exception 'Не указаны заявка или решение';
  end if;

  -- Общая блокировка изменений склада
  perform pg_catalog.pg_advisory_xact_lock(784321, 2);

  select * into v_request
  from public.storage_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Заявка не найдена';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'Заявка уже рассмотрена';
  end if;

  if p_approve then
    v_change := case
      when v_request.request_type = 'deposit'
        then v_request.quantity
      else -v_request.quantity
    end;

    select coalesce(sum(quantity), 0)
    into v_balance
    from public.storage_transactions
    where item_id = v_request.item_id;

    if v_balance + v_change < 0 then
      raise exception 'Недостаточно ресурсов на складе';
    end if;
  end if;

  update public.storage_requests
  set status = case
      when p_approve then 'approved'
      else 'rejected'
    end,
    reviewed_by = auth.uid(),
    reviewed_at = now()
  where id = p_request_id;

  if p_approve then
    insert into public.storage_transactions (
      request_id,
      item_id,
      member_id,
      quantity,
      description,
      recorded_by
    )
    values (
      v_request.id,
      v_request.item_id,
      v_request.user_id,
      v_change,
      case
        when v_request.request_type = 'deposit'
          then 'Передача в кладовую: '
        else 'Выдача из кладовой: '
      end || v_request.comment,
      auth.uid()
    );
  end if;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.storage_add_transaction(p_item_id uuid, p_quantity bigint, p_description text, p_member_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_balance numeric;
  v_id uuid;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
  if auth.uid() is null or not public.is_site_admin() then
    raise exception 'Недостаточно прав';
  end if;

  if p_quantity is null or p_quantity = 0 then
    raise exception 'Количество не может быть нулевым';
  end if;

  if p_description is null
     or length(btrim(p_description)) not between 3 and 500 then
    raise exception 'Укажите назначение операции';
  end if;

  if not exists (
    select 1 from public.storage_items
    where id = p_item_id
  ) then
    raise exception 'Предмет не найден';
  end if;

  if p_member_id is not null and not exists (
    select 1 from public.profiles
    where id = p_member_id
  ) then
    raise exception 'Участник не найден';
  end if;

  -- Та же блокировка, что при рассмотрении заявок
  perform pg_catalog.pg_advisory_xact_lock(784321, 2);

  select coalesce(sum(quantity), 0)
  into v_balance
  from public.storage_transactions
  where item_id = p_item_id;

  if v_balance + p_quantity < 0 then
    raise exception 'Недостаточно ресурсов на складе';
  end if;

  insert into public.storage_transactions (
    item_id,
    member_id,
    quantity,
    description,
    recorded_by
  )
  values (
    p_item_id,
    p_member_id,
    p_quantity,
    btrim(p_description),
    auth.uid()
  )
  returning id into v_id;

  return v_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.storage_add_product_item(p_name text, p_category text, p_unit text DEFAULT 'шт.'::text, p_description text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
  if auth.uid() is null or not public.is_site_admin() then
    raise exception 'Недостаточно прав';
  end if;
  if p_name is null or length(btrim(p_name)) not between 2 and 150 then
    raise exception 'Название должно содержать от 2 до 150 символов';
  end if;
  if p_category is null or btrim(p_category) not in (
    'Броня','Оружие','Портняжное','Лучное','Ювелирное',
    'Алхимия','Готовка','Пивоварение','Столярное'
  ) then
    raise exception 'Неверная категория готовой продукции';
  end if;
  if p_unit is null or length(btrim(p_unit)) not between 1 and 30 then
    raise exception 'Укажите единицу измерения';
  end if;
  if length(coalesce(p_description,'')) > 1000 then
    raise exception 'Описание слишком длинное';
  end if;
  insert into public.storage_items(name,category,unit,description,created_by,section)
  values(btrim(p_name),btrim(p_category),btrim(p_unit),coalesce(p_description,''),auth.uid(),'products')
  returning id into v_id;
  return v_id;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.market_delete_ad(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid := auth.uid();
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
  if v_user is null or not exists (
    select 1 from public.profiles where id=v_user and membership_status='approved'
  ) then raise exception 'Only approved members may delete ads'; end if;
  delete from public.market_ads where id=p_id and (author_id=v_user or public.is_site_admin());
  if not found then raise exception 'Ad not found or access denied'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION public.market_edit_ad(p_id uuid, p_type text, p_category text, p_title text, p_description text, p_quantity integer, p_price bigint, p_contact text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid := auth.uid();
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
  if v_user is null or not exists (
    select 1 from public.profiles where id = v_user and membership_status = 'approved'
  ) then raise exception 'Only approved members may edit ads'; end if;
  if p_type not in ('sell','buy','exchange') or p_type is null
     or char_length(btrim(coalesce(p_category,''))) not between 1 and 80
     or char_length(btrim(coalesce(p_title,''))) not between 3 and 140
     or char_length(coalesce(p_description,'')) > 3000
     or char_length(coalesce(p_contact,'')) > 200
     or p_quantity is null or p_quantity not between 1 and 100000000
     or (p_price is not null and p_price < 0)
  then raise exception 'Invalid ad fields'; end if;
  update public.market_ads set
    ad_type=p_type,category=btrim(p_category),title=btrim(p_title),
    description=coalesce(p_description,''),quantity=p_quantity,
    price=p_price,contact=coalesce(p_contact,''),updated_at=now()
  where id=p_id and author_id=v_user and status='active';
  if not found then raise exception 'Active ad not found or access denied'; end if;
end; $function$
;
CREATE OR REPLACE FUNCTION public.market_set_status(p_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
 if v_user is null or not exists(select 1 from public.profiles where id=v_user and membership_status='approved') then raise exception 'Only approved members may manage ads';end if;
 if p_status is null or p_status not in ('active','closed') then raise exception 'Invalid status';end if;
 update public.market_ads set status=p_status,updated_at=now()
 where id=p_id and author_id=v_user and status in ('active','closed');
 if not found then raise exception 'Ad unavailable, reserved or access denied';end if;
end;$function$
;
CREATE OR REPLACE FUNCTION public.market_create_ad(p_type text, p_category text, p_title text, p_description text, p_quantity integer, p_price bigint, p_contact text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid; v_user uuid := auth.uid();
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
  if v_user is null or not exists (
    select 1 from public.profiles where id = v_user and membership_status = 'approved'
  ) then raise exception 'Only approved members may post ads'; end if;
  if p_type not in ('sell','buy','exchange') or p_type is null then raise exception 'Invalid ad type'; end if;
  if char_length(btrim(coalesce(p_category,''))) not between 1 and 80
     or char_length(btrim(coalesce(p_title,''))) not between 3 and 140
     or char_length(coalesce(p_description,'')) > 3000
     or char_length(coalesce(p_contact,'')) > 200
     or p_quantity is null or p_quantity not between 1 and 100000000
     or (p_price is not null and p_price < 0)
  then raise exception 'Invalid ad fields'; end if;
  insert into public.market_ads (author_id,ad_type,category,title,description,quantity,price,contact)
  values (v_user,p_type,btrim(p_category),btrim(p_title),coalesce(p_description,''),p_quantity,p_price,coalesce(p_contact,''))
  returning id into v_id;
  return v_id;
end; $function$
;
CREATE OR REPLACE FUNCTION public.market_cancel_deal(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
 if v_user is null or not exists(select 1 from public.profiles where id=v_user and membership_status='approved') then
  raise exception 'Only approved members may manage deals';end if;
 update public.market_ads set status='active',deal_with=null,deal_at=null,updated_at=now()
 where id=p_id and author_id=v_user and status='deal';
 if not found then raise exception 'Сделка не найдена или недостаточно прав';end if;
end;$function$
;
CREATE OR REPLACE FUNCTION public.market_create_listing(p_type text, p_title text, p_description text, p_contact text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_ad uuid;v_line jsonb;v_item record;v_qty integer;v_price bigint;v_seen uuid[]:=array[]::uuid[];v_first boolean:=true;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
 if v_user is null or not exists(select 1 from public.profiles where id=v_user and membership_status='approved') then raise exception 'Only approved members may post'; end if;
 if p_type is null or p_type not in ('sell','buy') or char_length(btrim(coalesce(p_title,''))) not between 3 and 140
 or char_length(coalesce(p_description,''))>3000 or char_length(coalesce(p_contact,''))>200
 or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Invalid listing';end if;
 insert into public.market_ads(author_id,ad_type,title,description,contact,category,quantity,price)
 values(v_user,p_type,btrim(p_title),coalesce(p_description,''),coalesce(p_contact,''),'Несколько товаров',1,null) returning id into v_ad;
 for v_line in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_line) <> 'object' or (v_line->>'item_id') is null
   or (v_line->>'quantity') !~ '^[0-9]{1,9}$'
   or (v_line->>'price' is not null and (v_line->>'price') !~ '^[0-9]{1,15}$') then raise exception 'Invalid item';end if;
  select id,name,category,unit into v_item from public.storage_items where id=(v_line->>'item_id')::uuid;
  if not found or v_item.id=any(v_seen) then raise exception 'Unknown or duplicate catalog item';end if;
  v_seen:=array_append(v_seen,v_item.id);v_qty:=(v_line->>'quantity')::integer;
  if v_qty<1 or v_qty>100000000 then raise exception 'Invalid quantity';end if;
  v_price:=case when v_line->>'price' is null then null else (v_line->>'price')::bigint end;
  insert into public.market_ad_items(ad_id,item_id,item_name,category,unit,quantity,price)
  values(v_ad,v_item.id,v_item.name,v_item.category,coalesce(v_item.unit,'шт.'),v_qty,v_price);
  if v_first then update public.market_ads set category=v_item.category,quantity=v_qty,price=v_price where id=v_ad;v_first:=false;end if;
 end loop;
 return v_ad;
end;$function$
;
CREATE OR REPLACE FUNCTION public.market_edit_listing(p_id uuid, p_type text, p_title text, p_description text, p_contact text, p_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_ad record;v_line jsonb;v_item record;v_qty integer;v_price bigint;v_seen uuid[]:=array[]::uuid[];v_first boolean:=true;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
 if v_user is null or not exists(select 1 from public.profiles where id=v_user and membership_status='approved') then raise exception 'Only approved members may edit';end if;
 if p_type is null or p_type not in ('sell','buy') or char_length(btrim(coalesce(p_title,''))) not between 3 and 140
 or char_length(coalesce(p_description,''))>3000 or char_length(coalesce(p_contact,''))>200
 or jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Invalid listing';end if;
 select id into v_ad from public.market_ads where id=p_id and author_id=v_user and status='active' for update;
 if not found then raise exception 'Active listing not found';end if;
 -- Validate everything before replacing existing lines; transaction is atomic.
 for v_line in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(v_line)<>'object' or (v_line->>'item_id') is null
   or (v_line->>'quantity') !~ '^[0-9]{1,9}$'
   or (v_line->>'price' is not null and (v_line->>'price') !~ '^[0-9]{1,15}$') then raise exception 'Invalid item';end if;
  select id,name,category,unit into v_item from public.storage_items where id=(v_line->>'item_id')::uuid;
  if not found or v_item.id=any(v_seen) then raise exception 'Unknown or duplicate catalog item';end if;
  v_seen:=array_append(v_seen,v_item.id);v_qty:=(v_line->>'quantity')::integer;
  if v_qty<1 or v_qty>100000000 then raise exception 'Invalid quantity';end if;
 end loop;
 delete from public.market_ad_items where ad_id=p_id;
 update public.market_ads set ad_type=p_type,title=btrim(p_title),description=coalesce(p_description,''),contact=coalesce(p_contact,''),updated_at=now() where id=p_id;
 for v_line in select value from jsonb_array_elements(p_items) loop
  select id,name,category,unit into v_item from public.storage_items where id=(v_line->>'item_id')::uuid;
  v_qty:=(v_line->>'quantity')::integer;v_price:=case when v_line->>'price' is null then null else (v_line->>'price')::bigint end;
  insert into public.market_ad_items(ad_id,item_id,item_name,category,unit,quantity,price)
  values(p_id,v_item.id,v_item.name,v_item.category,coalesce(v_item.unit,'шт.'),v_qty,v_price);
  if v_first then update public.market_ads set category=v_item.category,quantity=v_qty,price=v_price where id=p_id;v_first:=false;end if;
 end loop;
end;$function$
;
CREATE OR REPLACE FUNCTION public.market_take_deal(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_author uuid;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
 if v_user is null or not exists(select 1 from public.profiles where id=v_user and membership_status='approved') then
  raise exception 'Only approved members may make deals';end if;
 select author_id into v_author from public.market_ads where id=p_id and status='active' for update;
 if not found then raise exception 'Объявление уже занято или недоступно';end if;
 if v_author=v_user then raise exception 'Нельзя заключить сделку с самим собой';end if;
 update public.market_ads set status='deal',deal_with=v_user,deal_at=now(),updated_at=now() where id=p_id;
end;$function$
;
CREATE OR REPLACE FUNCTION public.market_complete_deal(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
 if v_user is null or not exists(select 1 from public.profiles where id=v_user and membership_status='approved') then
  raise exception 'Только принятые участники могут завершать сделки';end if;
 update public.market_ads set status='completed',completed_at=now(),updated_at=now()
 where id=p_id and author_id=v_user and status='deal' and deal_with is not null;
 if not found then raise exception 'Сделка не найдена или недостаточно прав';end if;
end;$function$
;
CREATE OR REPLACE FUNCTION public.storage_submit_craft_batch(p_token text, p_order_name text, p_items jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.storage_craft_batches%rowtype; normalized jsonb;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
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
end $function$
;
CREATE OR REPLACE FUNCTION public.storage_review_craft_batch(p_token text, p_approve boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v public.storage_craft_batches%rowtype; r record; available numeric;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
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
end $function$
;
CREATE OR REPLACE FUNCTION public.storage_submit_deposit_batch_2763(p_token text, p_order_name text, p_items jsonb)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare result text; v_type text;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
 if p_token is null or p_token !~ '^CRAFT-DEPOSIT-' then raise exception 'Неверный токен'; end if;
 result:=public.storage_submit_craft_batch(p_token,p_order_name,p_items);
 select request_type into v_type from public.storage_craft_batches where token=p_token for update;
 if v_type='withdraw' then
  if result<>'pending' then raise exception 'Заявка уже обработана'; end if;
  update public.storage_craft_batches set request_type='deposit' where token=p_token;
 end if;
 return result;
end $function$
;
CREATE OR REPLACE FUNCTION public.storage_manual_batch_2763(p_token text, p_order_name text, p_items jsonb, p_deposit boolean, p_member uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare r record; payload jsonb; prior jsonb; actor_id uuid;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
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
end $function$
;
CREATE OR REPLACE FUNCTION public.property_save(p_id uuid, p_kind text, p_owner uuid, p_title text, p_location text, p_description text, p_image text, p_available boolean, p_archive boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); a boolean:=public.is_site_admin(); r public.guild_property;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
 if not public.property_member() then raise exception 'Нет доступа'; end if;
 if p_kind not in ('house','cart') or length(trim(p_title)) not between 1 and 120 or length(p_location)>200 or length(p_description)>4000 or (p_image<>'' and p_image !~ '^https://codmkmlbezxjccccswjp\.supabase\.co/storage/v1/object/public/brotherhood-media/[0-9a-f-]+/[0-9a-f-]+\.webp$') then raise exception 'Некорректные данные'; end if;
 if p_id is null then
  if not a and p_owner is distinct from u then raise exception 'Нет доступа'; end if;
  if p_owner is not null and not exists(select 1 from public.profiles where id=p_owner and (membership_status='approved' or id=u)) then raise exception 'Владелец не найден'; end if;
  insert into public.guild_property(kind,owner_id,title,location,description,image_url,available) values(p_kind,p_owner,trim(p_title),p_location,p_description,p_image,p_available);
 else
  select * into r from public.guild_property where id=p_id for update;
  if not found or r.archived or (not a and r.owner_id is distinct from u) or p_owner is distinct from r.owner_id or p_kind<>r.kind then raise exception 'Нет доступа'; end if;
  if p_archive and exists(select 1 from public.guild_cart_loans where property_id=p_id and status in ('active','returning')) then raise exception 'Сначала подтвердите возврат'; end if;
  update public.guild_property set title=trim(p_title),location=p_location,description=p_description,image_url=p_image,available=p_available,archived=p_archive where id=p_id;
  if p_archive then update public.guild_cart_loans set status='cancelled',decided_at=now() where property_id=p_id and status='pending'; end if;
 end if;
end $function$
;
CREATE OR REPLACE FUNCTION public.market_react_v2822(p_position uuid, p_on boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); owner_id uuid; st text; closed boolean;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
 if u is null or not (public.is_site_admin() or exists(select 1 from public.profiles where id=u and membership_status='approved')) then raise exception 'Access denied'; end if;
 select a.author_id,a.status,i.closed_v2822 into owner_id,st,closed from public.market_ad_items i join public.market_ads a on a.id=i.ad_id where i.id=p_position for update of i,a;
 if not found or owner_id=u or st<>'active' or closed then raise exception 'Position unavailable'; end if;
 if p_on then insert into public.market_reactions_v2822(position_id,user_id) values(p_position,u) on conflict do nothing; else delete from public.market_reactions_v2822 where position_id=p_position and user_id=u; end if;
end $function$
;
CREATE OR REPLACE FUNCTION public.market_position_v2822(p_position uuid, p_closed boolean, p_quantity integer, p_price bigint, p_max bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); owner_id uuid; st text;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
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
end $function$
;
CREATE OR REPLACE FUNCTION public.market_finish_v2823(p_position uuid, p_partner uuid, p_quantity integer, p_price bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); r record;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
 if u is null or not (public.is_site_admin() or exists(select 1 from public.profiles where id=u and membership_status='approved')) then raise exception 'Access denied'; end if;
 select i.*,a.author_id,a.ad_type,a.status into r from public.market_ad_items i join public.market_ads a on a.id=i.ad_id where i.id=p_position for update of i,a;
 if not found or r.author_id<>u or r.status<>'active' or r.closed_v2822 or r.ad_type not in ('buy','sell') then raise exception 'Position unavailable'; end if;
 if p_partner is null or p_partner=u or not exists(select 1 from public.market_reactions_v2822 where position_id=p_position and user_id=p_partner) then raise exception 'Invalid partner'; end if;
 if p_quantity is null or p_quantity not between 1 and r.quantity or p_price is null or p_price not between 0 and 1000000000 then raise exception 'Invalid quantity or price'; end if;
 insert into public.market_deals_v2823(position_id,item_name,unit,buyer_id,seller_id,quantity,price) values(p_position,r.item_name,coalesce(r.unit,'шт.'),case when r.ad_type='buy' then u else p_partner end,case when r.ad_type='sell' then u else p_partner end,p_quantity,p_price);
 if p_quantity=r.quantity then update public.market_ad_items set closed_v2822=true where id=p_position; else update public.market_ad_items set quantity=quantity-p_quantity where id=p_position; end if;
end $function$
;
CREATE OR REPLACE FUNCTION public.property_loan(p_property uuid, p_loan uuid, p_action text, p_purpose text, p_due timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); r public.guild_property; l public.guild_cart_loans; manager boolean;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
 if not public.property_member() then raise exception 'Нет доступа'; end if;
 select * into r from public.guild_property where id=p_property for update;
 if not found or r.archived or r.kind<>'cart' then raise exception 'Телега недоступна'; end if;
 manager:= (r.owner_id is not null and r.owner_id=u) or public.is_site_admin();
 if p_action='request' then
  if r.owner_id=u or not r.available or exists(select 1 from public.guild_cart_loans where property_id=r.id and status in ('active','returning')) or length(p_purpose)>1000 or (p_due is not null and p_due<=now()) then raise exception 'Телега недоступна или неверный срок'; end if;
  insert into public.guild_cart_loans(property_id,cart_name,owner_id,borrower_id,purpose,due_at) values(r.id,r.title,r.owner_id,u,p_purpose,p_due); return;
 end if;
 select * into l from public.guild_cart_loans where id=p_loan and property_id=r.id for update;
 if not found then raise exception 'Заявка не найдена'; end if;
 if p_action='approve' and manager and l.status='pending' and r.available and not exists(select 1 from public.guild_cart_loans where property_id=r.id and status in ('active','returning')) then
  update public.guild_cart_loans set status='active',decided_at=now() where id=l.id;
  update public.guild_cart_loans set status='rejected',decided_at=now() where property_id=r.id and status='pending';
 elsif p_action='reject' and manager and l.status='pending' then update public.guild_cart_loans set status='rejected',decided_at=now() where id=l.id;
 elsif p_action='cancel' and l.borrower_id=u and l.status='pending' then update public.guild_cart_loans set status='cancelled',decided_at=now() where id=l.id;
 elsif p_action='return' and l.borrower_id=u and l.status='active' then update public.guild_cart_loans set status='returning',return_requested_at=now() where id=l.id;
 elsif p_action='confirm' and manager and l.status='returning' then update public.guild_cart_loans set status='returned',returned_at=now() where id=l.id;
 else raise exception 'Действие недоступно'; end if;
end $function$
;
CREATE OR REPLACE FUNCTION public.property_save_v2861(p_id uuid, p_kind text, p_owner uuid, p_title text, p_location text, p_description text, p_image text, p_available boolean, p_archive boolean, p_weekly_cost bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
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
end $function$
;
CREATE OR REPLACE FUNCTION public.shop_save(p_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare x jsonb; k uuid; p bigint; oldp bigint; r public.storage_items; oldname text;
BEGIN
 IF NOT public.household_access_v288() THEN RAISE EXCEPTION 'Недостаточно прав для хозяйства' USING ERRCODE='42501'; END IF;
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
end $function$
;
COMMIT;
