-- =====================================================================
-- Rogue Analytics — profiles for Apple, Google and Discord sign-in
-- Run once in Supabase: Dashboard > SQL Editor > New query > paste > Run
-- Safe to re-run.
--
-- Why: 0001 built the profile from auth.users.raw_user_meta_data, which
-- assumes Discord. With more providers that breaks in three ways:
--   * discord_id / discord_username get filled with Google or Apple values
--     (provider_id and name exist for every provider);
--   * once identities are linked, the metadata of whichever provider signed
--     in last overwrites the others;
--   * Apple sends a name only on the very first sign-in, so later sign-ins
--     would blank display_name.
--
-- Now:
--   * auth.users trigger -> makes sure the profile row exists, keeps email.
--   * auth.identities trigger -> fills name/avatar from that provider's own
--     identity_data, and Discord fields only from the Discord identity.
--   * A value from a provider never replaces an existing value with null.
--   * display_name always ends up non-null (fallback below).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Name to show when no provider gave one. Uses the part of the email before
-- the @, except for Apple private-relay addresses (random strings).
-- ---------------------------------------------------------------------
create or replace function public.fallback_display_name(p_email text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_email is null
      or p_email ilike '%@privaterelay.appleid.com'
      or nullif(split_part(p_email, '@', 1), '') is null
    then 'Member'
    else split_part(p_email, '@', 1)
  end;
$$;

-- ---------------------------------------------------------------------
-- Apply one provider identity to its user's profile.
-- ---------------------------------------------------------------------
create or replace function public.apply_identity_to_profile(
  p_user_id     uuid,
  p_provider    text,
  p_provider_id text,
  p_data        jsonb
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  d          jsonb := coalesce(p_data, '{}'::jsonb);
  is_discord boolean := p_provider = 'discord';
  uname      text;
  pname      text;
  avatar     text;
begin
  -- Discord's "name" is the username, sometimes with a legacy "#0" suffix.
  if is_discord then
    uname := nullif(trim(regexp_replace(coalesce(d ->> 'name', ''), '#0$', '')), '');
  end if;

  -- Person's name as this provider gives it.
  --   discord: custom_claims.global_name, then full_name, then username
  --   google:  full_name / name
  --   apple:   full_name / name, on the first sign-in only
  pname := coalesce(
    nullif(trim(d -> 'custom_claims' ->> 'global_name'), ''),
    nullif(trim(d ->> 'full_name'), ''),
    case when is_discord then uname else nullif(trim(d ->> 'name'), '') end
  );

  avatar := coalesce(nullif(d ->> 'avatar_url', ''), nullif(d ->> 'picture', ''));

  -- The users trigger normally created the row already; this covers the gap.
  insert into public.profiles (id) values (p_user_id) on conflict (id) do nothing;

  update public.profiles p set
    display_name     = coalesce(pname, p.display_name, public.fallback_display_name(p.email)),
    avatar_url       = coalesce(avatar, p.avatar_url),
    discord_id       = case when is_discord then coalesce(p_provider_id, p.discord_id) else p.discord_id end,
    discord_username = case when is_discord then coalesce(uname, p.discord_username) else p.discord_username end
  where p.id = p_user_id;
end;
$$;

-- Not callable through the API (/rest/v1/rpc); only the triggers use it.
revoke all on function public.apply_identity_to_profile(uuid, text, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- auth.users: create the row, keep email in step. No name/avatar here.
-- ---------------------------------------------------------------------
create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, public.fallback_display_name(new.email))
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.sync_profile_from_auth();

-- Only email changes matter now; name/avatar come from identities.
drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email on auth.users
  for each row execute function public.sync_profile_from_auth();

-- ---------------------------------------------------------------------
-- auth.identities: one row per provider per user. Supabase inserts it on
-- first sign-in (or when a provider is linked) and refreshes identity_data
-- on every later sign-in with that provider.
-- ---------------------------------------------------------------------
create or replace function public.sync_profile_from_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.apply_identity_to_profile(new.user_id, new.provider, new.provider_id, new.identity_data);
  return new;
end;
$$;

drop trigger if exists on_auth_identity_changed on auth.identities;
create trigger on_auth_identity_changed
  after insert or update of identity_data on auth.identities
  for each row execute function public.sync_profile_from_identity();

-- ---------------------------------------------------------------------
-- Backfill existing users (today: Discord only). Re-running is harmless.
-- ---------------------------------------------------------------------
insert into public.profiles (id, email)
select u.id, u.email from auth.users u
on conflict (id) do nothing;

select public.apply_identity_to_profile(i.user_id, i.provider, i.provider_id, i.identity_data)
from auth.identities i;
