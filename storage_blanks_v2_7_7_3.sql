-- Preserve item IDs, quantities, categories and history.
begin;
create or replace function public.storage_force_blank_material_2773()
returns trigger language plpgsql set search_path = pg_catalog, public as $$
begin
  if lower(new.name) ~ '(^|[^[:alnum:]])заготовка([^[:alnum:]]|$)' then
    new.section := 'materials';
  end if;
  return new;
end;
$$;
drop trigger if exists storage_force_blank_material_2773 on public.storage_items;
create trigger storage_force_blank_material_2773
before insert or update on public.storage_items
for each row execute function public.storage_force_blank_material_2773();
update public.storage_items set section='materials'
where lower(name) ~ '(^|[^[:alnum:]])заготовка([^[:alnum:]]|$)'
  and section is distinct from 'materials';
commit;
select name, category, section from public.storage_items
where lower(name) ~ '(^|[^[:alnum:]])заготовка([^[:alnum:]]|$)' order by name;
