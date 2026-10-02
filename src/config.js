// Site-wide settings. Edit copy in the page files; edit facts here.

export const MEMBERS_ENABLED = import.meta.env.VITE_MEMBERS_ENABLED === 'true'
export const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL || ''
export const FORMSPREE_ID = import.meta.env.VITE_FORMSPREE_ID || ''

export const DROP_SCHEDULE = [
  { label: 'Weekday slates', time: '3:00 PM ET', when: 'day of games' },
  { label: 'Saturday slate', time: '4:00 PM ET', when: 'Friday before' },
]

export const PACKAGES = {
  projections: {
    name: 'Player Projections',
    price: 100,
    audience: 'Built for non-casual bettors and market makers.',
    includes: [
      'Player projections for every upcoming slate',
      'Weekday slates drop at 3:00 PM ET. The Saturday slate drops Friday at 4:00 PM ET',
      'Formatted to upload directly to the Unabated Simulator',
      'Searchable, filterable table, or download as .csv',
      'Access to every Gamebook',
    ],
  },
  gamebooks: {
    name: 'Gamebooks',
    price: 25,
    audience:
      'A viewing guide going into every game, for metrics-driven fans and bettors who want more data.',
    includes: [
      'Metric breakdowns for both teams',
      'Advanced data analysis',
      'Depth charts and injury reports',
      'Roster and starter analysis',
      'A Gamebook for every game on the slate',
    ],
  },
}

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
