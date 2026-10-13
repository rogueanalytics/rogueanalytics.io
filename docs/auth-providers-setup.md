# Apple and Google sign-in: dashboard checklist

The code is done: `/sign-in` shows Apple, Google and Discord, and
`supabase/migrations/0007_multi_provider_profiles.sql` handles each provider's
profile data. What's left is dashboard work that only you can do.

**Secrets rule:** Google's client secret, Apple's `.p8` key and the Apple JWT go
into the Supabase dashboard and nowhere else. They don't go in the repo, `.env*`,
GitHub variables or the frontend. The browser only ever gets the Supabase anon key.

Your Supabase callback URL (it's used by all three providers):

```
https://jcsqxliaeaktiqjqucap.supabase.co/auth/v1/callback
```

(Supabase shows the same URL on each provider's page under Authentication → Sign In / Providers.)

---

## 0. Supabase prep (5 min)

- [ ] **SQL Editor** → New query → paste `supabase/migrations/0007_multi_provider_profiles.sql` → Run.
      It is safe to re-run. Afterwards, **Table Editor → profiles** should show
      your Discord row with no visible changes.
      If Supabase rejects `create trigger ... on auth.identities` with a
      permissions error, stop and tell me. The fallback is to move the logic
      back onto `auth.users`.
- [ ] **Authentication → URL Configuration → Redirect URLs**: add
      `http://localhost:5180/**`, which is the port this repo's dev server uses (`.claude/launch.json`).
      Leave the existing `http://localhost:5173/**` and `https://rogueanalytics.io/**` in place.
      Without the new entry, local sign-ins land on the Site URL instead of `/auth/callback`.
- [ ] Don't change any identity-linking setting yet (see the last section).

---

## 1. Google (about 15 min)

At console.cloud.google.com:

- [ ] Top bar project picker → **New project** → name it `Rogue Analytics` → Create, then select it.
- [ ] **Google Auth Platform** (the old "OAuth consent screen") → **Get started**:
  - App name: `Rogue Analytics`; user support email: yours
  - Audience: **External**
  - Contact email: yours → agree → Create
- [ ] **Branding**:
  - App home page: `https://rogueanalytics.io`
  - Privacy policy and terms URLs: add them if you have them (you'll need them before publishing)
  - **Authorized domains**: add `rogueanalytics.io` and `jcsqxliaeaktiqjqucap.supabase.co`
  - A logo is optional. Uploading one sends the app through Google's brand
    verification, which takes a few days, so skip it for now.
- [ ] **Data Access** → Add scopes: `openid`, `.../auth/userinfo.email`,
      `.../auth/userinfo.profile`. All three are non-sensitive, so they need no
      Google review.
- [ ] **Clients** → **Create client**:
  - Application type: **Web application**, name: `Rogue Analytics web`
  - Authorized JavaScript origins: `https://rogueanalytics.io`, `http://localhost:5180`
  - **Authorized redirect URIs**: `https://jcsqxliaeaktiqjqucap.supabase.co/auth/v1/callback`
    (only this one: Google redirects to Supabase, not to rogueanalytics.io)
  - Create → copy the **Client ID** and **Client secret** now. Newer consoles
    show the secret only once.
- [ ] **Audience** → **Publish app** (set it to In production). While the app
      is in "Testing", only the test users you list can sign in.
- [ ] Supabase → **Authentication → Sign In / Providers → Google** → Enable →
      paste Client ID and Client Secret → leave "Skip nonce checks" off → Save.

Note: Google's account picker will say *"to continue to
jcsqxliaeaktiqjqucap.supabase.co"*. Making it say rogueanalytics.io requires
Supabase's custom-domain add-on, which is paid. You can do that later.

---

## 2. Apple (about 30 min; requires the paid Apple Developer Program, $99/year)

**Deferred for now.** The Apple button is hidden by `APPLE_SIGN_IN_ENABLED = false` in
`src/config.js`. When you're ready, do this section, then set it to `true` and deploy.
The Apple code and the profile handling in migration 0007 are already in place.

At developer.apple.com/account → **Certificates, Identifiers & Profiles**.
Note your **Team ID** first. It's the 10-character code at the top right of the
account page.

### 2a. App ID
- [ ] **Identifiers** → **+** → **App IDs** → Continue → type **App** → Continue
  - Description: `Rogue Analytics`
  - Bundle ID: Explicit, `io.rogueanalytics.app`
  - Capabilities: tick **Sign In with Apple** (leave it as "primary App ID")
  - Continue → Register

### 2b. Services ID (this is the web client ID)
- [ ] **Identifiers** → **+** → **Services IDs** → Continue
  - Description: `Rogue Analytics Web` (users see this on Apple's consent sheet)
  - Identifier: `io.rogueanalytics.web`. **This is your Client ID for Supabase.**
  - Continue → Register
- [ ] Open the new Services ID → tick **Sign In with Apple** → **Configure**:
  - Primary App ID: `io.rogueanalytics.app`
  - **Domains and Subdomains**: `jcsqxliaeaktiqjqucap.supabase.co`
  - **Return URLs**: `https://jcsqxliaeaktiqjqucap.supabase.co/auth/v1/callback`
  - Next → Done → Continue → **Save**

**About domain verification for rogueanalytics.io:** Apple redirects to the
Supabase domain, not to rogueanalytics.io, so web sign-in itself has nothing to
verify on rogueanalytics.io. The current portal doesn't ask for an
`apple-developer-domain-association.txt` file here. If it does ask, tell me
before uploading anything, because the file would have to be served from
supabase.co, which you can't do. You do need to register rogueanalytics.io for
the email relay; see 2e.

### 2c. Sign in with Apple key
- [ ] **Keys** → **+** → name `Rogue Analytics SIWA` → tick **Sign in with Apple** →
      **Configure** → Primary App ID `io.rogueanalytics.app` → Save → Continue → Register
- [ ] **Download** the `AuthKey_XXXXXXXXXX.p8`. Apple lets you download it
      **only once**. Keep it in your password manager or a folder outside this
      repo (`*.p8` is gitignored as a backstop).
- [ ] Note the **Key ID** (10 characters, also in the filename).

### 2d. Client secret JWT (expires every 6 months)
- [ ] From the repo root, with the `.p8` path pointing outside the repo:
      ```bash
      node scripts/apple-client-secret.mjs "C:/path/outside/repo/AuthKey_XXXXXXXXXX.p8" TEAMID1234 KEYID12345 io.rogueanalytics.web
      ```
      It prints the JWT and its expiry date. The script runs locally, uses only
      Node's built-in crypto and makes no network calls.
- [ ] **Put a calendar reminder about 5 months out.** When the JWT expires,
      Apple sign-in fails for everyone with `invalid_client`. Renewing means
      re-running the command and pasting the new value into Supabase. The `.p8`
      itself doesn't expire.

### 2e. Private email relay (only if you'll email users yourself)
Users who choose "Hide My Email" give you `xxxx@privaterelay.appleid.com`.
Apple only forwards mail to that address from senders you register:
- [ ] **Services** → **Sign in with Apple for Email Communication** → Configure →
      add `rogueanalytics.io` and the exact From address(es) you'll send from.
- [ ] The sending domain needs SPF (and preferably DKIM) passing. Your email
      provider gives you the DNS records.
- Mail Whop sends comes from Whop's domain, so it isn't covered by this registration.

### 2f. Supabase
- [ ] **Authentication → Sign In / Providers → Apple** → Enable
  - **Client IDs**: `io.rogueanalytics.web`
  - **Secret Key (for OAuth)**: the JWT from 2d
  - Save

---

## 3. Test (after the keys are in)

- [ ] `npm run dev` → `http://localhost:5180/sign-in?next=/players` → each button →
      you should land on `/players` signed in.
- [ ] Supabase **Table Editor → profiles**: Google row has your name + avatar; Apple
      row has your name (first sign-in) or "Member" if you hid both.
- [ ] Sign in with Apple a second time: the name must stay (Apple doesn't resend it).
- [ ] On rogueanalytics.io after deploying: same check once.

---

## Identity linking: decide before taking payments

**What Supabase does by default** (there's no dashboard switch for this): if
someone signs in with a new provider and that provider reports a **verified**
email that matches an existing user, Supabase attaches the new provider to the
existing user. It doesn't create a second account, so one Rogue Analytics
account (and its subscriptions) can be reached by Discord, Google or Apple.

**Where that falls short:**
- **Apple "Hide My Email"** produces a random relay address that never matches,
  so that person gets a second, empty account.
- **Different emails** per provider (e.g. Discord on a school address, Google on
  Gmail) also produce two accounts.
- **Unverified emails** (possible on Discord) aren't linked.

A paying subscriber who lands in the empty account will think the subscription
disappeared, and subscriptions are keyed to the user id.

**Options:**
1. **Keep the default only.** You have nothing to build, and mismatches become
   support requests that you fix by hand.
2. **Default + manual linking.** Turn on *Authentication → Sign In / Providers →
   "Allow manual linking"* and add "Connect Apple / Google / Discord" buttons on
   `/account` (`supabase.auth.linkIdentity()`). The user is already signed in, so
   they prove they own both accounts. This covers relay addresses and mismatched
   emails. It costs a bit of UI work, plus handling for "this provider is already
   on another account" errors.
3. **Turning automatic linking off isn't an option** in Supabase today.

The security side is fine either way: automatic linking only trusts verified
emails, and Apple, Google and Discord all verify them.

**Recommendation:** option 1 now, then option 2 before Whop checkout goes live.
Nothing is enabled yet. Tell me if you want option 2 and I'll build it.
