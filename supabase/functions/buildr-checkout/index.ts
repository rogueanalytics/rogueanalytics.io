// POST { tier, email } with the user's Supabase access token.
// Creates a Buildr checkout for that plan, records it under the user's id, and
// returns { url } for the browser to open. Signed-in users only.
import { admin, buildr, BuildrError, CORS, json, requestUser, TIERS, type Tier } from '../_shared/buildr.ts';

const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://rogueanalytics.io';

interface Checkout {
  id: string;
  url: string;
  expires_at: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const db = admin();
    const user = await requestUser(req, db);
    if (!user) return json({ error: 'Sign in to subscribe.' }, 401);

    const { tier, email } = await req.json().catch(() => ({}));
    if (!(tier in TIERS)) return json({ error: 'Unknown plan.' }, 400);
    const memberEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(memberEmail)) return json({ error: 'Enter a valid email.' }, 400);

    const checkout = await buildr<Checkout>('/checkouts', {
      method: 'POST',
      body: {
        pricing_tier_id: TIERS[tier as Tier].pricingTierId,
        member_email: memberEmail,
        success_url: `${SITE_URL}/account?checkout=success`,
        metadata: { supabase_user_id: user.id, tier },
      },
    });

    const { error } = await db.from('buildr_checkouts').insert({
      id: checkout.id,
      user_id: user.id,
      tier,
      member_email: memberEmail,
      expires_at: checkout.expires_at,
    });
    if (error) throw error;

    return json({ url: checkout.url });
  } catch (e) {
    console.error('buildr-checkout', e);
    // 409: Buildr refuses a second purchase while a subscription or payment is open.
    if (e instanceof BuildrError && e.status === 409) return json({ error: e.message }, 409);
    return json({ error: "Couldn't start checkout. Try again in a minute." }, 500);
  }
});
