-- =====================================================================
-- Rogue Analytics — public read access for team_stats_composite
-- Run once in Supabase after the Command Center's docs/supabase_team_stats_composite.sql
-- (which creates the table; that file also carries this policy, so running both is fine).
--
-- The five-factor composite ranking. Same as the other team tables (0002): anyone can
-- read, read only, only the service-role key (the Command Center) writes.
-- =====================================================================

drop policy if exists "team_stats_composite: public read" on public.team_stats_composite;
create policy "team_stats_composite: public read" on public.team_stats_composite
  for select to anon, authenticated using (true);
grant select on public.team_stats_composite to anon, authenticated;
