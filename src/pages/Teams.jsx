import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { IconClock, IconSearch } from '../components/Icons.jsx'
import Seg from '../components/Seg.jsx'
import { useTeamStatsMeta, useTeamStatsRows } from '../lib/data.js'
import { formatStat, rankTeams, rankTone, sortByRank } from '../lib/rank.js'

// Every FBS team, ranked. The data is published by the CFB Command Center; columns,
// labels, groups and formats all come from team_stats_meta.columns.
const VIEWS = [
  { id: 'basic', label: 'Stats', table: 'team_stats_basic' },
  { id: 'advanced', label: 'Advanced', table: 'team_stats_advanced' },
  { id: 'adjusted', label: 'Opponent-adjusted', table: 'team_stats_adjusted' },
]

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

function Retry({ onClick }) {
  return (
    <button type="button" className="btn btn-ghost" onClick={onClick}>
      Try again
    </button>
  )
}

function Loading() {
  return (
    <div className="panel rk-loading" aria-busy="true">
      <span className="sr-only">Loading team stats</span>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="skel" style={{ width: `${55 + ((i * 7) % 5) * 9}%` }} />
      ))}
    </div>
  )
}

// Cap the table's scroll box at the screen height left below its top edge, so its
// horizontal scrollbar is on screen without scrolling the page. The source note under the
// table is counted too. Never shorter than MIN_BOX (small screens scroll the page instead).
const MIN_BOX = 420

function useFitToScreen() {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      const top = el.getBoundingClientRect().top + window.scrollY
      const below = el.nextElementSibling?.offsetHeight ?? 0
      const room = window.innerHeight - top - below - 16
      el.style.maxHeight = `${Math.max(room, Math.min(MIN_BOX, window.innerHeight * 0.7))}px`
    }
    fit()
    // The controls above can wrap to more lines when the window narrows, moving the table down.
    const ro = new ResizeObserver(fit)
    ro.observe(document.body)
    window.addEventListener('resize', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [])
  return ref
}

