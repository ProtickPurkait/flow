-- Flow: enable Realtime postgres_changes for the tables the app subscribes
-- to. RLS alone does not do this -- a table has to be explicitly added to
-- the supabase_realtime publication before change events are broadcast at
-- all, regardless of what SELECT policies allow.
alter publication supabase_realtime add table stamp_events;
alter publication supabase_realtime add table memberships;
alter publication supabase_realtime add table reward_redemptions;
