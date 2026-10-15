import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { IconClock } from '../components/Icons.jsx'
import Seg from '../components/Seg.jsx'
import { useTeamStatsMeta, useTeamStatsRows } from '../lib/data.js'
import { formatStat, rankTeams, rankTone } from '../lib/rank.js'
import { ZONES, normName, teamLogo, teamPath, teamSlug, useEspnTeam, usePassZones } from '../lib/teams.js'
import '../styles/team.css'

// One team's profile: ESPN for the logo, record and schedule; the team_stats tables
// (CFB Command Center) for everything measured. Sections without a data source yet
// (power rating, players, depth chart, drives) are left out — see docs/team-profile-data.md.

const TABLES = {
  basic: 'team_stats_basic',
  advanced: 'team_stats_advanced',
  adjusted: 'team_stats_adjusted',
  composite: 'team_stats_composite',
}
const FACTORS = ['efficiency', 'field_position', 'finishing', 'explosiveness', 'turnovers']

const TABS = [
  ['overview', 'Overview'],
  ['schedule', 'Schedule'],
  ['offense', 'Offense'],
  ['defense', 'Defense'],
  ['more', 'Turnovers & special teams'],
]

// The fingerprint's stats, as [table, key]. Labels, formats and directions come from the meta.
const FINGERPRINT = {
  raw: [
    ['Offense', [
      ['advanced', 'off_epa'], ['advanced', 'off_success_rate'], ['advanced', 'off_explosiveness'],
      ['advanced', 'off_rush_epa'], ['advanced', 'off_pass_epa'], ['advanced', 'off_line_yards'],
      ['advanced', 'off_points_per_opportunity'], ['basic', 'third_down_pct'], ['advanced', 'off_havoc'],
    ]],
    ['Defense', [
      ['advanced', 'def_epa'], ['advanced', 'def_success_rate'], ['advanced', 'def_explosiveness'],
      ['advanced', 'def_rush_epa'], ['advanced', 'def_pass_epa'], ['advanced', 'def_stuff_rate'],
      ['advanced', 'def_points_per_opportunity'], ['basic', 'third_down_pct_opponent'], ['advanced', 'def_havoc'],
    ]],
  ],
  adjusted: [
    ['Offense', [
      ['adjusted', 'off_epa'], ['adjusted', 'off_success'], ['adjusted', 'off_explosiveness'],
      ['adjusted', 'off_rushing_epa'], ['adjusted', 'off_passing_epa'], ['adjusted', 'off_line_yards'],
      ['adjusted', 'off_standard_down_success'], ['adjusted', 'off_passing_down_success'],
    ]],
    ['Defense', [
      ['adjusted', 'def_epa'], ['adjusted', 'def_success'], ['adjusted', 'def_explosiveness'],
      ['adjusted', 'def_rushing_epa'], ['adjusted', 'def_passing_epa'], ['adjusted', 'def_line_yards'],
      ['adjusted', 'def_standard_down_success'], ['adjusted', 'def_passing_down_success'],
    ]],
  ],
}

// ---------------------------------------------------------------------
// Stat lookups
// ---------------------------------------------------------------------

// Everything needed to show one stat for one team, ranked across every FBS team.
// Counting stats are shown and ranked per game, as on the rankings page.
function makeStats(tables) {
  const cache = {}
  return (table, key) => {
    const id = `${table}:${key}`
    if (id in cache) return cache[id]
    const t = tables[table]
    const col = t?.columns.find((c) => c.key === key)
    if (!col) return (cache[id] = null)
    const k = col.per_game_key ?? col.key
    const values = t.rows.map((r) => r[k]).filter((v) => v != null).map(Number)
    cache[id] = {
      key,
      label: col.label,
      format: col.format,
      perGame: !!col.per_game_key,
      hib: col.higher_is_better,
      ranks: rankTeams(t.rows, k, col.higher_is_better),
      valueOf: (team) => t.byTeam[team]?.[k] ?? null,
      min: Math.min(...values),
      max: Math.max(...values),
      values,
      teams: t.rows.length,
    }
    return cache[id]
  }
}

const show = (s, v) => formatStat(v, s.format, s.perGame)
const toneColor = (tone) => (tone === 'good' ? 'var(--green)' : tone === 'bad' ? 'var(--tp-bad)' : 'var(--soft)')

// 0..1 along a strip, 1 = best (or most, for stats with no better direction).
const along = (s, v) => {
  if (v == null || s.max === s.min) return 0.5
  const p = (Number(v) - s.min) / (s.max - s.min)
  return s.hib === false ? 1 - p : p
}

// Every FBS team as a tick, this team as a dot.
function Strip({ s, team }) {
  const v = s.valueOf(team)
  const rank = s.ranks[team]
  const tone = s.hib == null ? '' : rankTone(rank, s.teams)
  // One path for all the ticks (a page can have ~70 strips), stretched to the width;
  // the dot is HTML so it stays round.
  const x = (p) => 2 + p * 96
  const ticks = s.values.map((val) => `M${x(along(s, val)).toFixed(2)} 6V16`).join('')
  return (
    <span className="tp-strip" aria-hidden="true">
      <svg viewBox="0 0 100 22" preserveAspectRatio="none">
        <path d="M2 11H98" className="tp-strip-base" vectorEffect="non-scaling-stroke" />
        <path d={ticks} className="tp-strip-tick" vectorEffect="non-scaling-stroke" />
      </svg>
      {v != null && <i className="tp-strip-dot" style={{ left: `${x(along(s, v))}%`, background: toneColor(tone) }} />}
    </span>
  )
}

