-- =====================================================================
-- Rogue Analytics — Phase 1: accounts
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run
-- =====================================================================

-- ---------------------------------------------------------------------
-- Shared helper: keep updated_at current
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles: one row per auth user, synced from Discord metadata
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text,
  discord_id        text unique,
  discord_username  text,
  display_name      text,
  avatar_url        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Users can read only their own profile. No insert/update/delete policies:
-- the row is written by the trigger below, never by the browser.
create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- ---------------------------------------------------------------------
-- subscriptions: empty in phase 1; filled by the Whop webhook in phase 2
-- ---------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.profiles (id) on delete cascade,
  tier                 text not null check (tier in ('gamebooks', 'player_projections')),
  status               text not null check (status in ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  whop_membership_id   text unique,
  current_period_end   timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

-- Users can see their own subscriptions. Writes happen only with the
-- service-role key (the phase 2 Edge Function), which bypasses RLS.
create policy "subscriptions: read own"
  on public.subscriptions for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- Sync auth.users -> profiles on signup and on every later login
-- (Supabase refreshes raw_user_meta_data from Discord each sign-in,
--  so avatar and name changes flow through automatically.)
-- ---------------------------------------------------------------------
create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  uname text := regexp_replace(coalesce(meta ->> 'name', ''), '#0$', '');
begin
  insert into public.profiles (id, email, discord_id, discord_username, display_name, avatar_url)
  values (
    new.id,
    new.email,
    meta ->> 'provider_id',
    nullif(uname, ''),
    coalesce(
      meta -> 'custom_claims' ->> 'global_name',
      meta ->> 'full_name',
      nullif(uname, '')
    ),
    meta ->> 'avatar_url'
  )
  on conflict (id) do update set
    email            = excluded.email,
    discord_id       = excluded.discord_id,
    discord_username = excluded.discord_username,
    display_name     = excluded.display_name,
    avatar_url       = excluded.avatar_url;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.sync_profile_from_auth();

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of raw_user_meta_data, email on auth.users
  for each row execute function public.sync_profile_from_auth();
