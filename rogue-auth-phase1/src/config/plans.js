// Tier ids must match the CHECK constraint on public.subscriptions.tier.
// whopCheckoutUrl gets filled in during phase 2.
export const PLANS = [
  {
    id: 'player_projections',
    name: 'Player Projections',
    price: 100,
    description: 'Weekly NCAAF player projections formatted for the Unabated Simulator. Includes Gamebooks.',
    includes: ['player_projections', 'gamebooks'],
    whopCheckoutUrl: null,
  },
  {
    id: 'gamebooks',
    name: 'Gamebooks',
    price: 25,
    description: 'Game-by-game NCAAF breakdowns for every matchup on the slate.',
    includes: ['gamebooks'],
    whopCheckoutUrl: null,
  },
];

export const planById = (id) => PLANS.find((p) => p.id === id);
