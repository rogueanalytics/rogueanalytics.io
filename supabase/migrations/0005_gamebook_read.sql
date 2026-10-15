-- =====================================================================
-- Rogue Analytics — read access for Game Books
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run
--
-- gamebook and gamebook_slate are created and written by the CFB Command
-- Center (its docs/supabase_gamebook.sql + publish_gamebooks RPC), with RLS on
-- and no read policy. Run that file first; this one is skipped until the
-- tables exist. Read only: no insert/update/delete policies, so only the
-- service-role key (the Command Center) can write.
--
--   gamebook_slate  the listing (teams, kickoff, status; no report data):
--                   anyone can read, so locked games still show on the page.
--   gamebook        the report payload: an active or trialing Game Book plan
--                   (player_projections includes Game Books), or anyone for
--                   the week's free preview.
-- Safe to re-run.
-- =====================================================================

-- Entitled = active/trialing gamebooks or player_projections subscriber whose period
-- has not ended. Same shape as has_projection_access(); plpgsql so it creates even
-- before public.subscriptions exists (denies until then).
create or replace function public.has_gamebook_access() returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  return exists (
    select 1 from public.subscriptions s
    where s.user_id = (select auth.uid())
      and s.tier in ('gamebooks', 'player_projections')
      and s.status in ('active', 'trialing')
      and (s.current_period_end is null or s.current_period_end > now()));
exception when undefined_table then
  return false;
end $$;

do $$
begin
  if to_regclass('public.gamebook') is null or to_regclass('public.gamebook_slate') is null then
    raise notice 'Skipping: run the Command Center''s docs/supabase_gamebook.sql first';
    return;
  end if;

  alter table public.gamebook enable row level security;
  alter table public.gamebook_slate enable row level security;

  drop policy if exists "gamebook_slate: public read" on public.gamebook_slate;
  create policy "gamebook_slate: public read" on public.gamebook_slate
    for select to anon, authenticated using (true);
  grant select on public.gamebook_slate to anon, authenticated;

  drop policy if exists "gamebook: entitled or free preview" on public.gamebook;
  create policy "gamebook: entitled or free preview" on public.gamebook
    for select to anon, authenticated
    using (free_preview or public.has_gamebook_access());
  grant select on public.gamebook to anon, authenticated;
end
$$;
