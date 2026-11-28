begin;
create table public.guild_admin_audit (
 id bigint generated always as identity primary key,
 created_at timestamptz not null default clock_timestamp(),
 actor_id uuid, actor_name text, source_table text not null,
 operation text not null check (operation in ('INSERT','UPDATE','DELETE')),
 before_data jsonb, after_data jsonb
);
alter table public.guild_admin_audit enable row level security;
revoke all on public.guild_admin_audit from public, anon, authenticated;
grant select on public.guild_admin_audit to authenticated;
create policy audit_admin_read on public.guild_admin_audit for select to authenticated using (public.is_site_admin());
create index guild_admin_audit_source_idx on public.guild_admin_audit(source_table,id desc);
create function public.audit_admin_v294() returns trigger language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); actor text; b jsonb; a jsonb; k text;
begin
 if uid is not null and not public.is_site_admin() then return null; end if;
 -- SQL editor operations have no auth.uid and are labelled separately.
 if uid is null and session_user not in ('postgres','supabase_admin') then return null; end if;
 if uid is not null then select concat_ws(' ',character_first_name,character_last_name) into actor from public.profiles where id=uid; end if;
 if tg_op <> 'INSERT' then b := '{}'::jsonb; foreach k in array tg_argv loop b:=b||jsonb_build_object(k,to_jsonb(old)->k); end loop; end if;
 if tg_op <> 'DELETE' then a := '{}'::jsonb; foreach k in array tg_argv loop a:=a||jsonb_build_object(k,to_jsonb(new)->k); end loop; end if;
 if tg_op='UPDATE' and a=b then return null; end if;
 insert into public.guild_admin_audit(actor_id,actor_name,source_table,operation,before_data,after_data) values(uid,actor,tg_table_name,tg_op,b,a);
 return null;
end; $$;
revoke all on function public.audit_admin_v294() from public,anon,authenticated;
create trigger audit_v294 after update of game_rank,membership_status on public.profiles for each row execute function public.audit_admin_v294('id','game_rank','membership_status');
create trigger audit_v294 after insert or update or delete on public.treasury_transactions for each row execute function public.audit_admin_v294('id','member_id','amount','description');
create trigger audit_v294 after insert or update or delete on public.treasury_requests for each row execute function public.audit_admin_v294('id','user_id','status','amount');
create trigger audit_v294 after insert or update or delete on public.storage_transactions for each row execute function public.audit_admin_v294('id','item_id','member_id','quantity','description');
create trigger audit_v294 after insert or update or delete on public.storage_requests for each row execute function public.audit_admin_v294('id','user_id','item_id','status','quantity');
create trigger audit_v294 after insert or update or delete on public.storage_craft_batches for each row execute function public.audit_admin_v294('token','user_id','status','order_name');
create trigger audit_v294 after insert or update or delete on public.guild_property for each row execute function public.audit_admin_v294('id','owner_id','title','kind','available','archived','weekly_cost');
create trigger audit_v294 after insert or update or delete on public.guild_cart_loans for each row execute function public.audit_admin_v294('id','property_id','borrower_id','status');
create trigger audit_v294 after insert or update or delete on public.guild_shop for each row execute function public.audit_admin_v294('item_id','item_name','price');
create trigger audit_v294 after insert or update or delete on public.guild_rank_descriptions for each row execute function public.audit_admin_v294('rank_level','rank_name','description');
create trigger audit_v294 after insert or update or delete on public.guild_award_grants for each row execute function public.audit_admin_v294('id','recipient_id','award_type_id','revoked_at');
create trigger audit_v294 after insert or update or delete on public.work_tasks for each row execute function public.audit_admin_v294('id','title','status','assigned_to','reward_amount');
create trigger audit_v294 after insert or update or delete on public.guild_events for each row execute function public.audit_admin_v294('id','title','status');
create trigger audit_v294 after insert or update or delete on public.guild_documents for each row execute function public.audit_admin_v294('id','title');
create trigger audit_v294 after insert or update or delete on public.guild_chronicle for each row execute function public.audit_admin_v294('id','title');
create trigger audit_v294 after insert or update or delete on public.guild_decrees for each row execute function public.audit_admin_v294('id','title');
commit;
notify pgrst, 'reload schema';
