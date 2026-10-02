// Team rankings, computed the same way as the CFB Command Center so the two match.

// Competition ranking (1, 2, 2, 4) of every row on one stat, across all rows given.
// higherIsBetter false ranks the lowest value #1; true or null ranks the highest #1
// (null = no better direction, so the rank means "most", not "best").
// A row with no value gets no rank (null). Returns { [team]: rank }.
export function rankTeams(rows, key, higherIsBetter) {
  const lowFirst = higherIsBetter === false
  const vals = []
  for (const r of rows) if (r[key] != null) vals.push(Number(r[key]))
  const ranks = {}
  for (const r of rows) {
    if (r[key] == null) {
      ranks[r.team] = null
      continue
    }
    const v = Number(r[key])
    let ahead = 0
    for (const x of vals) if (lowFirst ? x < v : x > v) ahead++
    ranks[r.team] = ahead + 1
  }
  return ranks
}

// Sort rows by rank. dir 1 = #1 at the top, -1 = last at the top. Unranked rows always
// sit at the bottom; ties and unranked rows are ordered by team name.
export function sortByRank(rows, ranks, dir) {
  return [...rows].sort((a, b) => {
    const x = ranks[a.team]
    const y = ranks[b.team]
    if (x == null && y == null) return a.team.localeCompare(b.team)
    if (x == null) return 1
    if (y == null) return -1
    return (x - y) * dir || a.team.localeCompare(b.team)
  })
}

// Top quarter 'good', bottom quarter 'bad', otherwise ''.
export function rankTone(rank, teams) {
  if (rank == null || !teams) return ''
  const q = rank / teams
  if (q <= 0.25) return 'good'
  if (q >= 0.75) return 'bad'
  return ''
}

const num = (v, digits) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

// Print a value by its column format (team_stats_meta.columns[].format). Null -> '—'.
export function formatStat(v, format, perGame) {
  if (v == null || v === '' || Number.isNaN(Number(v))) return '—'
  switch (format) {
    case 'count':
      return num(v, perGame ? 1 : 0)
    case 'int':
      return num(v, 0)
    case 'pct':
      return `${num(Number(v) * 100, 1)}%`
    case 'dec1':
      return num(v, 1)
    case 'dec3':
      return num(v, 3)
    case 'clock': {
      const s = Math.round(Number(v))
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
    }
    default: // dec2, and any format a later schema adds
      return num(v, 2)
  }
}
