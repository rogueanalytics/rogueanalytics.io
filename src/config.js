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

// TODO: replace with the exact column names and order from Unabated's upload template.
export const PROJECTION_COLUMNS = [
  { key: 'player', label: 'Player' },
  { key: 'pos', label: 'Pos' },
  { key: 'team', label: 'Team' },
  { key: 'opp', label: 'Opp' },
  { key: 'kickoff', label: 'Kickoff' },
  { key: 'pass_yds', label: 'Pass Yds', num: true },
  { key: 'pass_td', label: 'Pass TD', num: true },
  { key: 'rush_att', label: 'Rush Att', num: true },
  { key: 'rush_yds', label: 'Rush Yds', num: true },
  { key: 'rec', label: 'Rec', num: true },
  { key: 'rec_yds', label: 'Rec Yds', num: true },
  { key: 'rec_td', label: 'Rec TD', num: true },
]
