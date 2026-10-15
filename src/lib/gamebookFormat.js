// Game Book display formatting. Pure functions only (no React, no Vite globals) so the web
// page and its printed PDF, which are the same DOM, format every number one way, and
// `npm test` can run these under plain Node. Nothing here computes a metric: the
// Command Center publishes every value, rank and difference already validated.

const MINUS = '−'

const num = (v, digits) =>
  Math.abs(Number(v)).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

const isNum = (v) => v != null && v !== '' && Number.isFinite(Number(v))

// A value by its payload format: int | dec1 | dec2 | dec3 | pct (0-1 share). Missing -> '—'.
export function fmt(v, format) {
  if (!isNum(v)) return '—'
  const n = Number(v)
  const sign = n < 0 ? MINUS : ''
  switch (format) {
    case 'int':
      return sign + num(n, 0)
    case 'pct':
      return sign + num(n * 100, 1) + '%'
    case 'dec1':
      return sign + num(n, 1)
    case 'dec3':
      return sign + num(n, 3)
    default:
      return sign + num(n, 2)
  }
}

// Always carries a sign: +2.4, −10.7, 0.0.
export function signed(v, digits = 1) {
  if (!isNum(v)) return '—'
  const n = Number(v)
  const r = Number(n.toFixed(digits))
  if (r === 0) return num(0, digits)
  return (r > 0 ? '+' : MINUS) + num(r, digits)
}

// American odds: +195, −408.
export function american(v) {
  if (!isNum(v)) return '—'
  const n = Math.round(Number(v))
  return n > 0 ? `+${n}` : `${MINUS}${Math.abs(n)}`
}

// A betting number (total, spread magnitude): one decimal, two for a quarter point (53.25).
export function lineNum(v) {
  if (!isNum(v)) return '—'
  const n = Number(v)
  const digits = Math.abs(Math.round(n * 100) % 50) === 25 ? 2 : 1
  return (n < 0 ? MINUS : '') + num(n, digits)
}

// A 0-1 probability as a percentage: 0.803 -> 80.3%.
export const prob = (v) => (isNum(v) ? `${num(Number(v) * 100, 1)}%` : '—')

// A probability difference in percentage points: 0.303 -> +30.3 pts.
export const probPoints = (v) => (isNum(v) ? `${signed(Number(v) * 100, 1)} pts` : '—')

export function ordinal(n) {
  if (!isNum(n)) return '—'
  const k = Math.round(Number(n))
  const t = k % 100
  const suf = t >= 11 && t <= 13 ? 'th' : { 1: 'st', 2: 'nd', 3: 'rd' }[k % 10] || 'th'
  return `${k}${suf}`
}

// "8th of 138" for a ranked cell; '' when the stat carries no rank (a style stat).
export const rankText = (cell) => (cell && cell.rank ? `${ordinal(cell.rank)} of ${cell.of}` : '')

// The home team's line (away minus home) as a reader says it: "Indiana −1.5", "Pick'em".
export function lineText(homeLine, home, away) {
  if (!isNum(homeLine)) return '—'
  const n = Number(homeLine)
  if (Math.abs(n) < 0.05) return "Pick'em"
  return `${n < 0 ? home : away} ${MINUS}${lineNum(Math.abs(n))}`
}

// Rogue minus market on the home line, in words: negative favours home.
export function spreadGapText(diff, home, away) {
  if (!isNum(diff)) return '—'
  const n = Number(diff)
  if (Math.abs(n) < 0.05) return 'Matches the market'
  return `${num(n, 1)} pts more favorable to ${n < 0 ? home : away}`
}

export function totalGapText(diff) {
  if (!isNum(diff)) return '—'
  const n = Number(diff)
  if (Math.abs(n) < 0.05) return 'Matches the market'
  return `${num(n, 1)} pts ${n > 0 ? 'higher' : 'lower'} than the market`
}

// Offense-vs-defense advantage (offense percentile minus defense percentile, -1..1).
// Returns a text label so the page never relies on colour alone.
export function advantage(adv, { notable = 0.25, strong = 0.45 } = {}) {
  if (!isNum(adv)) return { tone: 'none', label: 'Not scored', short: '—' }
  const n = Number(adv)
  const size = Math.abs(n) >= strong ? 'Strong' : Math.abs(n) >= notable ? 'Clear' : null
  if (!size) return { tone: 'even', label: 'Even matchup', short: 'Even' }
  return n > 0
    ? { tone: 'off', label: `${size} offense advantage`, short: `${size === 'Strong' ? '▲▲' : '▲'} Offense` }
    : { tone: 'def', label: `${size} defense advantage`, short: `${size === 'Strong' ? '▼▼' : '▼'} Defense` }
}

// Which of two ranked cells is better: 'a' | 'b' | null (tie, or either unranked).
export function better(a, b) {
  if (!a || !b || a.pct == null || b.pct == null || a.pct === b.pct) return null
  return a.pct > b.pct ? 'a' : 'b'
}

// Percentile 0-1 as bar width (2% floor so a last place still draws).
export const barWidth = (cell) => (cell && isNum(cell.pct) ? `${Math.max(2, Math.round(cell.pct * 100))}%` : '0%')

const ET = 'America/New_York'

// Kickoff in Eastern time. CFBD stamps an unannounced time as midnight Eastern.
export function kickoffText(iso) {
  if (!iso) return 'Kickoff to be announced'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Kickoff to be announced'
  const day = d.toLocaleDateString('en-US', { timeZone: ET, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const hm = d.toLocaleTimeString('en-US', { timeZone: ET, hour: 'numeric', minute: '2-digit', hourCycle: 'h23' })
  if (hm === '0:00' || hm === '00:00') return `${day} · time TBA`
  const t = d.toLocaleTimeString('en-US', { timeZone: ET, hour: 'numeric', minute: '2-digit' })
  return `${day} · ${t} ET`
}

// A timestamp in Eastern time, short: "Oct 10, 2026, 8:00 AM ET".
export function stamp(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.toLocaleString('en-US', { timeZone: ET, month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} ET`
}

export function recordText(team) {
  const r = team && team.record
  return r && isNum(r.wins) && isNum(r.losses) ? `${r.wins}-${r.losses}` : null
}

// File name the browser offers when the page is saved as PDF (document.title).
export function pdfTitle(book) {
  const g = book.game
  const clean = (s) => String(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `Rogue-Game-Book-${g.season}-Week-${g.week}-${clean(g.away.school)}-at-${clean(g.home.school)}`
}

// Zone keys from the payload ('short left') as labels.
export const zoneLabel = (z) => z.replace(/\b\w/g, (c) => c.toUpperCase())

// Has kickoff passed (relative to `now`)?
export function kickedOff(iso, now = Date.now()) {
  const t = Date.parse(iso)
  return Number.isFinite(t) && t <= now
}
