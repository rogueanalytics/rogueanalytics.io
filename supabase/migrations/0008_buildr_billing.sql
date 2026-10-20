-- =====================================================================
-- Rogue Analytics — billing through Buildr (rogueanalytics.buildr.bet)
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run
-- Safe to re-run.
--
-- Buildr sells the plans (it runs Whop's checkout on its own servers) and has
-- no webhooks, so payments reach public.subscriptions like this:
--   1. buildr-checkout (Edge Function) creates a Buildr checkout for the
--      signed-in user and records it in buildr_checkouts under their user_id.
--   2. buildr-sync (Edge Function, on a schedule and after checkout) links each
--      user to their Buildr member id (buildr_member_links), reads that
--      member's subscriptions from the Buildr API, and upserts
--      public.subscriptions on buildr_subscription_id.
-- Everything is keyed on user_id. All three tables are written only with the
-- service-role key inside those functions.
-- =====================================================================

-- ---------------------------------------------------------------------
-- subscriptions: Buildr's subscription id. whop_membership_id stays for any
-- plan ever sold on Whop directly.
-- ---------------------------------------------------------------------
alter table public.subscriptions
  add column if not exists buildr_subscription_id text unique;

-- ---------------------------------------------------------------------
-- buildr_member_links: which Buildr member is which of our users.
-- One Buildr member per user and one user per Buildr member.
-- ---------------------------------------------------------------------
create table if not exists public.buildr_member_links (
  user_id         uuid primary key references public.profiles (id) on delete cascade,
  buildr_user_id  text not null unique,
  linked_at       timestamptz not null default now(),
  last_synced_at  timestamptz
);

alter table public.buildr_member_links enable row level security;

drop policy if exists "buildr_member_links: read own" on public.buildr_member_links;
create policy "buildr_member_links: read own"
  on public.buildr_member_links for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- buildr_checkouts: every checkout we created, so the sync can find the
-- Buildr member for a user who has not been linked yet. member_email is the
-- address the user confirmed on /account for that checkout; Buildr locks the
-- checkout to it, so it identifies the Buildr account the payment lands on.
-- No policies: service role only.
-- ---------------------------------------------------------------------
create table if not exists public.buildr_checkouts (
  id            text primary key,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  tier          text not null check (tier in ('gamebooks', 'player_projections')),
  member_email  text not null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz
);

create index if not exists buildr_checkouts_user_id_idx on public.buildr_checkouts (user_id, created_at desc);

alter table public.buildr_checkouts enable row level security;
