// Tier ids must match the CHECK constraint on public.subscriptions.tier.
// whopCheckoutUrl gets filled in during phase 2.
export const PLANS = [
  {
    id: 'player_projections',
    name: 'College Football Player Projections',
    price: 100,
    description: 'College football player projections for every slate, downloadable as .csv in the Unabated Simulator format. Includes every Game Book.',
    includes: ['player_projections', 'gamebooks'],
    whopCheckoutUrl: null,
  },
  {
    // Name is "Game Book" on the site; the tier id stays 'gamebooks' to match the database.
    id: 'gamebooks',
    name: 'College Football Game Book',
    price: 25,
    description: 'A breakdown of every college football game on the slate, read on the site.',
    includes: ['gamebooks'],
    whopCheckoutUrl: null,
  },
];

export const planById = (id) => PLANS.find((p) => p.id === id);
