-- Allow Fenlark super admins to update and delete any business (not just
-- their own staff-linked one) so the admin panel can offer full CRUD.
drop policy if exists businesses_update on businesses;
create policy businesses_update on businesses
  for update using (is_staff_of(id) or is_super_admin())
  with check (is_staff_of(id) or is_super_admin());

create policy businesses_delete on businesses
  for delete using (is_super_admin());
