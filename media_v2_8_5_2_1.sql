begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('brotherhood-media','brotherhood-media',true,300000,array['image/webp']) on conflict(id) do update set public=true,file_size_limit=300000,allowed_mime_types=array['image/webp'];
drop policy if exists brotherhood_media_insert on storage.objects;
create policy brotherhood_media_insert on storage.objects for insert to authenticated with check(bucket_id='brotherhood-media' and (storage.foldername(name))[1]=auth.uid()::text and name ~ '^[0-9a-f-]+/[0-9a-f-]+\.webp$' and (public.is_site_admin() or exists(select 1 from public.profiles where id=auth.uid())));
commit;
