-- Druto's Profile & Settings shows a "Phone & Email" row for the business's
-- own contact email (separate from any staff account email).
alter table businesses add column email text;
