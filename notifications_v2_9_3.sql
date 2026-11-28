begin;
create table public.guild_notifications (
 id bigint generated always as identity primary key,
 recipient uuid not null references public.profiles(id) on delete cascade,
 section text not null check(section in ('profile','treasury','storehouse','work','calendar')),
 message text not null,
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create index guild_notifications_recipient_idx on public.guild_notifications(recipient,id desc);
create index guild_notifications_unread_idx on public.guild_notifications(recipient) where read_at is null;
alter table public.guild_notifications enable row level security;
revoke all on public.guild_notifications from public,anon,authenticated;
grant select on public.guild_notifications to authenticated;
grant update(read_at) on public.guild_notifications to authenticated;
create policy notifications_read on public.guild_notifications for select to authenticated using (recipient=auth.uid() and public.is_approved_member() and (section not in ('treasury','storehouse') or public.household_access_v288()));
create policy notifications_mark on public.guild_notifications for update to authenticated using (recipient=auth.uid() and public.is_approved_member() and (section not in ('treasury','storehouse') or public.household_access_v288())) with check (recipient=auth.uid() and public.is_approved_member() and (section not in ('treasury','storehouse') or public.household_access_v288()));
create function public.notify_guild_v293() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='profiles' then
  if new.game_rank is distinct from old.game_rank and new.membership_status='approved' then
   insert into public.guild_notifications(recipient,section,message) values(new.id,'profile','Ваш новый ранг: '||coalesce(new.game_rank,'Не назначен'));
  end if;
 elsif tg_table_name in ('storage_requests','storage_craft_batches','treasury_requests') then
  if new.status is distinct from old.status and new.status in ('approved','rejected') then
   insert into public.guild_notifications(recipient,section,message) values(new.user_id,case when tg_table_name='treasury_requests' then 'treasury' else 'storehouse' end,case when new.status='approved' then 'Ваша заявка одобрена.' else 'Ваша заявка отклонена.' end);
  end if;
 elsif tg_table_name='work_tasks' then
  if new.assigned_to is not null and new.status='assigned' then
   if tg_op='INSERT' then
    insert into public.guild_notifications(recipient,section,message) values(new.assigned_to,'work','Вам назначено поручение: '||new.title);
   elsif new.assigned_to is distinct from old.assigned_to or new.status is distinct from old.status then
    insert into public.guild_notifications(recipient,section,message) values(new.assigned_to,'work','Вам назначено поручение: '||new.title);
   end if;
  end if;
 elsif tg_table_name='guild_events' then
  if new.status='scheduled' then
   insert into public.guild_notifications(recipient,section,message) select id,'calendar','Новое событие: '||new.title from public.profiles where membership_status='approved';
  end if;
 end if;
 return new;
end; $$;
revoke all on function public.notify_guild_v293() from public,anon,authenticated;
create trigger notify_rank_v293 after update of game_rank on public.profiles for each row execute function public.notify_guild_v293();
create trigger notify_storage_v293 after update of status on public.storage_requests for each row execute function public.notify_guild_v293();
create trigger notify_batch_v293 after update of status on public.storage_craft_batches for each row execute function public.notify_guild_v293();
create trigger notify_treasury_v293 after update of status on public.treasury_requests for each row execute function public.notify_guild_v293();
create trigger notify_work_v293 after insert or update of assigned_to,status on public.work_tasks for each row execute function public.notify_guild_v293();
create trigger notify_calendar_v293 after insert on public.guild_events for each row execute function public.notify_guild_v293();
commit;
