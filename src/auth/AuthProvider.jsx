import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { planById } from '../config/plans';

const AuthContext = createContext(null);

const LIVE_STATUSES = new Set(['active', 'trialing']);

// Only allow same-site relative paths as post-login destinations.
export function safeNext(next) {
  if (typeof next === 'string' && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/account';
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState(null);

  // 1. Track the auth session.
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setAuthLoading(false);
    });

    // Keep this callback synchronous: calling Supabase inside it can deadlock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user?.id ?? null;

  // 2. Load the profile and subscriptions whenever the signed-in user changes.
  const refreshAccount = useCallback(async () => {
    if (!userId) return;
    setAccountLoading(true);
    setAccountError(null);

    const [profileRes, subsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('subscriptions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ]);

    if (profileRes.error || subsRes.error) {
      setAccountError((profileRes.error || subsRes.error).message);
    }
    setProfile(profileRes.data ?? null);
    setSubscriptions(subsRes.data ?? []);
    setAccountLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setSubscriptions([]);
      return;
    }
    refreshAccount();
  }, [userId, refreshAccount]);

  const signInWithDiscord = useCallback(async (next = '/account') => {
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo, scopes: 'identify email' },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // Tiers the user can access right now, expanded through plan bundles
  // (Player Projections includes Gamebooks).
  const activeTiers = useMemo(() => {
    const now = Date.now();
    const tiers = new Set();
    for (const s of subscriptions) {
      const inPeriod = !s.current_period_end || new Date(s.current_period_end).getTime() > now;
      if (LIVE_STATUSES.has(s.status) && inPeriod) {
        const plan = planById(s.tier);
        (plan?.includes ?? [s.tier]).forEach((t) => tiers.add(t));
      }
    }
    return tiers;
  }, [subscriptions]);

  const value = {
    session,
    user: session?.user ?? null,
    authLoading,
    profile,
    subscriptions,
    activeTiers,
    hasTier: (tier) => activeTiers.has(tier),
    accountLoading,
    accountError,
    refreshAccount,
    signInWithDiscord,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>.');
  return ctx;
}
