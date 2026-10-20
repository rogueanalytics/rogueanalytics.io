// Copies Buildr subscriptions into public.subscriptions. Buildr has no webhooks,
// so this runs two ways:
//   * POST with a user's Supabase access token: syncs that user (the /account
//     page calls it on load and after checkout).
//   * POST with header x-sync-secret: BUILDR_SYNC_SECRET: syncs every linked user
//     plus anyone with a recent checkout (pg_cron calls it every few minutes).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';
import {
  admin,
  buildr,
  BuildrError,
  type BuildrMember,
  CORS,
  json,
  mapStatus,
  requestUser,
  tierForProduct,
} from '../_shared/buildr.ts';

// Unlinked users are retried this long after their last checkout.
const PENDING_DAYS = 3;

// The user's Buildr member id. Links on first sight from the emails of their own
// checkouts (the address they confirmed for that purchase, which Buildr locks
// the checkout to); after that the stored id is used and email plays no part.
async function memberIdFor(db: SupabaseClient, userId: string): Promise<string | null> {
  const { data: link } = await db.from('buildr_member_links').select('buildr_user_id').eq('user_id', userId).maybeSingle();
  if (link) return link.buildr_user_id;

  const { data: checkouts } = await db
    .from('buildr_checkouts')
    .select('member_email')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  for (const email of new Set((checkouts ?? []).map((c) => c.member_email))) {
    // Anyone can type any email at checkout. If another user has also used this
    // one, don't guess which of them owns it; link by hand instead.
    const { count } = await db
      .from('buildr_checkouts')
      .select('user_id', { count: 'exact', head: true })
      .eq('member_email', email)
      .neq('user_id', userId);
    if (count) {
      console.warn(`buildr-sync: ${count} other checkout(s) use the email on user ${userId}'s checkout; not auto-linking`);
      continue;
    }

    const { found, member } = await buildr<{ found: boolean; member: BuildrMember | null }>('/members/lookup', {
      method: 'POST',
      body: { email },
    });
    if (!found || !member) continue;

    const { error } = await db.from('buildr_member_links').insert({ user_id: userId, buildr_user_id: member.id });
    if (!error) return member.id;
    // 23505: that Buildr member already belongs to another user. Never move it here.
    if (error.code === '23505') console.warn(`buildr-sync: member ${member.id} is already linked to another user`);
    else throw error;
  }
  return null;
}

async function syncUser(db: SupabaseClient, userId: string) {
  const memberId = await memberIdFor(db, userId);
  if (!memberId) return { user_id: userId, linked: false };

  let subs: NonNullable<BuildrMember['active_subscriptions']> = [];
  try {
    subs = (await buildr<BuildrMember>(`/members/${encodeURIComponent(memberId)}`)).active_subscriptions ?? [];
  } catch (e) {
    // 404: no longer a member, so nothing is active.
    if (!(e instanceof BuildrError && e.status === 404)) throw e;
  }

  const rows = subs.flatMap((s) => {
    const tier = tierForProduct(s.product_id);
    if (!tier) return [];
    return [{
      user_id: userId,
      tier,
      status: mapStatus(s.status),
      current_period_end: s.current_period_end,
      buildr_subscription_id: s.id,
    }];
  });

  if (rows.length) {
    const { error } = await db.from('subscriptions').upsert(rows, { onConflict: 'buildr_subscription_id' });
    if (error) throw error;
  }

  // Anything Buildr no longer lists has ended.
  let ended = db
    .from('subscriptions')
    .update({ status: 'expired' })
    .eq('user_id', userId)
    .not('buildr_subscription_id', 'is', null)
    .neq('status', 'expired');
  if (rows.length) ended = ended.not('buildr_subscription_id', 'in', `(${rows.map((r) => `"${r.buildr_subscription_id}"`).join(',')})`);
  const { error: endError } = await ended;
  if (endError) throw endError;

  await db.from('buildr_member_links').update({ last_synced_at: new Date().toISOString() }).eq('user_id', userId);
  return { user_id: userId, linked: true, subscriptions: rows.map(({ tier, status }) => ({ tier, status })) };
}

async function usersToSync(db: SupabaseClient): Promise<string[]> {
  const since = new Date(Date.now() - PENDING_DAYS * 864e5).toISOString();
  const [links, pending] = await Promise.all([
    db.from('buildr_member_links').select('user_id'),
    db.from('buildr_checkouts').select('user_id').gte('created_at', since),
  ]);
  if (links.error) throw links.error;
  if (pending.error) throw pending.error;
  return [...new Set([...links.data, ...pending.data].map((r) => r.user_id))];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const db = admin();
    const secret = Deno.env.get('BUILDR_SYNC_SECRET');

    if (secret && req.headers.get('x-sync-secret') === secret) {
      const results = [];
      for (const userId of await usersToSync(db)) {
        try {
          results.push(await syncUser(db, userId));
        } catch (e) {
          console.error('buildr-sync', userId, e);
          results.push({ user_id: userId, error: String(e) });
        }
      }
      return json({ synced: results.length, results });
    }

    const user = await requestUser(req, db);
    if (!user) return json({ error: 'Unauthorized' }, 401);
    return json(await syncUser(db, user.id));
  } catch (e) {
    console.error('buildr-sync', e);
    return json({ error: "Couldn't refresh your plan." }, 500);
  }
});
