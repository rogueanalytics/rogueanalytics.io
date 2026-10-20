import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from './supabase';

// Edge Functions in supabase/functions. Both send the signed-in user's token, and
// the functions read the user id from it, never from the browser.

// Creates a Buildr checkout tied to this account and returns its URL.
export async function startCheckout(tier, email) {
  const { data, error } = await supabase.functions.invoke('buildr-checkout', { body: { tier, email } });
  if (error) {
    const body = await error.context?.json?.().catch(() => null);
    throw new Error(body?.error ?? "Couldn't start checkout. Try again in a minute.");
  }
  return data.url;
}

// Pulls this user's Buildr subscriptions into public.subscriptions.
export async function syncBilling() {
  const { error } = await supabase.functions.invoke('buildr-sync', { body: {} });
  if (error) throw error;
}

// For /account: syncs on load, then reloads the account. Back from checkout
// (justPaid), retries for about a minute until a live plan shows up, since Buildr
// can take a few seconds to record the payment. Returns true while that wait runs.
export function useBillingSync(justPaid) {
  const { user, refreshAccount } = useAuth();
  const [waiting, setWaiting] = useState(justPaid);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let stopped = false;
    (async () => {
      for (let attempt = 0; attempt < (justPaid ? 8 : 1) && !stopped; attempt++) {
        if (attempt) await new Promise((r) => setTimeout(r, 8000));
        try {
          await syncBilling();
        } catch (e) {
          console.warn('Billing sync failed', e);
        }
        if (stopped) return;
        await refreshAccount();
        const { data } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .in('status', ['active', 'trialing'])
          .limit(1);
        if (data?.length) break;
      }
      if (!stopped) setWaiting(false);
    })();
    return () => {
      stopped = true;
    };
  }, [userId, justPaid, refreshAccount]);

  return waiting;
}
