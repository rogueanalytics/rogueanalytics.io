-- =====================================================================
-- Rogue Analytics — public read access for the Team Rankings page
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run
--
-- The four team_stats tables are created and written by the CFB Command
-- Center (its docs/supabase_team_stats.sql + publish_team_stats RPC).
-- Decision 2026-10-01: anyone can read them, no subscription needed.
-- Read only: no insert/update/delete policies, so only the service-role
-- key (the Command Center) can write.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array['team_stats_basic', 'team_stats_advanced', 'team_stats_adjusted', 'team_stats_meta'] loop
    execute format('drop policy if exists "%1$s: public read" on public.%1$I', t);
    execute format(
      'create policy "%1$s: public read" on public.%1$I for select to anon, authenticated using (true)', t);
    execute format('grant select on public.%I to anon, authenticated', t);
  end loop;
end
$$;

