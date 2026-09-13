-- Flow: public storage bucket for business logos.
-- Object path convention: <business_id>/logo.<ext>
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

create policy business_logos_public_read on storage.objects
  for select using (bucket_id = 'business-logos');

create policy business_logos_staff_write on storage.objects
  for insert with check (
    bucket_id = 'business-logos'
    and is_staff_of(((storage.foldername(name))[1])::uuid)
  );

create policy business_logos_staff_update on storage.objects
  for update using (
    bucket_id = 'business-logos'
    and is_staff_of(((storage.foldername(name))[1])::uuid)
  );

create policy business_logos_staff_delete on storage.objects
  for delete using (
    bucket_id = 'business-logos'
    and is_staff_of(((storage.foldername(name))[1])::uuid)
  );
