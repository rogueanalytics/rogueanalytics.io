// Qualifier line. The Command Center publishes percentiles, sub-skills and the composite
// at its own line (meta extra.qualify.share_of_leader, 40%). The site re-places them at
// its own line in the browser, with the Command Center's method (player_board.rank):
// - qualified: volume >= share x the position leader's volume
// - percentile: pandas rank(pct=True, method='average') among qualifiers with a value,
//   x 100, flipped where lower is better, rounded to 0.1; none with fewer than 2 values
// - sub-skill: mean of its stats' percentiles that he has, rounded to 0.1
// - composite: weighted mean of the sub-skills he has, weights renormalised, rounded to 0.1
// Last season's columns stay as published.

export const DEFAULT_QUALIFY = 0.1

// numpy's round(x, 1): half to even.
function round1(x) {
  const y = x * 10
  const f = Math.floor(y)
  const r = y - f === 0.5 ? (f % 2 === 0 ? f : f + 1) : Math.round(y)
  return r / 10
}

// First index in sorted `a` whose value is >= v (or > v when `after`).
function bound(a, v, after = false) {
  let lo = 0
  let hi = a.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (a[mid] < v || (after && a[mid] === v)) lo = mid + 1
    else hi = mid
  }
  return lo
}

// The position's rows, copied, with qualified / pct_* / skill_* / composite re-placed at
// `share` of the volume leader.
export function rescore(rows, spec, compColumn, share) {
  if (!spec || rows.length === 0) return rows
  const lead = Math.max(...rows.map((r) => Number(r.volume ?? 0)))
  const out = rows.map((r) => ({ ...r, qualified: r.volume != null && Number(r.volume) >= share * lead }))
  const quals = out.filter((r) => r.qualified)
  const num = (v) => (v == null || v === '' || Number.isNaN(Number(v)) ? null : Number(v))

  const pctOf = {} // stat key -> pct column
  for (const c of spec.columns) {
    if (!c.pct_key) continue
    pctOf[c.key] = c.pct_key
    for (const r of out) r[c.pct_key] = null
    if (c.higher_is_better == null) continue
    const sign = c.higher_is_better === false ? -1 : 1
    const vals = quals.map((r) => num(r[c.key])).filter((v) => v != null).map((v) => v * sign).sort((a, b) => a - b)
    const n = vals.length
    if (n < 2) continue
    for (const r of quals) {
      const v = num(r[c.key])
      if (v == null) continue
      const x = v * sign
      const below = bound(vals, x)
      const ties = bound(vals, x, true) - below
      r[c.pct_key] = round1(((below + (ties + 1) / 2) / n) * 100)
    }
  }

  for (const r of out) {
    let wsum = 0
    let acc = 0
    for (const s of spec.skills) {
      let v = null
      if (r.qualified) {
        const ps = (s.stats ?? []).map((k) => r[pctOf[k] ?? `pct_${k}`]).filter((p) => p != null)
        if (ps.length) v = round1(ps.reduce((a, b) => a + b, 0) / ps.length)
      }
      r[s.column] = v
      if (v != null) {
        acc += v * Number(s.weight)
        wsum += Number(s.weight)
      }
    }
    r[compColumn] = r.qualified && wsum > 0 ? round1(acc / wsum) : null
  }
  return out
}
