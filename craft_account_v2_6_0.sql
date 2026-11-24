begin;
create table if not exists public.craft_account_states (
 user_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 1,
 state jsonb not null,
 updated_at timestamptz not null default now()
);
alter table public.craft_account_states enable row level security;
revoke all on public.craft_account_states from public, anon, authenticated;
grant select on public.craft_account_states to authenticated;
drop policy if exists craft_account_read on public.craft_account_states;
create policy craft_account_read on public.craft_account_states for select to authenticated using (user_id=auth.uid());
create or replace function public.craft_account_save(p_revision bigint,p_state jsonb) returns bigint
language plpgsql security definer set search_path=public,pg_temp as $$
declare r bigint;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if p_revision is null or p_revision<0 or jsonb_typeof(p_state) is distinct from 'object' or jsonb_typeof(p_state->'ledger') is distinct from 'object' or jsonb_typeof(p_state->'favorites') is distinct from 'array' or octet_length(p_state::text)>2000000 then raise exception 'Invalid state or size limit exceeded'; end if;
 if p_revision=0 then
 insert into public.craft_account_states(user_id,state) values(auth.uid(),p_state) on conflict(user_id) do nothing returning revision into r;
 else
 update public.craft_account_states set state=p_state,revision=revision+1,updated_at=now() where user_id=auth.uid() and revision=p_revision returning revision into r;
 end if;
 return coalesce(r,-1);
end;$$;
revoke all on function public.craft_account_save(bigint,jsonb) from public,anon,authenticated;
grant execute on function public.craft_account_save(bigint,jsonb) to authenticated;
commit;
