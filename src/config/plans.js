// Tier ids must match the CHECK constraint on public.subscriptions.tier.
// Plans are sold on Buildr (rogueanalytics.buildr.bet, payments by Whop). The site
// never links to buildrCheckoutUrl directly: /account opens a checkout made by the
// buildr-checkout Edge Function, which ties the purchase to the signed-in user.
// The Buildr ids for each plan live in supabase/functions/_shared/buildr.ts.
export const PLANS = [
  {
    id: 'player_projections',
    name: 'College Football Player Projections',
    price: 100,
    description: 'College football player projections for every slate, downloadable as .csv in the Unabated Simulator format. Includes every Game Book.',
    includes: ['player_projections', 'gamebooks'],
    buildrCheckoutUrl: 'https://rogueanalytics.buildr.bet/checkout/53d778a1-e6da-42fe-96a6-9f1d2912b577',
  },
  {
    // Name is "Game Book" on the site; the tier id stays 'gamebooks' to match the database.
    id: 'gamebooks',
    name: 'College Football Game Book',
    price: 25,
    description: 'A breakdown of every college football game on the slate, read on the site.',
    includes: ['gamebooks'],
    buildrCheckoutUrl: 'https://rogueanalytics.buildr.bet/checkout/10d453cc-4517-416c-bd1c-5698176028d3',
  },
];

// Buildr's page where members update payment details or cancel.
export const MANAGE_SUBSCRIPTION_URL = 'https://rogueanalytics.buildr.bet/app/billing';

export const planById = (id) => PLANS.find((p) => p.id === id);
