-- Flow: update the default per-business brand color to match Fenlark
-- Technologies' own palette (deep royal blue) instead of the earlier
-- placeholder violet. Only affects new businesses -- existing rows keep
-- whatever color they were already set to.
alter table businesses alter column brand_color set default '#3D5CDB';
