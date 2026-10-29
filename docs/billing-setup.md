# Billing setup: Buildr → `public.subscriptions`

How a payment on rogueanalytics.buildr.bet becomes access on the site, and the
dashboard steps to turn it on.

## Why there's no Whop webhook

Buildr (buildr.bet) is a creator storefront. It sells our two plans with
Whop's embedded checkout, but Buildr's own servers create the Whop checkout,
so the Whop plans and their webhooks belong to Buildr. Checked October 2026:

- The checkout links (`/checkout/<pricing tier id>`) only read promo and offer
  query parameters, so a user id added to the URL would be dropped.
- Buildr has no webhooks (none in https://buildr.bet/docs or its OpenAPI file).
- Buildr's management API has what we need: `POST /api/v1/checkouts`
  (pricing tier, buyer email, `success_url`, `metadata`) and
  `GET /api/v1/members/{id}`, which lists a member's subscriptions with
  status and `current_period_end`.

## How it works

1. **Checkout** (`supabase/functions/buildr-checkout`). On `/account`, a
   signed-in user picks a plan and confirms the email to use on Buildr. The
   function reads the user id from their Supabase token, creates a Buildr
   checkout locked to that email, saves it in `public.buildr_checkouts` under
   the user id, and sends the browser to it. The pricing table and product
   pages send people to sign in first, then to `/account#plans`.
2. **Link.** On the first sync after a purchase, the function finds the
   Buildr member for that checkout email and saves the member id in
   `public.buildr_member_links` (one Buildr member per user, never moved to a
   second user). After that the stored member id is used and email isn't
   used. The email comes from the user's own checkout, not from the Discord or
   Google sign-in.
3. **Sync** (`supabase/functions/buildr-sync`). For each linked user, the
   function reads their Buildr subscriptions and upserts `public.subscriptions`
   on `buildr_subscription_id` (tier from the Buildr product id, status, and
   `current_period_end`). A subscription that Buildr no longer lists becomes
   `expired`. The sync runs:
   - every 5 minutes, from pg_cron, for everyone;
   - on every visit to `/account`;
   - after checkout, when Buildr sends the user back to
     `/account?checkout=success`. It retries for about a minute until the plan
     appears.

| Buildr status | `subscriptions.status` | Access |
|---|---|---|
| active | active | yes |
| trialing | trialing | yes |
| past_due, unpaid | past_due | no |
| canceled | canceled | no |
| no longer listed | expired | no |

A user who cancels loses access at the next sync, even if they have paid time
left. This is because `AuthProvider` and `has_projection_access` /
`has_gamebook_access` only count `active` and `trialing`. To keep access until
`current_period_end`, add `canceled` to the allowed statuses in all three
places.

The Buildr ids for each plan (pricing tier id and product id) are in
`supabase/functions/_shared/buildr.ts`. If you add or re-create a plan on
Buildr, update them there.

## Checklist

### Buildr dashboard
- [ ] Settings → Integrations → **Buildr API** → create the management key
      (`bld_sk_…`) with the **`checkouts:create`** and **`members:read`**
      permissions. Copy it when it's shown. It goes only into Supabase
      secrets, never into the site's code.
- [ ] If Buildr asks for allowed redirect or success URLs, add
      `https://rogueanalytics.io/account`.

### Supabase: database
- [ ] SQL Editor: run `supabase/migrations/0008_buildr_billing.sql`. It's safe
      to re-run. (`0001_accounts.sql` is in that folder now too, but it's
      already applied, so don't run it again.)

### Supabase: functions
Use the Supabase CLI, logged in and linked to the project (`supabase link`):

- [ ] Set the function secrets. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
      are set automatically. The service-role key is used only inside the
      functions.
  ```bash
  supabase secrets set BUILDR_API_KEY=bld_sk_xxx BUILDR_SYNC_SECRET=<random 32+ chars> SITE_URL=https://rogueanalytics.io
  ```
  | Variable | What it is |
  |---|---|
  | `BUILDR_API_KEY` | Buildr management key from the step above |
  | `BUILDR_SYNC_SECRET` | Any long random string. pg_cron sends it to run the full sync |
  | `SITE_URL` | Where Buildr returns buyers. Defaults to https://rogueanalytics.io |
- [ ] Deploy both functions. `buildr-sync` skips Supabase's JWT gate because
      pg_cron calls it with the secret instead; the function checks the
      secret or the user's token itself.
  ```bash
  supabase functions deploy buildr-checkout
  ```
  ```bash
  supabase functions deploy buildr-sync --no-verify-jwt
  ```

### Supabase: schedule
- [ ] Database → Extensions: enable **pg_cron** and **pg_net**.
- [ ] SQL Editor: store the project URL and the sync secret in Vault, then
      schedule the sync. Replace the two placeholders.
  ```sql
  select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
  select vault.create_secret('<BUILDR_SYNC_SECRET>', 'buildr_sync_secret');

  select cron.schedule(
    'buildr-sync',
    '*/5 * * * *',
    $$
    select net.http_post(
      url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/buildr-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-sync-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'buildr_sync_secret')
      ),
      body    := '{}'::jsonb
    );
    $$
  );
  ```
  Check the runs with
  `select * from cron.job_run_details order by start_time desc limit 5;`.
  Check the function's own output under Edge Functions → buildr-sync → Logs.

### Test end to end
Run this with the members area on (`npm run dev`, or a build with
`VITE_MEMBERS_ENABLED=true`). Production stays off until launch.

- [ ] Sign in, open `/account`, and click **Subscribe** on Game Book. Confirm
      the email, then pay on Buildr (use a 100% promo code, or a real $25 that
      you refund).
- [ ] You land back on `/account?checkout=success`, and within about a minute
      the plan shows as active. In SQL:
  ```sql
  select s.user_id, s.tier, s.status, s.current_period_end, s.buildr_subscription_id, l.buildr_user_id
  from public.subscriptions s
  left join public.buildr_member_links l using (user_id)
  order by s.updated_at desc limit 5;
  ```
  `user_id` is the account you were signed in as.
- [ ] `/college-football/gamebooks` unlocks.
- [ ] **Manage subscription** on `/account` opens Buildr billing
      (`rogueanalytics.buildr.bet/app/billing`). Cancel there.
- [ ] Reload `/account` (or wait up to 5 minutes). The row is now `canceled`
      and Game Books are locked again.
- [ ] Repeat with Player Projections and check `/college-football/projections`.

## Known limits
- Changes show up at the next sync, so expect up to 5 minutes of delay when
  the user isn't on `/account`.
- If someone pays on a plain Buildr link instead of going through `/account`,
  there's no checkout under their user id, so the sync can't find them. The
  same goes for an email that two of our users entered at checkout: the sync
  won't guess between them. Either way, find their Buildr member id (Buildr
  dashboard, or `GET /api/v1/members`) and link it by hand:
  ```sql
  insert into public.buildr_member_links (user_id, buildr_user_id)
  values ('<supabase user id>', '<buildr member id>');
  ```
- Linking trusts the email typed at checkout. Someone who knows another
  buyer's Buildr email, and enters it before that buyer is linked, could claim
  that buyer's plan. The check above blocks this whenever the real buyer used
  `/account`. Fully closing it needs "Sign in with Buildr" (OIDC: the `sub`
  claim is the member id), which Buildr only allows for existing members.
  That makes a good second step after launch.
- Account merge must carry `buildr_member_links` and `buildr_checkouts` along
  with `subscriptions`.
