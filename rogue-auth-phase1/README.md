# Rogue Analytics — Accounts, phase 1

Discord sign-in via Supabase, a `profiles` row per user, and an empty `subscriptions`
table ready for Whop in phase 2. The site stays static on GitHub Pages.

## What's in here

| Path | Goes to | Purpose |
|---|---|---|
| `supabase/migrations/0001_accounts.sql` | Supabase SQL Editor | Tables, row-level security, profile sync trigger |
| `.env.example` | repo root | Supabase URL + public key template |
| `src/lib/supabase.js` | `src/lib/` | Supabase client (PKCE flow) |
| `src/auth/AuthProvider.jsx` | `src/auth/` | Session, profile, subscriptions, `hasTier()` |
| `src/auth/ProtectedRoute.jsx` | `src/auth/` | Gate routes by sign-in (and by tier, later) |
| `src/auth/AuthButton.jsx` | `src/auth/` | Sign in / Account link for the nav |
| `src/pages/SignIn.jsx` | `src/pages/` | `/sign-in` |
| `src/pages/AuthCallback.jsx` | `src/pages/` | `/auth/callback` — Discord returns here |
| `src/pages/Account.jsx` | `src/pages/` | `/account` — profile, plan status, plan list |
| `src/config/plans.js` | `src/config/` | Tier ids, prices, bundle rules |
| `src/styles/account.css` | `src/styles/` | Styles; map the tokens at the top to your site's |
| `src/App.routes.example.jsx` | reference only | How to wire routes + provider |

## Setup

### 1. Create the Supabase project
supabase.com → New project. Name it `rogue-analytics`, pick the US East region,
and save the database password somewhere safe.

### 2. Run the migration
Dashboard → **SQL Editor** → New query → paste `0001_accounts.sql` → **Run**.
Then open **Table Editor** and confirm `profiles` and `subscriptions` both show
"RLS enabled."

### 3. Create the Discord application
1. discord.com/developers/applications → **New Application** → name it "Rogue Analytics".
2. **OAuth2** → copy the **Client ID**, then **Reset Secret** and copy the **Client Secret**.
3. **OAuth2 → Redirects** → add
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
   (Supabase shows this exact URL on the Discord provider page in the next step.)

### 4. Turn on Discord in Supabase
Dashboard → **Authentication → Sign In / Providers → Discord** → enable, paste the
Client ID and Secret, save.

### 5. Set the allowed redirect URLs
Dashboard → **Authentication → URL Configuration**:
- **Site URL:** `https://rogueanalytics.io`
- **Redirect URLs:** add both
  - `http://localhost:5173/**`
  - `https://rogueanalytics.io/**`

### 6. Install and configure the frontend
```bash
npm install @supabase/supabase-js react-router-dom
copy .env.example .env.local      # Windows; fill in both values
```
Values come from Dashboard → **Project Settings → API**. Use the **anon** (or
**publishable**) key only. The service_role / secret key must never be in the
frontend or in the repo. Confirm `.env.local` is covered by `.gitignore`
(Vite's default `*.local` rule does this).

Copy the `src/` files into your project and merge the routes from
`App.routes.example.jsx` into your `App.jsx`.

### 7. Make deep links work on GitHub Pages
GitHub Pages returns 404 for `/account` or `/auth/callback` because those files
don't exist. The standard fix is to ship a copy of `index.html` as `404.html`
so the React app loads and handles the route. Add to `package.json`:
```json
"scripts": {
  "build": "vite build",
  "postbuild": "node -e \"require('fs').copyFileSync('dist/index.html','dist/404.html')\""
}
```
If you deploy with a GitHub Actions workflow, add `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY` as repository **variables** and pass them as `env:` on
the build step. Vite bakes them in at build time.

### 8. Test locally
`npm run dev` → open `http://localhost:5173/sign-in` → Continue with Discord →
authorize → you should land on `/account` with your avatar and name.

Then check in Supabase:
- **Authentication → Users**: your user exists.
- **Table Editor → profiles**: one row with your Discord id, username, and avatar.
  If `display_name` or `discord_username` looks off, open your user in
  Authentication → Users, look at the raw user metadata, and adjust the field
  names in `sync_profile_from_auth()`. Discord's metadata shape has changed
  before.

### 9. Check the security
In the browser console on the dev server (`localhost:5173`), while signed in:
```js
const { supabase } = await import('/src/lib/supabase.js');
await supabase.from('subscriptions').insert({ user_id: (await supabase.auth.getUser()).data.user.id, tier: 'gamebooks', status: 'active' });
```
This should fail with a row-level security error. A user must never be able
to grant themselves a plan.

## Decisions baked in

- **Discord-only sign-in.** Signing in the first time creates the account. To add
  email later: enable the Email provider in Supabase, then add an email form that
  calls `supabase.auth.signInWithOtp({ email })`. Nothing else changes.
- **Profiles are written only by the database trigger**, never by the browser.
  Name and avatar refresh from Discord on every sign-in.
- **Subscriptions are read-only to users.** Phase 2 writes them from a Supabase
  Edge Function using the service-role key.
- **Player Projections includes Gamebooks.** This is encoded in `plans.js`, so
  `hasTier('gamebooks')` is true for a $100 subscriber.

## Phase 2 preview (not built yet)
1. Create the two products in Whop and put their checkout links in `plans.js`.
2. Append the Supabase user id to the checkout link as metadata so the webhook
   knows which account paid.
3. Add a Supabase Edge Function `whop-webhook` that verifies Whop's signature and
   upserts into `subscriptions` on membership created, renewed, and cancelled events.
4. Gate content routes with `<ProtectedRoute tier="...">`.
