import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import SubNav from '../components/SubNav.jsx'
import { DiscordButton } from '../components/Buttons.jsx'
import { ScheduleCards, ScheduleChips } from '../components/Schedule.jsx'
import { IconClock, IconDownload, IconLock, IconSearch } from '../components/Icons.jsx'
import Seg from '../components/Seg.jsx'
import { PACKAGES, PROJECTION_COLUMNS } from '../config.js'
import { useProjections } from '../lib/data.js'

const ALL = 'All'

function toCsv(rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const head = PROJECTION_COLUMNS.map((c) => esc(c.label)).join(',')
  const body = rows.map((r) => PROJECTION_COLUMNS.map((c) => esc(r[c.key])).join(','))
  return [head, ...body].join('\n')
}

function downloadCsv(rows, filename) {
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const skelWidth = (i, j) => 40 + ((i * 7 + j * 3) % 5) * 10

function Table({ rows, skeleton, skeletonRows = 12, dim = false }) {
  return (
    <div className="ptable-wrap">
      <table className={`ptable${dim ? ' ptable--dim' : ''}`}>
        <thead>
          <tr>
            {PROJECTION_COLUMNS.map((c) => (
              <th key={c.key} scope="col" className={c.num ? 'num' : ''}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {skeleton
            ? Array.from({ length: skeletonRows }, (_, i) => (
                <tr key={i}>
                  {PROJECTION_COLUMNS.map((c, j) => (
                    <td key={c.key} className={c.num ? 'num' : ''}>
                      <span className="skel" style={{ width: `${skelWidth(i, j)}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((r, i) => (
                <tr key={r.id ?? `${r.name}-${r.team}-${i}`}>
                  {PROJECTION_COLUMNS.map((c) => (
                    <td key={c.key} className={c.num ? 'num' : ''}>
                      {r[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  )
}

function Live({ data }) {
  const slates = data.slates
  const [dayPick, setDayPick] = useState(null)
  // Default to the earliest day still on the board.
  const slate = slates.find((s) => s.day === dayPick) ?? slates[0]
  const rows = useMemo(() => slate?.rows ?? [], [slate])
  const [q, setQ] = useState('')
  const [team, setTeam] = useState(ALL)
  const [pos, setPos] = useState(ALL)

  const teams = useMemo(() => [...new Set(rows.map((r) => r.team))].sort(), [rows])
  const positions = useMemo(() => [...new Set(rows.map((r) => r.position))].sort(), [rows])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter(
      (r) =>
        (!needle ||
          `${r.name} ${r.team}`.toLowerCase().includes(needle)) &&
        (team === ALL || r.team === team) &&
        (pos === ALL || r.position === pos),
    )
  }, [rows, q, team, pos])

  const updated = slate?.updatedAt
    ? new Date(slate.updatedAt).toLocaleString('en-US', {
        timeZone: 'America/New_York',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }) + ' ET'
    : data.skeleton
      ? '[date and time]'
      : null

  return (
    <>
      <div className="desk-head">
        <div className="stack stack--sm">
          <span className="eb">NCAAF Player Projections{slate?.week ? `, week ${slate.week}` : ''}</span>
          <h1 className="disp h2">Player Projections</h1>
        </div>
        <div className="btn-row">
          {updated && (
            <span className="updated">
              <span className="dot" aria-hidden="true" />
              Last updated {updated}
            </span>
          )}
          <button
            type="button"
            className="btn btn-green"
            disabled={data.skeleton || filtered.length === 0}
            onClick={() =>
              downloadCsv(
                filtered,
                `rogue-ncaaf-projections${slate.week ? `-wk${slate.week}` : ''}-${slate.day}.csv`,
              )
            }
          >
            <IconDownload size={16} />
            Download {slate ? slate.label : ''} .csv
          </button>
        </div>
      </div>

      <div className="panel toolbar">
        {slates.length > 0 && (
          <div className="tool">
            <span className="tool-label">Slate</span>
            <Seg
              label="Slate"
              options={slates.map((s) => [s.day, s.label])}
              value={slate.day}
              onChange={(day) => {
                setDayPick(day)
                setTeam(ALL)
                setPos(ALL)
              }}
            />
          </div>
        )}
        <div className="tool tool--grow">
          <label htmlFor="proj-search">Search</label>
          <div className="search">
            <IconSearch size={16} />
            <input
              id="proj-search"
              type="search"
              placeholder="Player or team"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        <div className="tool">
          <label htmlFor="proj-team">Team</label>
          <select id="proj-team" value={team} onChange={(e) => setTeam(e.target.value)}>
            <option>{ALL}</option>
            {teams.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="tool">
          <label htmlFor="proj-pos">Position</label>
          <select id="proj-pos" value={pos} onChange={(e) => setPos(e.target.value)}>
            <option>{ALL}</option>
            {positions.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel">
        <Table rows={filtered} skeleton={data.skeleton} />
        <div className="table-foot">
          <span>{data.skeleton ? 'Showing [N] players' : `Showing ${filtered.length} players`}</span>
          <span>Columns match the Unabated Simulator upload format</span>
        </div>
      </div>
    </>
  )
}

function Header() {
  return (
    <div className="desk-head">
      <div className="stack stack--sm">
        <span className="eb">NCAAF Player Projections</span>
        <h1 className="disp h2">Player Projections</h1>
      </div>
      <ScheduleChips />
    </div>
  )
}

function Locked() {
  return (
    <>
      <Header />
      <div className="panel locked">
        <div className="locked-bg" aria-hidden="true">
          <Table skeleton skeletonRows={10} dim />
        </div>
        <div className="locked-over">
          <div className="locked-card">
            <span className="icon-circle">
              <IconLock size={22} />
            </span>
            <h2 className="disp h5">Log in to view projections</h2>
            <p className="soft">
              Player projections are available with the {PACKAGES.projections.name} package ($
              {PACKAGES.projections.price}/mo).
            </p>
            <div className="btn-row btn-row--center">
              <DiscordButton />
              <Link className="btn btn-ghost" to="/sports/ncaaf#packages">
                See packages
              </Link>
            </div>
            <p className="mono small dim">Gamebooks subscribers can upgrade to Player Projections.</p>
          </div>
        </div>
      </div>
    </>
  )
}

function Empty({ title, text, next }) {
  return (
    <>
      <Header />
      <div className="empty">
        <span className="dim">
          <IconClock size={36} />
        </span>
        <h2 className="disp h5">{title}</h2>
        <p className="soft measure">{text}</p>
        <ScheduleCards />
        {next && <p className="mono small dim">Next drop: {next}</p>}
      </div>
    </>
  )
}

export default function Projections() {
  const data = useProjections()
  return (
    <div className="desk">
      <SubNav />
      <div className="wrap desk-body">
        {data.status === 'locked' && <Locked />}
        {data.status === 'live' && <Live data={data} />}
        {data.status === 'pending' && (
          <Empty
            title="Today's projections aren't out yet."
            text="They'll appear here as soon as they drop."
            next={data.nextDrop}
          />
        )}
        {data.status === 'off' && (
          <Empty
            title="Today's slate is complete."
            text="Projections for the next slate will appear here when they drop."
            next={data.nextDrop}
          />
        )}
      </div>
    </div>
  )
}
