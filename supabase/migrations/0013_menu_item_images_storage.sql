-- Flow: public storage bucket for digital menu item photos.
-- Object path convention: <business_id>/<item_id>.<ext>
insert into storage.buckets (id, name, public)
values ('menu-item-images', 'menu-item-images', true)
on conflict (id) do nothing;

create policy menu_item_images_public_read on storage.objects
  for select using (bucket_id = 'menu-item-images');

create policy menu_item_images_staff_write on storage.objects
  for insert with check (
    bucket_id = 'menu-item-images'
    and is_staff_of(((storage.foldername(name))[1])::uuid)
  );

create policy menu_item_images_staff_update on storage.objects
  for update using (
    bucket_id = 'menu-item-images'
    and is_staff_of(((storage.foldername(name))[1])::uuid)
  );

create policy menu_item_images_staff_delete on storage.objects
  for delete using (
    bucket_id = 'menu-item-images'
    and is_staff_of(((storage.foldername(name))[1])::uuid)
  );