function StatRow({ s, team }) {
  const rank = s.ranks[team]
  const tone = s.hib == null ? '' : rankTone(rank, s.teams)
  return (
    <div className="tp-fp">
      <span className="tp-fp-name">
        {s.label}
        {s.perGame && <span className="dim"> /g</span>}
      </span>
      <Strip s={s} team={team} />
      <span className="tp-fp-val">{show(s, s.valueOf(team))}</span>
      <span className={`tp-fp-rank ${tone}`} title={s.hib == null ? 'Rank = most, not best' : undefined}>
        {rank ? `#${rank}` : '—'}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------

function Notice({ title, text, action }) {
  return (
    <div className="empty">
      <span className="dim">
        <IconClock size={36} />
      </span>
      <h2 className="disp h5">{title}</h2>
      {text && <p className="soft measure">{text}</p>}
      {action}
    </div>
  )
}

function Loading() {
  return (
    <div className="panel rk-loading" aria-busy="true">
      <span className="sr-only">Loading team</span>
      {Array.from({ length: 8 }, (_, i) => (
        <span key={i} className="skel" style={{ width: `${50 + ((i * 7) % 5) * 10}%` }} />
      ))}
    </div>
  )
}

function Panel({ title, sub, tools, children, className = '' }) {
  return (
    <section className={`panel tp-panel ${className}`}>
      <div className="tp-ph">
        <div>
          <h2 className="tp-h">{title}</h2>
          {sub && <p className="tp-sub">{sub}</p>}
        </div>
        {tools}
      </div>
      {children}
    </section>
  )
}

const fmtDate = (iso, opts) => new Date(iso).toLocaleDateString('en-US', { timeZone: 'America/New_York', ...opts })
const fmtKick = (g) =>
  g.timeValid
    ? `${new Date(g.date).toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })} ET`
    : 'Time TBA'
const siteWord = (g) => (g.site === 'home' ? 'vs' : g.site === 'away' ? 'at' : 'vs')

function Logo({ src, size = 24, className = '' }) {
  if (!src) return <span className={`tp-logo tp-logo--none ${className}`} style={{ width: size, height: size }} />
  return <img className={`tp-logo ${className}`} src={src} alt="" width={size} height={size} loading="lazy" />
}

// An opponent's name, linked to their profile when they're an FBS team in the stats.
function OppName({ g, fbs }) {
  const label = (
    <>
      {g.opp.rank && <span className="tp-ap">{g.opp.rank}</span>}
      {g.opp.name}
    </>
  )
  return fbs ? (
    <Link className="tp-link" to={teamPath(fbs.team)}>
      {label}
    </Link>
  ) : (
    <span>{label}</span>
  )
}

// ---------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------

function Hero({ row, espn, stat, season, nextGame, nextFbs }) {
  const team = espn.status === 'ready' ? espn.team : null
  const accent = team?.color ?? '#2b2b29'
  const t = row.team
  const tile = (label, s, extra) => {
    if (!s) return null
    const rank = s.ranks[t]
    return (
      <div className="tp-tile">
        <span className="tool-label">{label}</span>
        <span className={`tp-tile-v ${s.hib == null ? '' : rankTone(rank, s.teams)}`}>{rank ? `#${rank}` : '—'}</span>
        <span className="tp-tile-s">
          {show(s, s.valueOf(t))} {extra ?? s.label.toLowerCase()}
        </span>
      </div>
    )
  }

  return (
    <section className="tp-hero panel" style={{ '--tp-team': accent }}>
      <div className="tp-hero-in">
        <div className="tp-ident">
          {team?.logo ? (
            <img className="tp-mark" src={team.logo} alt={`${t} logo`} width="96" height="96" />
          ) : (
            <span className="tp-mark tp-mark--none" aria-hidden="true">
              {t.slice(0, 1)}
            </span>
          )}
          <div className="stack stack--sm">
            <span className="eb">
              {row.conference ?? 'FBS'}, {season}
            </span>
            <h1 className="disp tp-name">{team?.name ?? t}</h1>
            <div className="chips">
              {team?.record && <span className="chip">{team.record} overall</span>}
              {team?.rank && <span className="chip">AP #{team.rank}</span>}
              {team?.standing && <span className="chip">{team.standing}</span>}
              {!team && <span className="chip">{row.games} games played</span>}
            </div>
          </div>
        </div>

        <div className="tp-tiles">
          {tile('Offense', stat('advanced', 'off_epa'), 'EPA per play')}
          {tile('Defense', stat('advanced', 'def_epa'), 'EPA per play allowed')}
          {team?.pointsFor != null ? (
            <div className="tp-tile">
              <span className="tool-label">Scoring</span>
              <span className="tp-tile-v">{team.pointsFor.toFixed(1)}</span>
              <span className="tp-tile-s">points per game · allows {team.pointsAgainst?.toFixed(1)}</span>
            </div>
          ) : (
            tile('Success rate', stat('advanced', 'off_success_rate'), 'of plays succeed')
          )}
          {tile('Yards per play', stat('basic', 'yards_per_play'), 'yards per play')}
          {tile('Turnover margin', stat('basic', 'turnover_margin'), 'per game')}
          {tile('Havoc', stat('advanced', 'def_havoc'), 'of snaps on defense')}

          {nextGame && (
            <div className="tp-tile tp-next">
              <div className="stack" style={{ gap: 6 }}>
                <span className="tool-label">
                  Next · {fmtDate(nextGame.date, { weekday: 'short', month: 'short', day: 'numeric' })} · {fmtKick(nextGame)}
                </span>
                <span className="tp-next-who">
                  <Logo src={nextGame.opp.logo} size={28} />
                  <span>
                    {siteWord(nextGame)} <OppName g={nextGame} fbs={nextFbs} />
                  </span>
                </span>
                <span className="tp-tile-s">{[nextGame.venue, nextGame.tv].filter(Boolean).join(' · ')}</span>
              </div>
              {nextFbs && <Matchup us={t} them={nextFbs.team} stat={stat} />}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// Offense vs their defense, and the other way round, on EPA per play.
function Matchup({ us, them, stat }) {
  const o = stat('advanced', 'off_epa')
  const d = stat('advanced', 'def_epa')
  if (!o || !d) return null
  const line = (a, b) => (
    <span className="tp-mu-line">
      <b className={rankTone(a, o.teams)}>#{a ?? '—'}</b>
      <span className="dim">vs</span>
      <b className={rankTone(b, o.teams)}>#{b ?? '—'}</b>
    </span>
  )
  return (
    <div className="tp-mu">
      <span className="tool-label">EPA per play, ranked</span>
      <span>
        <span className="tp-mu-k">Our O vs their D</span> {line(o.ranks[us], d.ranks[them])}
      </span>
      <span>
        <span className="tp-mu-k">Our D vs their O</span> {line(d.ranks[us], o.ranks[them])}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------
// Season strip
// ---------------------------------------------------------------------

function SeasonStrip({ games, fbsOf, stat, team }) {
  const lastPlayed = [...games].reverse().find((g) => g.completed)
  const [pick, setPick] = useState(null)
  const sel = games.find((g) => g.id === pick) ?? lastPlayed ?? games[0]

  // Regular-season byes, as gaps in ESPN's week numbers.
  const cells = []
  games.forEach((g, i) => {
    const prev = games[i - 1]
    if (prev && !g.postseason && !prev.postseason && g.week && prev.week)
      for (let w = prev.week + 1; w < g.week; w++) cells.push({ bye: true, week: w })
    cells.push(g)
  })
  const maxMargin = Math.max(14, ...games.filter((g) => g.completed).map((g) => Math.abs(g.us - g.them)))
  const barH = (m) => Math.max(3, (Math.abs(m) / maxMargin) * 34)

  return (
    <Panel
      title="The season, game by game"
      sub="Bar = final margin, above the line for a win. Dashed cards are still to play. Pick a game for the details."
    >
      <div className="tp-season-scroll">
        <div className="tp-season" style={{ '--n': cells.length }}>
          {cells.map((g) => {
            if (g.bye)
              return (
                <div key={`bye${g.week}`} className="tp-gm tp-gm--bye">
                  <span className="tp-gm-wk">WK {g.week}</span>
                  <span className="tp-gm-opp">Bye</span>
                </div>
              )
            const m = g.completed ? g.us - g.them : null
            return (
              <button
                key={g.id}
                type="button"
                className={`tp-gm${g.completed ? '' : ' tp-gm--fut'}${g.id === sel?.id ? ' on' : ''}`}
                aria-pressed={g.id === sel?.id}
                onClick={() => setPick(g.id)}
              >
                <span className="tp-gm-wk">{g.postseason ? 'BOWL' : `WK ${g.week ?? '—'}`}</span>
                <Logo src={g.opp.logo} size={26} className="tp-gm-logo" />
                <span className="tp-gm-opp">{g.opp.abbr || g.opp.name}</span>
                <span className="tp-gm-site">{g.site}</span>
                <span className="tp-gm-bar-box">
                  {g.completed && (
                    <span
                      className={`tp-gm-bar ${m >= 0 ? 'w' : 'l'}`}
                      style={{ height: barH(m), [m >= 0 ? 'bottom' : 'top']: '50%' }}
                    />
                  )}
                </span>
                {g.completed ? (
                  <span className={`tp-gm-res ${g.won ? 'good' : 'bad'}`}>
                    {g.won ? 'W' : 'L'} {g.us}–{g.them}
                  </span>
                ) : (
                  <span className="tp-gm-res">{fmtDate(g.date, { month: 'short', day: 'numeric' })}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      {sel && <GameCard g={sel} fbs={fbsOf(sel)} stat={stat} team={team} />}
    </Panel>
  )
}

function GameCard({ g, fbs, stat, team }) {
  const head = `${g.postseason ? g.note ?? 'Postseason' : `Week ${g.week}`} · ${fmtDate(g.date, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })}`
  return (
    <div className="tp-gamecard">
      <div className="stack" style={{ gap: 6 }}>
        <span className="tool-label">{head}</span>
        <span className="tp-gc-who">
          <Logo src={g.opp.logo} size={32} />
          <span>
            {siteWord(g)} <OppName g={g} fbs={fbs} />
          </span>
        </span>
      </div>
      <div className="tp-kv">
        <span className="tool-label">{g.completed ? 'Final' : 'Kickoff'}</span>
        {g.completed ? (
          <span className={`tp-gc-score ${g.won ? 'good' : 'bad'}`}>
            {g.won ? 'W' : 'L'} {g.us}–{g.them}
          </span>
        ) : (
          <span className="tp-kv-v">{fmtKick(g)}</span>
        )}
      </div>
      <div className="tp-kv">
        <span className="tool-label">Where</span>
        <span className="tp-kv-v">{g.venue ?? '—'}</span>
        {g.city && <span className="tp-kv-s">{g.city}</span>}
      </div>
      <div className="tp-kv">
        <span className="tool-label">TV</span>
        <span className="tp-kv-v">{g.tv ?? '—'}</span>
      </div>
      {fbs ? <Matchup us={team} them={fbs.team} stat={stat} /> : <div className="tp-kv-s">Not an FBS opponent; no stats.</div>}
    </div>
  )
}

function ScheduleTable({ games, fbsOf }) {
  return (
    <div className="panel">
      <div className="ptable-wrap">
        <table className="ptable tp-sched">
          <thead>
            <tr>
              <th>Wk</th>
              <th>Date</th>
              <th>Opponent</th>
              <th>Site</th>
              <th>Venue</th>
              <th>TV</th>
              <th className="num">Result</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => (
              <tr key={g.id}>
                <td className="mono dim">{g.postseason ? 'Bowl' : g.week}</td>
                <td className="mono">
                  {fmtDate(g.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                  {!g.completed && <span className="dim"> · {fmtKick(g)}</span>}
                </td>
                <td>
                  <span className="tp-sched-opp">
                    <Logo src={g.opp.logo} size={22} />
                    <OppName g={g} fbs={fbsOf(g)} />
                  </span>
                </td>
                <td className="mono dim">{g.site}</td>
                <td className="soft">{g.venue ?? '—'}</td>
                <td className="mono dim">{g.tv ?? '—'}</td>
                <td className={`num mono ${g.completed ? (g.won ? 'good' : 'bad') : 'dim'}`}>
                  {g.completed ? `${g.won ? 'W' : 'L'} ${g.us}–${g.them}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------
// Fingerprint, scatter, situations, notes
// ---------------------------------------------------------------------

// The five-factor composite: a ranking of how this team has played so far, not a projection.
// Shown only once team_stats_composite is published; a team under three games has no scores.
function Composite({ tables, stat, team }) {
  const t = tables.composite
  if (!t) return null
  const total = stat('composite', 'composite')
  const weights = t.columns.find((c) => c.key === 'composite')?.weights ?? {}
  const scored = total?.valueOf(team) != null
  return (
    <Panel
      title="Team composite"
      sub="A ranking, not a projection: how this team has played so far this season, not a prediction of future games. Each factor is a 0-100 score, the average of its stats' percentiles among FBS teams."
    >
      {!scored ? (
        <p className="tp-sub">Not scored yet: teams need three games before the composite ranks them.</p>
      ) : (
        <>
          <StatRow s={total} team={team} />
          <div className="tp-fp-group">Factors (weight)</div>
          {FACTORS.map((k) => {
            const s = stat('composite', k)
            return (
              s && (
                <StatRow
                  key={k}
                  s={{ ...s, label: weights[k] != null ? `${s.label} (${Math.round(weights[k] * 100)}%)` : s.label }}
                  team={team}
                />
              )
            )
          })}
        </>
      )}
    </Panel>
  )
}

function Fingerprint({ stat, team }) {
  const [mode, setMode] = useState('raw')
  return (
    <Panel
      title="Team fingerprint"
      sub="Each tick is an FBS team; the dot is this one. Right is better, whatever the stat."
      tools={
        <Seg
          label="Numbers"
          options={[
            ['raw', 'Raw'],
            ['adjusted', 'Opponent-adjusted'],
          ]}
          value={mode}
          onChange={setMode}
          small
        />
      }
    >
      {FINGERPRINT[mode].map(([group, list]) => (
        <div key={group}>
          <div className="tp-fp-group">{group}</div>
          {list.map(([table, key]) => {
            const s = stat(table, key)
            return s && <StatRow key={key} s={s} team={team} />
          })}
        </div>
      ))}
    </Panel>
  )
}

const SCATTER = {
  epa: { x: 'off_epa', y: 'def_epa', label: 'EPA per play' },
  success: { x: 'off_success_rate', y: 'def_success_rate', label: 'success rate' },
}

function Scatter({ stat, rows, row, highlight }) {
  const [mode, setMode] = useState('epa')
  const navigate = useNavigate()
  const xs = stat('advanced', SCATTER[mode].x)
  const ys = stat('advanced', SCATTER[mode].y)
  if (!xs || !ys) return null

  const W = 520
  const H = 400
  const L = 40
  const B = 36
  const pad = 14
  const pts = rows.filter((r) => xs.valueOf(r.team) != null && ys.valueOf(r.team) != null)
  const X = (v) => L + ((v - xs.min) / (xs.max - xs.min || 1)) * (W - L - pad)
  // Better defense (lower) at the top.
  const Y = (v) => pad + ((v - ys.min) / (ys.max - ys.min || 1)) * (H - B - pad)
  const median = (arr) => {
    const a = [...arr].sort((p, q) => p - q)
    return a[Math.floor(a.length / 2)]
  }
  const mx = X(median(xs.values))
  const my = Y(median(ys.values))
  const dot = (r) => [X(Number(xs.valueOf(r.team))), Y(Number(ys.valueOf(r.team)))]
  const go = (r) => navigate(teamPath(r.team))
  const label = (r) => `${r.team}: offense ${show(xs, xs.valueOf(r.team))} (#${xs.ranks[r.team]}), defense ${show(ys, ys.valueOf(r.team))} (#${ys.ranks[r.team]})`
  // Conference teams are drawn after (on top of) everyone else.
  const inConf = (r) => !!r.conference && r.conference === row.conference
  const others = pts
    .filter((r) => r.team !== row.team && !highlight.includes(r.team))
    .sort((a, b) => inConf(a) - inConf(b))
  const named = pts.filter((r) => r.team !== row.team && highlight.includes(r.team))
  // A team's logo centred on its point, or a dot if ESPN has none.
  const mark = (r, size, className) => {
    const [cx, cy] = dot(r)
    const href = teamLogo(r.team, size > 30 ? 96 : 48)
    return href ? (
      <image href={href} x={cx - size / 2} y={cy - size / 2} width={size} height={size} className={className} />
    ) : (
      <circle cx={cx} cy={cy} r={size / 5} className={className} />
    )
  }

  return (
    <Panel
      title="Where they live"
      sub={`Offense against defense, ${SCATTER[mode].label}, every FBS team. ${row.conference ?? 'Conference'} teams a shade brighter. Click a logo to open that team.`}
      tools={
        <Seg
          label="Measure"
          options={[
            ['epa', 'EPA'],
            ['success', 'Success'],
          ]}
          value={mode}
          onChange={setMode}
          small
        />
      }
    >
      <svg className="tp-scatter" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Scatter of FBS offense and defense, ${label(row)}`}>
        <rect x={mx} y={pad} width={W - pad - mx} height={my - pad} className="tp-sc-best" />
        <line x1={mx} x2={mx} y1={pad} y2={H - B} className="tp-sc-axis" />
        <line x1={L} x2={W - pad} y1={my} y2={my} className="tp-sc-axis" />
        <text x={W - pad - 4} y={pad + 14} textAnchor="end" className="tp-sc-q">GOOD ON BOTH SIDES</text>
        <text x={L + 4} y={pad + 14} className="tp-sc-q">DEFENSE CARRIES</text>
        <text x={W - pad - 4} y={H - B - 8} textAnchor="end" className="tp-sc-q">OFFENSE CARRIES</text>
        <text x={L + 4} y={H - B - 8} className="tp-sc-q">STRUGGLING</text>
        {others.map((r) => (
          <g key={r.team} className={`tp-sc-team${inConf(r) ? ' conf' : ''}`} onClick={() => go(r)}>
            <title>{label(r)}</title>
            {mark(r, inConf(r) ? 22 : 20)}
          </g>
        ))}
        {named.map((r) => {
          const [cx, cy] = dot(r)
          return (
            <g key={r.team} className="tp-sc-team named" onClick={() => go(r)}>
              <title>{label(r)}</title>
              {mark(r, 26)}
              <text x={cx + 16} y={cy + 4}>
                {r.team}
              </text>
            </g>
          )
        })}
        {(() => {
          const [cx, cy] = dot(row)
          const left = cx > W / 2
          return (
            <g className="tp-sc-me">
              <title>{label(row)}</title>
              <circle cx={cx} cy={cy} r="24" className="tp-sc-halo" />
              {mark(row, 40)}
              <text x={left ? cx - 26 : cx + 26} y={cy - 16} textAnchor={left ? 'end' : 'start'}>
                {row.team.toUpperCase()}
              </text>
            </g>
          )
        })()}
        <text x={(W + L) / 2} y={H - 8} textAnchor="middle" className="tp-sc-ax">
          offense {SCATTER[mode].label}, better →
        </text>
        <text transform={`translate(14 ${(H - B) / 2}) rotate(-90)`} textAnchor="middle" className="tp-sc-ax">
          defense, better ↑
        </text>
      </svg>
    </Panel>
  )
}

// Standard/passing downs and run/pass, from the advanced table.
const SITUATIONS = [
  ['Standard downs', 'sd'],
  ['Passing downs', 'pd'],
  ['Runs', 'rush'],
  ['Passes', 'pass'],
]

function Situations({ stat, team }) {
  const [side, setSide] = useState('off')
  const cols = [
    ['Share', 'rate'],
    ['Success rate', 'success_rate'],
    ['EPA per play', 'epa'],
    ['Explosiveness', 'explosiveness'],
  ]
  return (
    <Panel
      title="Down and play type"
      sub="How often each comes up, and how it goes. Colour places it among FBS teams."
      tools={
        <Seg
          label="Side"
          options={[
            ['off', 'Offense'],
            ['def', 'Defense'],
          ]}
          value={side}
          onChange={setSide}
          small
        />
      }
    >
      <div className="tp-sit">
        <span />
        {cols.map(([h]) => (
          <span key={h} className="tp-sit-h">
            {h}
          </span>
        ))}
        {SITUATIONS.map(([name, k]) => (
          <SituationRow key={k} name={name} cells={cols.map(([, c]) => stat('advanced', `${side}_${k}_${c}`))} team={team} />
        ))}
      </div>
    </Panel>
  )
}

function SituationRow({ name, cells, team }) {
  return (
    <>
      <span className="tp-sit-rl">{name}</span>
      {cells.map((s, i) => {
        if (!s) return <span key={i} className="tp-sit-c">—</span>
        const rank = s.ranks[team]
        const tone = s.hib == null ? '' : rankTone(rank, s.teams)
        return (
          <span key={s.key} className={`tp-sit-c ${tone}`}>
            {show(s, s.valueOf(team))}
            <small>{rank ? `#${rank}${s.hib == null ? ' most' : ''}` : ''}</small>
          </span>
        )
      })}
    </>
  )
}

// Plain-language notes read straight off the ranks.
function Notes({ stat, team, next, nextFbs }) {
  const ranked = FINGERPRINT.raw
    .flatMap(([group, list]) => list.map(([t, k]) => ({ group, s: stat(t, k) })))
    .filter(({ s }) => s && s.hib != null && s.ranks[team] != null)
    .sort((a, b) => a.s.ranks[team] - b.s.ranks[team])
  if (ranked.length === 0) return null
  const n = ranked[0].s.teams
  const best = ranked.slice(0, 2).filter(({ s }) => s.ranks[team] <= n / 3)
  const worst = ranked.slice(-2).reverse().filter(({ s }) => s.ranks[team] >= n / 2)
  // "Defense" + "Rush EPA/play" -> "defense rush EPA/play" (acronyms keep their case).
  const say = ({ group, s }) =>
    `${group.toLowerCase()} ${s.label.replace(/\b[A-Z][a-z]+/g, (w) => w.toLowerCase())}`

  const notes = [
    ...best.map((x) => ({
      kind: 'good',
      icon: '+',
      title: `Strength: ${say(x)}`,
      text: `${show(x.s, x.s.valueOf(team))}, #${x.s.ranks[team]} of ${n} in FBS.`,
    })),
    ...worst.map((x) => ({
      kind: 'bad',
      icon: '−',
      title: `Weak spot: ${say(x)}`,
      text: `${show(x.s, x.s.valueOf(team))}, #${x.s.ranks[team]} of ${n} in FBS.`,
    })),
  ]
  if (next && nextFbs) {
    const o = stat('advanced', 'off_epa')
    const d = stat('advanced', 'def_epa')
    if (o && d) {
      const edge = (a, b) => (a == null || b == null ? 'even' : a < b ? 'the edge is ours' : a > b ? 'the edge is theirs' : 'even')
      notes.push({
        kind: 'mu',
        icon: '⇄',
        title: `Next: ${next.opp.name}`,
        text: `Our offense #${o.ranks[team]} meets their defense #${d.ranks[nextFbs.team]} (${edge(o.ranks[team], d.ranks[nextFbs.team])}); our defense #${d.ranks[team]} meets their offense #${o.ranks[nextFbs.team]} (${edge(d.ranks[team], o.ranks[nextFbs.team])}). EPA per play.`,
      })
    }
  }
  return (
    <Panel title="Scouting notes" sub="Read off the ranks above.">
      <div className="tp-notes">
        {notes.map((x) => (
          <div key={x.title} className="tp-note">
            <span className={`tp-note-ic ${x.kind}`}>{x.icon}</span>
            <div>
              <h3>{x.title}</h3>
              <p>{x.text}</p>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// Passing by zone, charted from ESPN's play-by-play. side 'off' = this team's throws,
// 'def' = throws against it. Colour = each zone's success rate against the FBS pass success
// rate (flipped on defense, where a low rate allowed is good).
const ZONE_NAME = { left: 'Left', middle: 'Middle', right: 'Right' }
const MIN_ATT = 5

function PassZones({ side, q, baseline }) {
  const offense = side === 'off'
  const title = offense ? 'Passing by zone' : 'Passing against, by zone'
  const sub = offense
    ? 'Every throw ESPN’s play-by-play charts, by depth and side of the field.'
    : 'Every throw opponents made against this defense, by depth and side of the field.'
  if (q.status === 'loading')
    return (
      <Panel title={title} sub={sub}>
        <div className="rk-loading" style={{ padding: 0 }} aria-busy="true">
          <span className="skel" style={{ width: '60%' }} />
          <span className="skel" style={{ width: '40%' }} />
        </div>
      </Panel>
    )
  if (q.status === 'error')
    return (
      <Panel title={title} sub={sub}>
        <p className="tp-sub">ESPN’s play-by-play didn’t load. The stats below are unaffected.</p>
      </Panel>
    )
  if (q.status !== 'ready') return null

  const data = q[side]
  const { zones, charted, total } = data
  if (charted === 0)
    return (
      <Panel title={title} sub={sub}>
        <p className="tp-sub">No charted throws yet.</p>
      </Panel>
    )

  const rate = (z) => (z.att ? z.succ / z.att : null)
  // Above the baseline is good on offense, bad on defense.
  const edge = (z) => (rate(z) == null || baseline == null ? 0 : (rate(z) - baseline) * (offense ? 1 : -1))
  const fill = (z) => {
    if (z.att < MIN_ATT) return 'var(--tp-card)'
    const e = Math.max(-1, Math.min(1, edge(z) / 0.2))
    return e >= 0 ? `rgba(113, 187, 54, ${0.1 + e * 0.32})` : `rgba(239, 106, 91, ${0.1 - e * 0.32})`
  }
  const pct = (n) => `${Math.round(n * 100)}%`
  const label = (key) => {
    const [depth, dir] = key.split('-')
    return `${depth} ${ZONE_NAME[dir].toLowerCase()}`
  }

  const list = ZONES.map((key) => ({ key, ...zones[key] }))
  const enough = list.filter((z) => z.att >= MIN_ATT)
  const most = [...list].sort((a, b) => b.att - a.att)[0]
  const best = [...enough].sort((a, b) => edge(b) - edge(a))[0]
  const worst = [...enough].sort((a, b) => edge(a) - edge(b))[0]
  const deep = list.filter((z) => z.key.startsWith('deep')).reduce((n, z) => n + z.att, 0)
  const all = list.reduce(
    (a, z) => ({ att: a.att + z.att, cmp: a.cmp + z.cmp, yds: a.yds + z.yds, succ: a.succ + z.succ }),
    { att: 0, cmp: 0, yds: 0, succ: 0 },
  )
  const who = offense ? 'They' : 'Opponents'

  return (
    <Panel
      title={title}
      sub={`${sub} Colour compares each zone’s success rate with the FBS pass success rate${
        baseline != null ? ` (${pct(baseline)})` : ''
      }; zones under ${MIN_ATT} throws stay grey.`}
    >
      <div className="tp-pz">
        <div className="tp-pz-field">
          <span className="tp-pz-depth">Deep</span>
          <span className="tp-pz-depth tp-pz-depth--short">Short</span>
          <div className="tp-pz-grid">
            {list.map((z) => (
              <div key={z.key} className={`tp-pz-cell${z.att < MIN_ATT ? ' thin' : ''}`} style={{ background: fill(z) }}>
                <span className="tp-pz-name">{label(z.key)}</span>
                <span className="tp-pz-big">{z.att ? pct(rate(z)) : '—'}</span>
                <span className="tp-pz-k">success</span>
                <span className="tp-pz-line">
                  {z.att} att · {pct(z.att / charted)} of throws
                </span>
                <span className="tp-pz-line">
                  {z.att ? `${pct(z.cmp / z.att)} cmp · ${(z.yds / z.att).toFixed(1)} yds/att` : ' '}
                </span>
                <span className="tp-pz-line">{z.td ? `${z.td} TD` : ' '}</span>
              </div>
            ))}
          </div>
          <div className="tp-pz-los">
            <span>← left</span>
            <span>line of scrimmage</span>
            <span>right →</span>
          </div>
        </div>

        <div className="tp-pz-read">
          <div className="tp-pz-stat">
            <span className="tool-label">Charted throws</span>
            <span className="tp-tile-v">{all.att}</span>
            <span className="tp-tile-s">
              {pct(all.cmp / all.att)} complete · {(all.yds / all.att).toFixed(1)} yds/att · {pct(all.succ / all.att)} success
            </span>
          </div>
          <ul className="tp-pz-notes">
            <li>
              {who} throw <b>{label(most.key)}</b> most: {pct(most.att / charted)} of throws.
            </li>
            <li>
              <b>{pct(deep / charted)}</b> of throws go deep.
            </li>
            {best && (
              <li>
                {offense ? 'Best' : 'Toughest to throw on'}: <b>{label(best.key)}</b>, {pct(rate(best))} success on {best.att}.
              </li>
            )}
            {worst && worst !== best && (
              <li>
                {offense ? 'Least productive' : 'Most exposed'}: <b>{label(worst.key)}</b>, {pct(rate(worst))} success on{' '}
                {worst.att}.
              </li>
            )}
          </ul>
          <p className="tp-pz-foot">
            {charted} of {total} pass plays in {q.games} games carry a zone; interceptions and some touchdowns are
            logged without one. Sacks aren’t counted. All plays count, garbage time included.
          </p>
        </div>
      </div>
    </Panel>
  )
}

// Every stat on one side of the ball (or the other groups), table by table.
function Breakdown({ tables, stat, team, groups }) {
  const sections = [
    ['basic', 'Stats'],
    ['advanced', 'Advanced'],
    ['adjusted', 'Opponent-adjusted'],
  ]
  return (
    <div className="tp-grid tp-grid--3">
      {sections.map(([table, title]) => {
        const cols = (tables[table]?.columns ?? []).filter((c) => groups.includes(c.group))
        if (cols.length === 0) return null
        const byGroup = groups.map((g) => [g, cols.filter((c) => c.group === g)]).filter(([, c]) => c.length)
        return (
          <Panel key={table} title={title} sub={table === 'basic' ? 'Counting stats per game.' : null}>
            {byGroup.map(([g, list]) => (
              <div key={g}>
                {byGroup.length > 1 && <div className="tp-fp-group">{g}</div>}
                {list.map((c) => {
                  const s = stat(table, c.key)
                  return s && <StatRow key={c.key} s={s} team={team} />
                })}
              </div>
            ))}
          </Panel>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------

export default function TeamProfile() {
  const { slug } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(([id]) => id === params.get('tab')) ? params.get('tab') : 'overview'
  const setTab = (id) => {
    const next = new URLSearchParams(params)
    if (id === 'overview') next.delete('tab')
    else next.set('tab', id)
    setParams(next, { replace: true })
  }

  const metaQ = useTeamStatsMeta()
  const season = metaQ.season
  const metaOf = (id) => (metaQ.status === 'ready' ? metaQ.byTable[TABLES[id]] : null)
  const basicQ = useTeamStatsRows(metaOf('basic') ? TABLES.basic : null, season)
  const advQ = useTeamStatsRows(metaOf('advanced') ? TABLES.advanced : null, season)
  const adjQ = useTeamStatsRows(metaOf('adjusted') ? TABLES.adjusted : null, season)
  const compQ = useTeamStatsRows(metaOf('composite') ? TABLES.composite : null, season)

  const tables = useMemo(() => {
    const out = {}
    for (const [id, q] of [
      ['basic', basicQ],
      ['advanced', advQ],
      ['adjusted', adjQ],
      ['composite', compQ],
    ]) {
      const meta = metaQ.status === 'ready' ? metaQ.byTable[TABLES[id]] : null
      if (q.status !== 'ready' || !meta) continue
      out[id] = {
        meta,
        columns: Array.isArray(meta.columns) ? meta.columns : [],
        rows: q.rows,
        byTeam: Object.fromEntries(q.rows.map((r) => [r.team, r])),
      }
    }
    return out
  }, [metaQ, basicQ, advQ, adjQ, compQ])
  const stat = useMemo(() => makeStats(tables), [tables])

  const rows = useMemo(() => tables.advanced?.rows ?? tables.basic?.rows ?? [], [tables])
  const row = rows.find((r) => teamSlug(r.team) === slug)
  const byNorm = useMemo(() => Object.fromEntries(rows.map((r) => [normName(r.team), r])), [rows])
  const fbsOf = (g) => byNorm[normName(g.opp.name)] ?? null

  const espn = useEspnTeam(row?.team, season)
  const games = espn.status === 'ready' ? espn.games : []
  const nextGame = games.find((g) => !g.completed) ?? null
  const nextFbs = nextGame ? fbsOf(nextGame) : null
  const playedIds = games.filter((g) => g.completed).map((g) => g.id)
  const zonesQ = usePassZones(
    espn.status === 'ready' ? espn.team.id : null,
    playedIds,
    tab === 'offense' || tab === 'defense',
  )
  const passBaseline = useMemo(() => {
    const s = stat('advanced', 'off_pass_success_rate')
    return s && s.values.length ? s.values.reduce((a, v) => a + v, 0) / s.values.length : null
  }, [stat])

  const loading =
    metaQ.status === 'loading' ||
    [basicQ, advQ, adjQ].some((q, i) => metaOf(['basic', 'advanced', 'adjusted'][i]) && q.status === 'loading')
  const failed = metaQ.status === 'error' || [basicQ, advQ, adjQ].some((q) => q.status === 'error')

  let body
  if (loading) body = <Loading />
  else if (failed)
    body = (
      <Notice
        title="This team couldn't load."
        text="Something went wrong reaching the data. Try again in a moment."
        action={
          <button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>
            Try again
          </button>
        }
      />
    )
  else if (!row)
    body = (
      <Notice
        title="We couldn't find that team."
        text="Team profiles cover every FBS team in this season's rankings."
        action={
          <Link className="btn btn-ghost" to="/college-football/teams">
            Back to team rankings
          </Link>
        }
      />
    )

  if (body)
    return (
      <div className="desk tp-page">
        <div className="wrap wrap--wide desk-body tp-top">{body}</div>
      </div>
    )

  const t = row.team
  const scheduleNote =
    espn.status === 'loading' ? (
      <div className="panel rk-loading">
        <span className="skel" style={{ width: '70%' }} />
        <span className="skel" style={{ width: '45%' }} />
      </div>
    ) : espn.status === 'error' ? (
      <Notice title="The schedule couldn't load." text="ESPN didn't answer. The stats below are unaffected." />
    ) : null

  const highlight = nextFbs ? [nextFbs.team] : []
  const meta = tables.advanced?.meta ?? tables.basic?.meta
  const through = meta?.through_week

  return (
    <div className="desk tp-page">
      <div className="wrap wrap--wide desk-body tp-top">
        <nav className="tp-crumb" aria-label="Breadcrumb">
          <Link to="/college-football/teams">FBS team rankings</Link>
          <span className="dim">/</span>
          <span>{t}</span>
        </nav>
        <Hero row={row} espn={espn} stat={stat} season={season} nextGame={nextGame} nextFbs={nextFbs} />
      </div>

      <div className="tp-tabs">
        <div className="wrap wrap--wide">
          <div className="tp-tabs-in" role="tablist" aria-label="Team profile sections">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className={`tp-tab${tab === id ? ' on' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="wrap wrap--wide desk-body tp-body">
        {tab === 'overview' && (
          <>
            {scheduleNote ?? (games.length > 0 && <SeasonStrip games={games} fbsOf={fbsOf} stat={stat} team={t} />)}
            <Composite tables={tables} stat={stat} team={t} />
            <div className="tp-grid tp-grid--2">
              <Fingerprint stat={stat} team={t} />
              <Scatter stat={stat} rows={rows} row={row} highlight={highlight} />
            </div>
            <div className="tp-grid tp-grid--2">
              <Situations stat={stat} team={t} />
              <Notes stat={stat} team={t} next={nextGame} nextFbs={nextFbs} />
            </div>
          </>
        )}
        {tab === 'schedule' && (scheduleNote ?? <ScheduleTable games={games} fbsOf={fbsOf} />)}
        {tab === 'offense' && (
          <>
            <PassZones side="off" q={zonesQ} baseline={passBaseline} />
            <Breakdown tables={tables} stat={stat} team={t} groups={['Offense']} />
          </>
        )}
        {tab === 'defense' && (
          <>
            <PassZones side="def" q={zonesQ} baseline={passBaseline} />
            <Breakdown tables={tables} stat={stat} team={t} groups={['Defense']} />
          </>
        )}
        {tab === 'more' && (
          <Breakdown tables={tables} stat={stat} team={t} groups={['Turnovers', 'Special teams', 'Penalties', 'General']} />
        )}

        <p className="table-foot tp-foot">
          <span>
            Ranked against {meta?.team_count ?? rows.length} FBS teams
            {through != null && `, season to date through week ${through}`}
            {meta?.garbage_time_excluded ? ', garbage time excluded' : ''}. Counting stats are per game.
          </span>
          <span>
            Stats from{' '}
            <a href="https://collegefootballdata.com" target="_blank" rel="noreferrer">
              CollegeFootballData.com
            </a>
            ; logos and schedule from ESPN.
          </span>
        </p>
      </div>
    </div>
  )
}
