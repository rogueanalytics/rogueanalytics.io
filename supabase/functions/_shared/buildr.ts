// Shared by buildr-checkout and buildr-sync. Runs only inside Edge Functions:
// it holds the service-role client and the Buildr management key.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

// Buildr ids for our two plans (public; they also appear in the checkout links
// in src/config/plans.js). Tier ids match public.subscriptions.tier.
export const TIERS = {
  player_projections: {
    pricingTierId: '53d778a1-e6da-42fe-96a6-9f1d2912b577',
    productId: 'cmv626omg0001l20683kwrm8h',
  },
  gamebooks: {
    pricingTierId: '10d453cc-4517-416c-bd1c-5698176028d3',
    productId: 'cmv62fuyg0001jr06hj2vzyd0',
  },
} as const;

export type Tier = keyof typeof TIERS;

export const tierForProduct = (productId: string): Tier | null =>
  (Object.keys(TIERS) as Tier[]).find((t) => TIERS[t].productId === productId) ?? null;

// Buildr subscription status -> public.subscriptions.status.
const STATUS: Record<string, string> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  unpaid: 'past_due',
  canceled: 'canceled',
};
export const mapStatus = (s: string) => STATUS[s] ?? 'expired';

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function env(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export const admin = (): SupabaseClient =>
  createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

// The signed-in user behind the request's Supabase access token, or null.
export async function requestUser(req: Request, db: SupabaseClient) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  return error ? null : data.user;
}

export class BuildrError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Calls the Buildr management API (https://buildr.bet/docs/reference).
export async function buildr<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`https://buildr.bet/api/v1${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${env('BUILDR_API_KEY')}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new BuildrError(res.status, data?.error?.message ?? `Buildr ${res.status} on ${path}`);
  return data as T;
}

export interface BuildrSubscription {
  id: string;
  product_id: string;
  product_name: string;
  status: string;
  payment_collection_paused: boolean;
  current_period_end: string | null;
}

export interface BuildrMember {
  id: string;
  email: string | null;
  status: 'active' | 'inactive' | 'banned';
  has_active_subscription: boolean;
  active_subscriptions?: BuildrSubscription[];
}
