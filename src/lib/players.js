// Player board and profiles. The CFB Command Center publishes player_board_meta,
// player_board, player_game_line, player_zone and player_week (subscriber-only); the site
// only reads them. Columns, labels, groups and formats come from player_board_meta, and
// ranks are computed here, the same way as the Command Center's Players tab.
import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { fetchAll } from './data.js'
import { formatStat } from './rank.js'

export const POSITIONS = ['QB', 'RB', 'WR', 'TE']
export const POS_PLURAL = { QB: 'Quarterbacks', RB: 'Running backs', WR: 'Wide receivers', TE: 'Tight ends' }
export const VOLUME_WORD = { att: 'attempts', opps: 'carries + targets', tgt: 'targets' }

// ---------------------------------------------------------------------
// Fetching. Results live in a module-level cache for the session, so switching back to
// a position or reopening a profile is instant. Keys carry the user id: every table here
// is signed-in only, and player_week depends on the subscription.
// ---------------------------------------------------------------------

const cache = new Map() // key -> { data } | { error: true }
const inflight = new Map() // key -> Promise

function useCached(key, load) {
  const [, bump] = useState(0)
  const entry = key ? cache.get(key) : null

  useEffect(() => {
    if (!key || cache.has(key)) return
    let alive = true
    if (!inflight.has(key)) {
      inflight.set(
        key,
        load()
          .then(
            (data) => cache.set(key, { data }),
            (error) => {
              console.error(`Failed to load ${key}`, error)
              cache.set(key, { error: true })
            },
          )
          .finally(() => inflight.delete(key)),
      )
    }
    inflight.get(key).then(() => alive && bump((n) => n + 1))
    return () => {
      alive = false
    }
    // `load` is rebuilt every render; the key names everything it depends on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, entry])

  const retry = () => {
    cache.delete(key)
    bump((n) => n + 1)
  }

  if (!key) return { status: 'idle' }
  if (!entry) return { status: 'loading' }
  if (entry.error) return { status: 'error', retry }
  return { status: 'ready', data: entry.data, retry }
}

async function rowsOf(query) {
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

// Newest season's meta rows, keyed by table name.
// status: 'loading' | 'error' | 'empty' | 'ready'
export function usePlayerMeta(userId) {
  const q = useCached(userId ? `meta:${userId}` : null, () => rowsOf(supabase.from('player_board_meta').select('*')))
  if (q.status !== 'ready') return q
  if (q.data.length === 0) return { status: 'empty' }
  const season = Math.max(...q.data.map((m) => m.season))
  const byTable = Object.fromEntries(q.data.filter((m) => m.season === season).map((m) => [m.table_name, m]))
  if (!byTable.player_board) return { status: 'empty' }
  return { status: 'ready', season, byTable }
}

// One position's board rows. PostgREST caps a response at 1000 rows, so page through.
export function useBoardRows(userId, season, pos) {
  return useCached(userId && season != null && pos ? `board:${userId}:${season}:${pos}` : null, () =>
    fetchAll(() =>
      supabase
        .from('player_board')
        .select('*')
        .eq('season', season)
        .eq('position_group', pos)
        .order('player_id')
        .order('team'),
    ),
  )
}

// Every row's position and volume (three narrow columns), for the tab badges: the
// qualifier count at any threshold without loading every position's full rows.
export function useVolumes(userId, season) {
  return useCached(userId && season != null ? `volumes:${userId}:${season}` : null, () =>
    fetchAll(() =>
      supabase
        .from('player_board')
        .select('player_id, team, position_group, volume')
        .eq('season', season)
        .order('player_id')
        .order('team'),
    ),
  )
}

// Qualifier count per position at `share` of each position's volume leader.
export function qualifierCounts(volumeRows, share) {
  const out = {}
  for (const p of POSITIONS) {
    const vols = volumeRows.filter((r) => r.position_group === p && r.volume != null).map((r) => Number(r.volume))
    if (vols.length === 0) continue
    const line = share * Math.max(...vols)
    out[p] = vols.filter((v) => v >= line).length
  }
  return out
}

// A linked profile whose player isn't on the position being shown: find his board rows.
export function usePlayerBoardRows(userId, season, playerId) {
  return useCached(userId && season != null && playerId ? `prow:${userId}:${season}:${playerId}` : null, () =>
    rowsOf(supabase.from('player_board').select('*').eq('season', season).eq('player_id', playerId)),
  )
}

export function useGameLines(userId, season, playerId) {
  return useCached(userId && season != null && playerId ? `games:${userId}:${season}:${playerId}` : null, () =>
    rowsOf(supabase.from('player_game_line').select('*').eq('season', season).eq('player_id', playerId).order('week')),
  )
}

export function useZones(userId, season, playerId) {
  return useCached(userId && season != null && playerId ? `zones:${userId}:${season}:${playerId}` : null, () =>
    rowsOf(supabase.from('player_zone').select('*').eq('season', season).eq('player_id', playerId)),
  )
}

// Subscriber-only. Pass entitled = false and the table is never queried.
export function usePlayerWeek(userId, season, playerId, entitled) {
  return useCached(
    entitled && userId && season != null && playerId ? `week:${userId}:${season}:${playerId}` : null,
    () => rowsOf(supabase.from('player_week').select('*').eq('season', season).eq('player_id', playerId)),
  )
}

// ---------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------

export const rowKey = (r) => `${r.player_id}:${r.team}`

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v'])

// "Keelon Russell" -> "KR", "C.J. Carr" -> "CC", "Marvin Harrison Jr." -> "MH".
export function initials(name) {
  const words = (name ?? '')
    .split(/\s+/)
    .filter((w) => w && !SUFFIXES.has(w.toLowerCase().replace(/[.,]/g, '')))
  if (words.length === 0) return '?'
  const first = words[0].match(/[A-Za-z]/)?.[0] ?? ''
  const last = words.length > 1 ? (words[words.length - 1].match(/[A-Za-z]/)?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

const CLASS = { 1: 'FR', 2: 'SO', 3: 'JR', 4: 'SR', 5: 'GR' }
const feetInches = (h) => (h ? `${Math.floor(h / 12)}'${h % 12}"` : null)

// The depth-chart slot when it says more than the position ("WR-X", "WR-SL"), else null.
export function slotOf(r) {
  return r.role_unit === 'offense' && r.role_slot && r.role_slot !== r.position_group ? r.role_slot : null
}

// "WR-X · FR · 6'3" · 207"; `slot: false` leaves the slot out.
export function bioLine(r, { slot = true } = {}) {
  return [slot ? slotOf(r) : null, CLASS[r.class_year], feetInches(r.height), r.weight || null]
    .filter(Boolean)
    .join(' · ')
}

export function ordinal(n) {
  const v = Math.round(n)
  const s = ['th', 'st', 'nd', 'rd']
  const m = v % 100
  return `${v}${s[(m - 20) % 10] || s[m] || s[0]}`
}

// A value by its meta format. Null -> '—', never 0.
export function fmt(v, format) {
  if (v == null || v === '') return '—'
  if (['int', 'pct', 'dec1', 'dec2'].includes(format)) return formatStat(v, format)
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v)
}

export const whole = (v) => (v == null ? '—' : String(Math.round(Number(v))))
export const dec1 = (v) => (v == null ? '—' : formatStat(v, 'dec1'))

export function signed(v, digits = 2) {
  if (v == null) return '—'
  const n = Number(v)
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(digits)}`
}

export const stars = (n) => (n ? '★'.repeat(n) : '')

// "2026-01-08" -> "Jan 8, 2026", read as a calendar date (no time-zone shift).
export function longDate(d) {
  if (!d) return null
  const t = new Date(`${String(d).slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(t.getTime())) return String(d)
  return t.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' })
}

// Percentile (0-100) -> cell tint: positive above the middle, negative below, nothing
// within 5 points of 50. Layered as a background image so it sits over the zebra colour.
export function tint(p) {
  if (p == null) return undefined
  const d = (Number(p) - 50) / 50
  if (Math.abs(d) < 0.1) return undefined
  const c = `color-mix(in srgb, var(${d > 0 ? '--pl-good' : '--pl-bad'}) ${Math.round(Math.abs(d) * 28)}%, transparent)`
  return { backgroundImage: `linear-gradient(${c}, ${c})` }
}

// Sub-skill bar colour: good at 66 and up, middle from 33, poor below.
export const skillTone = (v) => (v >= 66 ? 'good' : v >= 33 ? 'mid' : 'bad')

// ---------------------------------------------------------------------
// Ranking (the Command Center's rules)
// ---------------------------------------------------------------------

// Competition rank (1, 2, 2, 4) of each row on `key`, across the rows given. higherIsBetter
// false ranks the lowest #1; true or null ranks the highest #1. Null values get no rank.
export function rankRows(rows, key, higherIsBetter) {
  const sign = higherIsBetter === false ? -1 : 1
  const vals = rows
    .map((r) => r[key])
    .filter((v) => v != null)
    .map((v) => Number(v) * sign)
    .sort((a, b) => b - a)
  const ranks = new Map()
  for (const r of rows) {
    if (r[key] == null) {
      ranks.set(r, null)
      continue
    }
    const v = Number(r[key]) * sign
    // Rows strictly ahead = index of the first value <= v in the descending list.
    let lo = 0
    let hi = vals.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (vals[mid] > v) lo = mid + 1
      else hi = mid
    }
    ranks.set(r, lo + 1)
  }
  return ranks
}

// dir 1 = #1 first, -1 = last first. Unranked rows always sit last, ordered by volume.
export function sortRanked(rows, ranks, dir) {
  const vol = (r) => Number(r.volume ?? -1)
  return [...rows].sort((a, b) => {
    const x = ranks.get(a)
    const y = ranks.get(b)
    if (x == null && y == null) return vol(b) - vol(a)
    if (x == null) return 1
    if (y == null) return -1
    return (x - y) * dir || vol(b) - vol(a)
  })
}

// Top quarter 'good', bottom quarter 'bad', otherwise ''.
export function rankTone(rank, n) {
  if (rank == null || !n) return ''
  const q = rank / n
  if (q <= 0.25) return 'good'
  if (q >= 0.75) return 'bad'
  return ''
}

// Best and weakest sub-skill, when he has at least two.
export function bestWorst(row, skills) {
  const have = skills.filter((s) => row[s.column] != null).map((s) => ({ ...s, v: Number(row[s.column]) }))
  if (have.length < 2) return null
  const sorted = [...have].sort((a, b) => b.v - a.v)
  return { best: sorted[0], worst: sorted[sorted.length - 1] }
}

// Sub-skills the site names itself (decided 2026-10-05), by meta skill key.
const SKILL_LABELS = { value: 'Efficiency' }

// The position's column definitions from the player_board meta row.
export function positionSpec(boardMeta, pos) {
  const p = boardMeta?.columns?.positions?.[pos]
  if (!p) return null
  return {
    volumeKey: p.volume_key,
    columns: Array.isArray(p.columns) ? p.columns : [],
    skills: (Array.isArray(p.skills) ? p.skills : []).map((s) =>
      SKILL_LABELS[s.key] ? { ...s, label: SKILL_LABELS[s.key] } : s,
    ),
  }
}

// The site names the composite itself (decided 2026-10-05) rather than using meta's label.
export const COMPOSITE_LABEL = 'Composite Score'

// { column, label, held }; status 'held' hides the composite.
export function compositeSpec(boardMeta) {
  const c = boardMeta?.extra?.composite ?? {}
  return { column: c.column || 'composite', label: COMPOSITE_LABEL, held: c.status === 'held' }
}

export { DEFAULT_QUALIFY, rescore } from './rescore.js'

// ---------------------------------------------------------------------
// Header help: what each column is and how it's worked out.
// ---------------------------------------------------------------------

const STAT_HELP = {
  games: ['Games', 'Games in which he recorded a stat.'],
  att: ['Pass attempts', 'Passes thrown.'],
  cmp_pct: ['Completion percentage', 'Completions ÷ pass attempts.'],
  pass_yds: ['Passing yards', 'Total passing yards.'],
  pass_td: ['Passing touchdowns', 'Touchdown passes thrown.'],
  ints: ['Interceptions', 'Interceptions thrown.'],
  ypa: ['Yards per attempt', 'Passing yards ÷ pass attempts.'],
  td_rate: ['Touchdown rate', 'Touchdown passes ÷ pass attempts.'],
  int_rate: ['Interception rate', 'Interceptions ÷ pass attempts.'],
  adot: ['Average depth of target', 'Average air yards per throw: how far past the line of scrimmage the ball is thrown.'],
  cay_att: ['Completed air yards per attempt', 'Air yards on completed passes ÷ pass attempts. Yards after the catch are not counted.'],
  deep_pct: ['Deep throw rate', 'Share of pass attempts thrown 20 or more yards in the air.'],
  deep_cmp_pct: ['Deep completion percentage', 'Completion percentage on throws of 20 or more air yards.'],
  rush_att: ['Rushing attempts', 'Carries.'],
  rush_ypg: ['Rushing yards per game', "Rushing yards ÷ games. Box-score rushing, so a quarterback's sacks count against it."],
  rush_epa: ['EPA per rush', "CollegeFootballData's average expected points added on his rushing plays, season to date."],
  rush_td: ['Rushing touchdowns', 'Rushing touchdowns scored.'],
  usage: ['Usage', "CollegeFootballData's usage rate: the share of his team's plays he was involved in, season to date."],
  rush_yds: ['Rushing yards', 'Total rushing yards.'],
  ypc: ['Yards per carry', 'Rushing yards ÷ carries.'],
  carry_share: ['Carry share', "His carries ÷ his team's carries."],
  touches_pg: ['Touches per game', '(Carries + receptions) ÷ games.'],
  tgt: ['Targets', 'Passes thrown his way.'],
  tgt_share: ['Target share', "His targets ÷ his team's targets."],
  rec: ['Receptions', 'Catches.'],
  rec_yds: ['Receiving yards', 'Total receiving yards.'],
  rec_td: ['Receiving touchdowns', 'Receiving touchdowns scored.'],
  yac_rec: ['Yards after catch per reception', 'Yards gained after the catch ÷ receptions.'],
  scrim_ypg: ['Scrimmage yards per game', '(Rushing + receiving yards) ÷ games.'],
  td_pg: ['Touchdowns per game', '(Rushing + receiving touchdowns) ÷ games.'],
  air_share: ['Air yards share', "Air yards on his targets ÷ his team's air yards."],
  wopr: ['Weighted opportunity rating', '1.5 × target share + 0.7 × air yards share: how often he is targeted, weighted with how far downfield.'],
  catch_pct: ['Catch rate', 'Receptions ÷ targets.'],
  yds_tgt: ['Yards per target', 'Receiving yards ÷ targets.'],
  racr: ['Receiver air conversion ratio', 'Receiving yards ÷ air yards on his targets. Above 1.00 means he turns more yards than the throws travelled.'],
  rec_ypg: ['Receiving yards per game', 'Receiving yards ÷ games.'],
}

function statName(c, pos) {
  if (c.key === 'epa') return pos === 'QB' ? 'EPA per attempt' : 'EPA per target'
  return STAT_HELP[c.key]?.[0] ?? c.label
}

export function statHelp(c, pos) {
  let how = STAT_HELP[c.key]?.[1] ?? ''
  if (c.key === 'epa')
    how =
      pos === 'QB'
        ? 'Average expected points added per pass attempt, from CollegeFootballData play-by-play.'
        : 'Average expected points added per target, from CollegeFootballData play-by-play.'
  if (c.key === 'adot' && pos !== 'QB') how = 'Average air yards per target: how far downfield he is thrown to.'
  const rank =
    c.higher_is_better == null
      ? 'Shown for context, not ranked.'
      : `Shaded by percentile among qualifiers${c.higher_is_better === false ? '; lower is better' : ''}.`
  return [`${statName(c, pos)}${c.label !== statName(c, pos) ? ` (${c.label})` : ''}`, how, rank].filter(Boolean).join('\n')
}

export function skillHelp(s, spec, pos) {
  const byKey = Object.fromEntries(spec.columns.map((c) => [c.key, c]))
  const names = (s.stats ?? []).map((k) => (byKey[k] ? statName(byKey[k], pos).toLowerCase() : k))
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]
  return [
    s.label,
    `The average of his percentiles in ${list}, among qualifiers at the position (0-100).`,
    `Counts for ${Math.round(Number(s.weight) * 100)}% of the ${COMPOSITE_LABEL.toLowerCase()}.`,
  ].join('\n')
}

export function compositeHelp(spec) {
  const parts = spec.skills.map((s) => `${s.label} ${Math.round(Number(s.weight) * 100)}%`).join(', ')
  return [
    COMPOSITE_LABEL,
    `A weighted average of the sub-skills: ${parts}.`,
    "Each sub-skill is a percentile among the position's qualifiers, so 0-100. It ranks this season's production; it is not a projection.",
  ].join('\n')
}
