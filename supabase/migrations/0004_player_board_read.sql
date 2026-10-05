-- =====================================================================
-- Rogue Analytics — read access for the Players page
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run
--
-- player_board, player_game_line, player_zone and player_board_meta are
-- created and written by the CFB Command Center (its
-- docs/supabase_player_board.sql + publish_player_board RPC), with RLS on and
-- no read policy. Decision 2026-10-05: free content, but signed-in accounts
-- only (no anon read).
-- Read only: no insert/update/delete policies, so only the service-role key
-- (the Command Center) can write.
--
-- player_week (the subscriber-only projection) is NOT touched here: its read
-- policy is created by the Command Center's SQL.
-- Safe to re-run.
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array['player_board', 'player_game_line', 'player_zone', 'player_board_meta'] loop
    execute format('drop policy if exists "%1$s: signed-in read" on public.%1$I', t);
    execute format(
      'create policy "%1$s: signed-in read" on public.%1$I for select to authenticated using (true)', t);
    execute format('revoke select on public.%I from anon', t);
    execute format('grant select on public.%I to authenticated', t);
  end loop;
end
$$;
