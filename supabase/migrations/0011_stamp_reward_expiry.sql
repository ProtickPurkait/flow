-- Druto's Stamp Card editor includes a "Reward Day Expiry" field alongside
-- visits-required and reward description.
alter table stamp_programs add column reward_expiry_days int not null default 30;
