begin;
create table if not exists public.guild_property (id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('house','cart')), owner_id uuid, title text not null check(length(trim(title)) between 1 and 120), location text not null default '', description text not null default '', image_url text not null default '', available boolean not null default true, archived boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.guild_cart_loans (id uuid primary key default gen_random_uuid(), property_id uuid not null references public.guild_property(id), cart_name text not null, owner_id uuid, borrower_id uuid not null, purpose text not null default '', due_at timestamptz, status text not null default 'pending' check(status in ('pending','rejected','cancelled','active','returning','returned')), created_at timestamptz not null default now(), decided_at timestamptz, returned_at timestamptz, return_requested_at timestamptz);
create unique index if not exists guild_cart_one_active on public.guild_cart_loans(property_id) where status in ('active','returning');
create unique index if not exists guild_cart_one_pending on public.guild_cart_loans(property_id,borrower_id) where status='pending';
alter table public.guild_property enable row level security;
alter table public.guild_cart_loans enable row level security;
revoke all on public.guild_property,public.guild_cart_loans from anon,authenticated;
grant select on public.guild_property,public.guild_cart_loans to authenticated;
create or replace function public.property_member() returns boolean language sql stable security definer set search_path='' as $$ select auth.uid() is not null and (public.is_site_admin() or exists(select 1 from public.profiles where id=auth.uid() and membership_status='approved')) $$;
drop policy if exists property_read on public.guild_property;
create policy property_read on public.guild_property for select to authenticated using(public.property_member());
drop policy if exists loan_read on public.guild_cart_loans;
create policy loan_read on public.guild_cart_loans for select to authenticated using(public.property_member());
create or replace function public.property_save(p_id uuid,p_kind text,p_owner uuid,p_title text,p_location text,p_description text,p_image text,p_available boolean,p_archive boolean) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); a boolean:=public.is_site_admin(); r public.guild_property;
begin
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
end $$;
create or replace function public.property_loan(p_property uuid,p_loan uuid,p_action text,p_purpose text,p_due timestamptz) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r public.guild_property; l public.guild_cart_loans; manager boolean;
begin
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
end $$;
revoke all on function public.property_member(),public.property_save(uuid,text,uuid,text,text,text,text,boolean,boolean),public.property_loan(uuid,uuid,text,text,timestamptz) from public,anon;
grant execute on function public.property_member(),public.property_save(uuid,text,uuid,text,text,text,text,boolean,boolean),public.property_loan(uuid,uuid,text,text,timestamptz) to authenticated;
commit;