function RankTable({ view, meta, rows, group, perGame }) {
  const boxRef = useFitToScreen()
  // { key, dir }: dir 1 = #1 at the top, -1 = last at the top. Reset when the view or group changes.
  const [sort, setSort] = useState(null)
  const [sortFor, setSortFor] = useState(`${view.id}:${group}`)
  if (sortFor !== `${view.id}:${group}`) {
    setSortFor(`${view.id}:${group}`)
    setSort(null)
  }

  const cols = useMemo(() => meta.columns.filter((c) => c.group === group), [meta.columns, group])
  // Counting stats have a per-game column (columns[].per_game_key) and rank on it, even when
  // season totals are shown.
  const rankKey = (c) => c.per_game_key ?? c.key
  const showKey = (c) => (perGame && c.per_game_key ? c.per_game_key : c.key)

  const defaultCol = cols.find((c) => c.higher_is_better != null) ?? cols[0]
  const by = sort && cols.some((c) => c.key === sort.key) ? sort : { key: defaultCol?.key, dir: 1 }
  const rankCol = cols.find((c) => c.key === by.key)
  const directional = rankCol?.higher_is_better != null

  // Ranked across every FBS team; the conference filter only hides rows.
  const rkKey = rankCol ? rankKey(rankCol) : null
  const rkDir = rankCol?.higher_is_better
  const ranks = useMemo(() => (rkKey ? rankTeams(rows.all, rkKey, rkDir) : {}), [rows.all, rkKey, rkDir])
  const ordered = useMemo(() => sortByRank(rows.shown, ranks, by.dir), [rows.shown, ranks, by.dir])
  const teams = meta.team_count || rows.all.length

  const clickCol = (c) => setSort(by.key === c.key ? { ...by, dir: -by.dir } : { key: c.key, dir: 1 })
  const flip = () => setSort({ ...by, dir: -by.dir })

  return (
    <div className="rk-wrap" ref={boxRef}>
      <table className="rk">
        <thead>
          <tr>
            <th scope="col" className="rk-rank num" aria-sort={by.dir > 0 ? 'ascending' : 'descending'}>
              <button
                type="button"
                className="rk-sort"
                title={by.dir > 0 ? 'Showing #1 first; click for last first' : 'Showing last first; click for #1 first'}
                onClick={flip}
              >
                Rank {by.dir > 0 ? '↑' : '↓'}
              </button>
            </th>
            <th scope="col" className="rk-team">
              Team
            </th>
            <th scope="col" className="num">
              G
            </th>
            {cols.map((c) => (
              <th key={c.key} scope="col" className={`num${by.key === c.key ? ' on' : ''}`}>
                <button
                  type="button"
                  className="rk-sort"
                  title={c.derived ? 'Computed from CFBD totals' : undefined}
                  onClick={() => clickCol(c)}
                >
                  {c.label}
                  {c.derived ? '*' : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ordered.length === 0 && (
            <tr>
              <td className="rk-none" colSpan={cols.length + 3}>
                No teams match your filters.
              </td>
            </tr>
          )}
          {ordered.map((r) => {
            const rank = ranks[r.team]
            return (
              <tr key={r.team}>
                <td className={`rk-rank num ${directional ? rankTone(rank, teams) : ''}`}>{rank ?? '—'}</td>
                <td className="rk-team">
                  <span className="rk-name">{r.team}</span>
                  {r.conference && <span className="rk-conf">{r.conference}</span>}
                </td>
                <td className="num">{r.games ?? '—'}</td>
                {cols.map((c) => (
                  <td key={c.key} className={`num${by.key === c.key ? ' on' : ''}`}>
                    {formatStat(r[showKey(c)], c.format, perGame && !!c.per_game_key)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function Teams() {
  const [params, setParams] = useSearchParams()
  const view = VIEWS.find((v) => v.id === params.get('view')) ?? VIEWS[0]
  const [groupPick, setGroupPick] = useState(null)
  const [conf, setConf] = useState('')
  const [q, setQ] = useState('')
  const [perGame, setPerGame] = useState(true)

  const metaQ = useTeamStatsMeta()
  const meta = metaQ.status === 'ready' ? metaQ.byTable[view.table] : null
  const columns = useMemo(() => (Array.isArray(meta?.columns) ? meta.columns : []), [meta])
  const groups = useMemo(() => [...new Set(columns.map((c) => c.group))], [columns])
  const group = groups.includes(groupPick) ? groupPick : groups[0]

  const rowsQ = useTeamStatsRows(meta ? view.table : null, metaQ.season)
  const hasPerGame = columns.some((c) => c.per_game_key)
  const all = useMemo(() => rowsQ.rows ?? [], [rowsQ.rows])
  // Filters only hide rows; ranks stay ranks across all FBS teams.
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return all.filter(
      (r) => (!conf || r.conference === conf) && (!needle || r.team.toLowerCase().includes(needle)),
    )
  }, [all, conf, q])
  const conferences = useMemo(() => [...new Set(all.map((r) => r.conference).filter(Boolean))].sort(), [all])

  const setView = (id) => {
    const next = new URLSearchParams(params)
    if (id === VIEWS[0].id) next.delete('view')
    else next.set('view', id)
    setParams(next, { replace: true })
    setGroupPick(null)
  }

  const sub = meta
    ? [
        `${meta.team_count} FBS teams`,
        meta.through_week != null && `season to date through week ${meta.through_week}`,
        meta.garbage_time_excluded ? 'garbage time excluded' : 'garbage time included',
        view.id === 'adjusted' && 'this season only',
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  let body
  if (metaQ.status === 'loading' || (meta && rowsQ.status === 'loading')) body = <Loading />
  else if (metaQ.status === 'error' || rowsQ.status === 'error')
    body = (
      <Notice
        title="Team stats couldn't load."
        text="Something went wrong reaching the data. Try again in a moment."
        action={<Retry onClick={metaQ.status === 'error' ? metaQ.retry : rowsQ.retry} />}
      />
    )
  else if (!meta || all.length === 0)
    body = <Notice title="No team stats published yet" text="Rankings will appear here once the first update is out." />
  else
    body = (
      <div className="panel">
        <div className="rk-bar">
          <Seg label="Stat group" options={groups.map((g) => [g, g])} value={group} onChange={setGroupPick} small />
          {hasPerGame && (
            <Seg
              label="Values"
              options={[
                [true, 'Per game'],
                [false, 'Season totals'],
              ]}
              value={perGame}
              onChange={setPerGame}
              small
            />
          )}
          <span className="rk-hint">
            {hasPerGame ? 'Counting stats are ranked per game.' : 'Ranked against FBS, #1 = best.'} Rank is on
            the highlighted column; click a column to rank on it.
          </span>
        </div>
        <RankTable
          view={view}
          meta={{ ...meta, columns }}
          rows={{ all, shown }}
          group={group}
          perGame={hasPerGame && perGame}
        />
        <p className="table-foot rk-foot">
          <span>
            Source: {meta.source || 'CollegeFootballData'}. {view.id === 'basic' && '* computed from CFBD totals. '}
            Blank = no value, such as a rate with no attempts.
          </span>
          <span>
            Data from{' '}
            <a href="https://collegefootballdata.com" target="_blank" rel="noreferrer">
              CollegeFootballData.com
            </a>
          </span>
        </p>
      </div>
    )

  return (
    <div className="desk">
      <div className="wrap wrap--wide desk-body">
        <div className="desk-head">
          <div className="stack stack--sm">
            <span className="eb">College Football{metaQ.season ? `, ${metaQ.season}` : ''}</span>
            <h1 className="disp h2">FBS team rankings</h1>
            {sub && <p className="rk-sub">{sub}</p>}
          </div>
        </div>

        <div className="panel toolbar">
          <div className="tool">
            <span className="tool-label">View</span>
            <Seg label="View" options={VIEWS.map((v) => [v.id, v.label])} value={view.id} onChange={setView} />
          </div>
          <div className="tool">
            <label htmlFor="team-conf">Conference</label>
            <select id="team-conf" value={conf} onChange={(e) => setConf(e.target.value)}>
              <option value="">All conferences</option>
              {conferences.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="tool tool--grow">
            <label htmlFor="team-search">Search</label>
            <div className="search">
              <IconSearch size={16} />
              <input
                id="team-search"
                type="search"
                placeholder="Find a team"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </div>

        {body}
      </div>
    </div>
  )
}
