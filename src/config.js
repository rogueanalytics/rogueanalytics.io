// Site-wide settings. Edit copy in the page files; edit facts here.

export const MEMBERS_ENABLED = import.meta.env.VITE_MEMBERS_ENABLED === 'true'
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || ''
export const FORMSPREE_ID = import.meta.env.VITE_FORMSPREE_ID || ''

export const DROP_SCHEDULE = [
  { label: 'Weekday slates', time: '3:00 PM ET', when: 'day of games' },
  { label: 'Saturday slate', time: '4:00 PM ET', when: 'Friday before' },
]

// What each plan includes. Game Book is the game-level analysis; Player Projections adds the
// player-level work on top, and includes every Game Book.
export const GAME_BOOK_FEATURES = [
  'Market consensus spread, total & moneyline',
  'Rogue projected spread & game total',
  'Projected team scores & win probabilities',
  'Offensive & defensive team statistics',
  'Passing, rushing & receiving analysis',
  'Passing-location breakdowns',
  'Opponent-adjusted matchup metrics',
  'Key matchup insights & statistical takeaways',
]
export const PLAYER_FEATURES = ['Individual player projection tables', 'Player projections CSV export']

export const PACKAGES = {
  projections: {
    name: 'College Football Player Projections',
    price: 100,
    audience: 'Built for bettors, traders and market makers who work from their own numbers.',
    includes: [
      'Everything in Game Book, for every game on the slate',
      ...PLAYER_FEATURES,
      'CSV columns match the Unabated Simulator upload format',
      'Weekday slates drop at 3:00 PM ET. The Saturday slate drops Friday at 4:00 PM ET',
    ],
  },
  gamebooks: {
    name: 'College Football Game Book',
    audience: 'Game-level analysis for every game on the slate, read on the site. No player projections or data download.',
    includes: GAME_BOOK_FEATURES,
  },
  basketball: {
    name: 'College Basketball Player Projections',
    price: 200,
    per: '/mo at launch',
    audience: 'Player projections for college basketball, built for quantitative analysis. Full contents listed at launch.',
    includes: ['Individual player projection tables', 'Player projections CSV export'],
  },
}

// The three products, lowest price first. The homepage cards, the pricing table and the
// NCAAF page all read from here. status: 'live' | 'soon'.
export const PRODUCTS = [
  {
    id: 'game_book',
    name: 'College Football Game Book',
    sport: 'College football',
    status: 'soon',
    priceLabel: 'Pricing at launch',
    summary: 'Game-level analysis for every game on the slate, read on the site.',
    includes: GAME_BOOK_FEATURES,
    excludes: ['No player projections or data download'],
    cta: { label: 'Preview the team metrics', to: '/college-football/teams' },
  },
  {
    id: 'ncaaf_projections',
    name: 'College Football Player Projections',
    sport: 'College football',
    status: 'live',
    price: 100,
    summary: 'Everything in Game Book, plus player-level projections for your own research and modeling.',
    includes: [
      'Everything in Game Book',
      ...PLAYER_FEATURES,
      'Unabated Simulator column format',
    ],
    excludes: [],
    cta: { label: 'Explore Football Projections', to: '/sports/ncaaf' },
  },
  {
    id: 'ncaab_projections',
    name: 'College Basketball Player Projections',
    sport: 'College basketball',
    status: 'soon',
    price: 200,
    priceNote: '/month at launch',
    summary: 'Player projections for college basketball, built for quantitative analysis.',
    includes: ['Player projections with .csv download'],
    excludes: ['Full contents listed at launch'],
    cta: { label: 'Get launch details', to: '/college-basketball' },
  },
]

// Pricing comparison, in groups. `values` has one entry per product in PRODUCTS order
// (true = included) and applies to every row in the group.
export const COMPARE_GROUPS = [
  { label: 'Game analysis', rows: GAME_BOOK_FEATURES, values: [true, true, true] },
  { label: 'Player projections', rows: PLAYER_FEATURES, values: [false, true, true] },
]

// Keys match the columns of the public.projections_cfb_* tables (thursday, friday, saturday).
export const PROJECTION_COLUMNS = [
  { key: 'name', label: 'Player' },
  { key: 'position', label: 'Pos' },
  { key: 'team', label: 'Team' },
  { key: 'passing_attempts', label: 'Pass Att', num: true },
  { key: 'passing_completions', label: 'Pass Cmp', num: true },
  { key: 'passing_yards', label: 'Pass Yds', num: true },
  { key: 'passing_touchdowns', label: 'Pass TD', num: true },
  { key: 'interceptions_thrown', label: 'INT', num: true },
  { key: 'rushing_attempts', label: 'Rush Att', num: true },
  { key: 'rushing_yards', label: 'Rush Yds', num: true },
  { key: 'receptions', label: 'Rec', num: true },
  { key: 'receiving_yards', label: 'Rec Yds', num: true },
  { key: 'anytime_touchdown_scorer', label: 'Anytime TD', num: true },
]
