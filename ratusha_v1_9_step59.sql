-- Step 59 · v1.9 Private petitions
-- Execute in Supabase SQL Editor after v1.8.
begin;

create table if not exists public.guild_petitions (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references auth.users(id) on delete cascade,
 category text not null check (category in ('request','complaint','suggestion','resources','other')),
 title text not null check (char_length(btrim(title)) between 3 and 180),
 body text not null check (char_length(btrim(body)) between 5 and 10000),
 status text not null default 'submitted' check (status in ('submitted','reviewing','approved','rejected')),
 response text check (response is null or char_length(btrim(response)) between 3 and 10000),
 responded_by uuid references auth.users(id),
 responded_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint guild_petitions_response_consistency check (
   (status in ('submitted','reviewing') and response is null and responded_by is null and responded_at is null)
   or (status in ('approved','rejected') and response is not null and responded_by is not null and responded_at is not null)
 )
);
create index if not exists guild_petitions_author_idx on public.guild_petitions(author_id,created_at desc);
create index if not exists guild_petitions_status_idx on public.guild_petitions(status,created_at desc);
alter table public.guild_petitions enable row level security;
-- No direct table access: all reads and writes go through checked RPC functions.
revoke all on public.guild_petitions from public, anon, authenticated;

create or replace function public.guild_petition_can_review()
returns boolean language sql stable security definer set search_path = '' as $$
 select public.guild_decree_can_issue();
$$;

create or replace function public.guild_petition_submit(
 p_category text,p_title text,p_body text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 if not public.guild_decree_member_ok() then raise exception 'Only approved members can submit petitions'; end if;
 if p_category is null or p_title is null or p_body is null then raise exception 'Required fields missing'; end if;
 insert into public.guild_petitions(author_id,category,title,body)
 values(auth.uid(),p_category,btrim(p_title),btrim(p_body)) returning id into v_id;
 return v_id;
end; $$;

-- Authors can see their own petitions; delegated officers/admins can see all.
-- No public read policy or general table SELECT privilege exists.
create or replace function public.guild_petitions_list()
returns table(
 id uuid,author_id uuid,category text,title text,body text,status text,
 response text,responded_by uuid,responded_at timestamptz,
 created_at timestamptz,updated_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
 if not public.guild_decree_member_ok() then raise exception 'Access denied'; end if;
 return query
 select p.id,p.author_id,p.category,p.title,p.body,p.status,p.response,
        p.responded_by,p.responded_at,p.created_at,p.updated_at
 from public.guild_petitions p
 where p.author_id=auth.uid() or public.guild_petition_can_review()
 order by p.created_at desc;
end; $$;

-- Explicit per-item authorization even for direct ID lookups.
create or replace function public.guild_petition_get(p_petition_id uuid)
returns table(
 id uuid,author_id uuid,category text,title text,body text,status text,
 response text,responded_by uuid,responded_at timestamptz,
 created_at timestamptz,updated_at timestamptz
) language plpgsql stable security definer set search_path = '' as $$
begin
 if not public.guild_decree_member_ok() then raise exception 'Access denied'; end if;
 return query
 select p.id,p.author_id,p.category,p.title,p.body,p.status,p.response,
        p.responded_by,p.responded_at,p.created_at,p.updated_at
 from public.guild_petitions p
 where p.id=p_petition_id and (p.author_id=auth.uid() or public.guild_petition_can_review());
end; $$;

-- An officer takes the petition into review, then resolves it with a written response.
create or replace function public.guild_petition_review(p_petition_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.guild_petition_can_review() then raise exception 'Leadership only'; end if;
 update public.guild_petitions set status='reviewing',updated_at=now()
 where id=p_petition_id and status='submitted';
 if not found then raise exception 'Petition is not awaiting review'; end if;
end; $$;

create or replace function public.guild_petition_resolve(
 p_petition_id uuid,p_status text,p_response text
) returns void language plpgsql security definer set search_path = '' as $$
begin
 if not public.guild_petition_can_review() then raise exception 'Leadership only'; end if;
 if p_status not in ('approved','rejected') or p_response is null or char_length(btrim(p_response))<3 then
  raise exception 'Resolution and a written response are required';
 end if;
 update public.guild_petitions
 set status=p_status,response=btrim(p_response),responded_by=auth.uid(),
     responded_at=now(),updated_at=now()
 where id=p_petition_id and status in ('submitted','reviewing');
 if not found then raise exception 'Petition is already resolved or missing'; end if;
end; $$;

revoke all on function public.guild_petition_can_review() from public,anon;
revoke all on function public.guild_petition_submit(text,text,text) from public,anon;
revoke all on function public.guild_petitions_list() from public,anon;
revoke all on function public.guild_petition_get(uuid) from public,anon;
revoke all on function public.guild_petition_review(uuid) from public,anon;
revoke all on function public.guild_petition_resolve(uuid,text,text) from public,anon;
grant execute on function public.guild_petition_can_review() to authenticated;
grant execute on function public.guild_petition_submit(text,text,text) to authenticated;
grant execute on function public.guild_petitions_list() to authenticated;
grant execute on function public.guild_petition_get(uuid) to authenticated;
grant execute on function public.guild_petition_review(uuid) to authenticated;
grant execute on function public.guild_petition_resolve(uuid,text,text) to authenticated;
commit;
