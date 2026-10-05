import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider.jsx'
import { DiscordButton } from '../components/Buttons.jsx'
import { IconClock, IconClose, IconLock, IconSearch } from '../components/Icons.jsx'
import Seg from '../components/Seg.jsx'
import {
  POSITIONS,
  DEFAULT_QUALIFY,
  POS_PLURAL,
  VOLUME_WORD,
  bestWorst,
  bioLine,
  compositeHelp,
  compositeSpec,
  dec1,
  fmt,
  initials,
  longDate,
  ordinal,
  positionSpec,
  rankRows,
  qualifierCounts,
  rankTone,
  rescore,
  rowKey,
  signed,
  skillHelp,
  skillTone,
  sortRanked,
  statHelp,
  stars,
  tint,
  useBoardRows,
  useGameLines,
  usePlayerBoardRows,
  usePlayerMeta,
  usePlayerWeek,
  useVolumes,
  useZones,
  whole,
} from '../lib/players.js'
import '../styles/players.css'

// Every FBS QB, RB, WR and TE with a line this season, ranked inside his position. Published
// by the CFB Command Center; columns, labels, groups, formats and the composite's name all
// come from player_board_meta. Hover a row for a preview, click it for the full profile.

const canHover = () => window.matchMedia('(hover: hover)').matches

// ---------------------------------------------------------------------
// Shared bits
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

function Retry({ onClick, small = false }) {
  return (
    <button type="button" className={`btn btn-ghost${small ? ' btn-sm' : ''}`} onClick={onClick}>
      Try again
    </button>
  )
}

function Loading({ what = 'the player board' }) {
  return (
    <div className="panel rk-loading" aria-busy="true">
      <span className="sr-only">Loading {what}</span>
      {Array.from({ length: 10 }, (_, i) => (
        <span key={i} className="skel" style={{ width: `${55 + ((i * 7) % 5) * 9}%` }} />
      ))}
    </div>
  )
}

function SectionLoader({ what }) {
  return (
    <div className="pl-loader" aria-busy="true">
      <span className="sr-only">Loading {what}</span>
      <span className="skel" style={{ width: '70%' }} />
      <span className="skel" style={{ width: '45%' }} />
    </div>
  )
}

function SectionError({ what, onRetry }) {
  return (
    <div className="pl-error">
      <span>Couldn't load {what}.</span>
      <Retry onClick={onRetry} small />
    </div>
  )
}

function Avatar({ name, pos, size = 'md' }) {
  return (
    <span className={`pl-av pl-av--${size} pl-av--${(pos || '').toLowerCase()}`} aria-hidden="true">
      {initials(name)}
    </span>
  )
}

function SkillStrip({ row, skills }) {
  return (
    <div className="pl-skills">
      {skills.map((s) => {
        const v = row[s.column]
        return (
          <div key={s.key} className="pl-skill">
            <span className="pl-skill-lab">{s.label}</span>
            <span className="pl-skill-bar">
              {v != null && <i className={skillTone(Number(v))} style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />}
            </span>
            <span className="pl-skill-v">{v == null ? '—' : ordinal(v)}</span>
          </div>
        )
      })}
    </div>
  )
}

const volumePhrase = (spec) => VOLUME_WORD[spec?.volumeKey] ?? 'volume'

// ---------------------------------------------------------------------
// Hover preview (board row only, no request)
// ---------------------------------------------------------------------

function Preview({ hover, spec, comp, compRank, qualCount }) {
  const ref = useRef(null)
  const [at, setAt] = useState(null)
  const { row, x, y } = hover

  // Next to the cursor, flipped and clamped so the card stays inside the viewport.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const pad = 12
    let left = x + 18
    let top = y + 14
    if (left + width > window.innerWidth - pad) left = x - width - 18
    if (left < pad) left = window.innerWidth - width - pad
    if (top + height > window.innerHeight - pad) top = window.innerHeight - height - pad
    setAt({ left: Math.max(pad, left), top: Math.max(pad, top) })
  }, [x, y, row])

  const pos = row.position_group
  const bw = row.qualified ? bestWorst(row, spec.skills) : null
  const key = spec.columns.filter((c) => c.higher_is_better != null || c.group === 'Line').slice(1, 7)
  const bio = bioLine(row)
  const score = !comp.held && row.qualified && row[comp.column] != null
  const background = [
    row.portal_origin ? `Transferred from ${row.portal_origin}.` : row.from_team ? `Last season at ${row.from_team}.` : null,
    row.recruit_stars ? `${[stars(row.recruit_stars), row.recruit_year].filter(Boolean).join(' ')} recruit.` : null,
  ].filter(Boolean)

  return (
    <div
      ref={ref}
      className="pl-preview"
      role="tooltip"
      style={at ? { left: at.left, top: at.top } : { left: -9999, top: 0 }}
    >
      <div className="pl-pv-head">
        <Avatar name={row.player} pos={pos} />
        <div className="pl-pv-id">
          <div className="pl-pv-name">{row.player}</div>
          <div className="pl-pv-sub">
            {row.team} · {pos}
            {bio ? ` · ${bio}` : ''}
          </div>
        </div>
        {score && (
          <div className="pl-pv-score">
            <b>{dec1(row[comp.column])}</b>
            <span>
              #{compRank ?? '—'} of {qualCount}
            </span>
          </div>
        )}
      </div>
      {row.qualified ? (
        <SkillStrip row={row} skills={spec.skills} />
      ) : (
        <p className="pl-pv-note">Not ranked: under the {volumePhrase(spec)} qualifier.</p>
      )}
      {bw && (
        <p className="pl-pv-note">
          Best at <b>{bw.best.label.toLowerCase()}</b> ({ordinal(bw.best.v)}), weakest at{' '}
          <b>{bw.worst.label.toLowerCase()}</b> ({ordinal(bw.worst.v)}).
        </p>
      )}
      {key.length > 0 && (
        <div className="pl-pv-stats">
          {key.map((c) => (
            <span key={c.key} style={row.qualified ? tint(row[c.pct_key]) : undefined}>
              <small>{c.label}</small>
              <b>{fmt(row[c.key], c.format)}</b>
            </span>
          ))}
        </div>
      )}
      {background.length > 0 && <p className="pl-pv-note">{background.join(' ')}</p>}
      <p className="pl-pv-hint">Click for the full profile</p>
    </div>
  )
}

// ---------------------------------------------------------------------
// The board
// ---------------------------------------------------------------------

function BoardTable({ pos, spec, comp, rows, shownCount, ranks, by, onSort, onFlip, onOpen, onHoverRow, onHoverEnd }) {
  const groups = useMemo(() => {
    const out = []
    for (const c of spec.columns) {
      const last = out[out.length - 1]
      if (last && last.name === c.group) last.n += 1
      else out.push({ name: c.group, n: 1, first: c.key })
    }
    return out
  }, [spec.columns])
  const groupStart = new Set(groups.map((g) => g.first))
  const scoreCols = (comp.held ? 0 : 1) + spec.skills.length
  const directional = by.hib != null
  const on = (k) => (by.key === k ? ' on' : '')
  const total = 3 + scoreCols + spec.columns.length

  const header = (key, label, extra = '', title) => (
    <th key={key} scope="col" className={`num${extra}${on(key)}`} aria-sort={by.key === key ? (by.dir > 0 ? 'ascending' : 'descending') : undefined}>
      <button type="button" className="rk-sort" title={title} onClick={() => onSort(key)}>
        {label}
      </button>
    </th>
  )

  return (
    <table className="rk pb">
      <thead>
        <tr className="pb-grp">
          <th className="rk-rank" aria-hidden="true" />
          <th className="rk-team pb-player" aria-hidden="true" />
          <th aria-hidden="true" />
          {scoreCols > 0 && (
            <th colSpan={scoreCols} className="gs">
              Composite and sub-skills (percentile)
            </th>
          )}
          {groups.map((g) => (
            <th key={g.first} colSpan={g.n} className="gs">
              {g.name}
            </th>
          ))}
        </tr>
        <tr className="pb-cols">
          <th scope="col" className="rk-rank num" aria-sort={by.dir > 0 ? 'ascending' : 'descending'}>
            <button
              type="button"
              className="rk-sort"
              title={by.dir > 0 ? 'Showing #1 first; click for last first' : 'Showing last first; click for #1 first'}
              onClick={onFlip}
            >
              Rank {by.dir > 0 ? '↑' : '↓'}
            </button>
          </th>
          <th scope="col" className="rk-team pb-player">
            Player
          </th>
          <th scope="col">Team</th>
          {!comp.held && header(comp.column, comp.label, ' gs', compositeHelp(spec))}
          {spec.skills.map((s, i) =>
            header(
              s.column,
              s.label,
              comp.held && i === 0 ? ' gs' : '',
              skillHelp(s, spec, pos),
            ),
          )}
          {spec.columns.map((c) => header(c.key, c.label, groupStart.has(c.key) ? ' gs' : '', statHelp(c, pos)))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td className="rk-none" colSpan={total}>
              No players match your filters.
            </td>
          </tr>
        )}
        {rows.map((r) => {
          const rank = ranks.get(r)
          const q = !!r.qualified
          const bio = bioLine(r)
          return (
            <tr
              key={rowKey(r)}
              className={`pb-row${q ? '' : ' unq'}`}
              tabIndex={0}
              onClick={() => onOpen(r)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpen(r)
                }
              }}
              onPointerEnter={(e) => onHoverRow(r, e)}
              onPointerMove={(e) => onHoverRow(r, e, true)}
              onPointerLeave={onHoverEnd}
            >
              <td className={`rk-rank num ${directional ? rankTone(rank, shownCount) : ''}`}>{rank ?? '—'}</td>
              <td className="rk-team pb-player">
                <span className="pb-who">
                  <Avatar name={r.player} pos={r.position_group} size="sm" />
                  <span className="pb-who-t">
                    <span className="pb-name">{r.player}</span>
                    {bio && <span className="pb-bio">{bio}</span>}
                  </span>
                </span>
              </td>
              <td className="pb-team">
                <span className="pb-team-n">{r.team}</span>
                {r.conference && <span className="pb-bio">{r.conference}</span>}
              </td>
              {!comp.held && (
                <td className={`num gs pb-score${on(comp.column)}`}>{r[comp.column] == null ? '—' : dec1(r[comp.column])}</td>
              )}
              {spec.skills.map((s, i) => (
                <td
                  key={s.column}
                  className={`num${comp.held && i === 0 ? ' gs' : ''}${on(s.column)}`}
                  style={q ? tint(r[s.column]) : undefined}
                >
                  {whole(r[s.column])}
                </td>
              ))}
              {spec.columns.map((c) => (
                <td
                  key={c.key}
                  className={`num${groupStart.has(c.key) ? ' gs' : ''}${on(c.key)}`}
                  style={q && c.pct_key ? tint(r[c.pct_key]) : undefined}
                >
                  {fmt(r[c.key], c.format)}
                </td>
              ))}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Board({ userId, entitled }) {
  const [params, setParams] = useSearchParams()
  const pos = POSITIONS.includes(params.get('pos')) ? params.get('pos') : 'QB'
  const playerParam = params.get('player')
  const teamParam = params.get('team')

  const [qualOnly, setQualOnly] = useState(true)
  const [conf, setConf] = useState('')
  const [q, setQ] = useState('')
  // Qualifier line, as a share of the position leader's volume: ?qual=<percent>, default 10.
  const qualPct = Number(params.get('qual'))
  const share =
    params.get('qual') != null && Number.isFinite(qualPct) && qualPct >= 0 && qualPct <= 100 ? qualPct / 100 : DEFAULT_QUALIFY
  const [qualDraft, setQualDraft] = useState(null)
  const setShare = (pct) => {
    const next = new URLSearchParams(params)
    if (pct === Math.round(DEFAULT_QUALIFY * 100)) next.delete('qual')
    else next.set('qual', String(pct))
    setParams(next, { replace: true })
  }
  // { key, dir }: dir 1 = #1 at the top. Switching position resets it to the composite.
  const [sort, setSort] = useState(null)
  const [sortFor, setSortFor] = useState(pos)
  if (sortFor !== pos) {
    setSortFor(pos)
    setSort(null)
  }

  const metaQ = usePlayerMeta(userId)
  const season = metaQ.season
  const boardMeta = metaQ.byTable?.player_board ?? null
  const spec = positionSpec(boardMeta, pos)
  const comp = compositeSpec(boardMeta)
  const rowsQ = useBoardRows(userId, boardMeta ? season : null, pos)
  const volumesQ = useVolumes(userId, boardMeta ? season : null)

  // Percentiles, sub-skills and the composite, re-placed at the site's qualifier line.
  const all = useMemo(
    () => (spec ? rescore(rowsQ.data ?? [], spec, comp.column, share) : []),
    // spec is rebuilt each render from meta; the meta row and position name it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowsQ.data, boardMeta, pos, comp.column, share],
  )
  const conferences = useMemo(() => [...new Set(all.map((r) => r.conference).filter(Boolean))].sort(), [all])
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return all.filter(
      (r) =>
        (!qualOnly || r.qualified) &&
        (!conf || r.conference === conf) &&
        (!needle || (r.player ?? '').toLowerCase().includes(needle) || (r.team ?? '').toLowerCase().includes(needle)),
    )
  }, [all, qualOnly, conf, q])

  // Ranked-on column and its direction of "better" (null = most, not best).
  const hibOf = useMemo(() => {
    const m = new Map()
    if (!spec) return m
    m.set(comp.column, true)
    for (const s of spec.skills) m.set(s.column, true)
    for (const c of spec.columns) m.set(c.key, c.higher_is_better ?? null)
    return m
  }, [spec, comp.column])
  const defaultKey = comp.held ? spec?.skills[0]?.column ?? spec?.columns[0]?.key : comp.column
  const sortKey = sort && hibOf.has(sort.key) ? sort.key : defaultKey
  const by = { key: sortKey, dir: sort && sort.key === sortKey ? sort.dir : 1, hib: hibOf.get(sortKey) ?? null }

  const ranks = useMemo(() => rankRows(shown, by.key, by.hib), [shown, by.key, by.hib])
  const ordered = useMemo(() => sortRanked(shown, ranks, by.dir), [shown, ranks, by.dir])

  // Composite rank among all the position's qualifiers, whatever the filters.
  const qualifiers = useMemo(() => all.filter((r) => r.qualified), [all])
  const compRanks = useMemo(() => rankRows(qualifiers, comp.column, true), [qualifiers, comp.column])
  const leader = useMemo(
    () => all.reduce((best, r) => (r.volume != null && (best == null || Number(r.volume) > Number(best.volume)) ? r : best), null),
    [all],
  )

  const onSort = (key) => setSort(by.key === key ? { key, dir: -by.dir } : { key, dir: 1 })
  const onFlip = () => setSort({ key: by.key, dir: -by.dir })

  const setPos = (p) => {
    const next = new URLSearchParams(params)
    if (p === 'QB') next.delete('pos')
    else next.set('pos', p)
    next.delete('player')
    next.delete('team')
    setParams(next, { replace: true })
    setHover(null)
  }

  // ---- hover preview: shown after ~180 ms of a real mouse resting on a row
  const [hover, setHover] = useState(null)
  const timer = useRef(null)
  const pending = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  const onHoverRow = (row, e, moving = false) => {
    if (e.pointerType !== 'mouse' || !canHover()) return
    pending.current = { row, x: e.clientX, y: e.clientY }
    if (moving) {
      setHover((h) => (h && h.row === row ? { row, x: e.clientX, y: e.clientY } : h))
      return
    }
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setHover(pending.current), 180)
  }
  const onHoverEnd = () => {
    clearTimeout(timer.current)
    setHover(null)
  }

  // ---- profile: ?player={player_id} (&team= when he has a row for more than one team)
  const open = (r) => {
    onHoverEnd()
    const next = new URLSearchParams(params)
    next.set('player', r.player_id)
    const multi = all.some((x) => x.player_id === r.player_id && x.team !== r.team)
    if (multi) next.set('team', r.team)
    else next.delete('team')
    setParams(next)
  }
  const close = () => {
    const next = new URLSearchParams(params)
    next.delete('player')
    next.delete('team')
    setParams(next, { replace: true })
  }

  const matchRow = (r) => r.player_id === playerParam && (!teamParam || r.team === teamParam)
  const onBoard = playerParam && rowsQ.status === 'ready' ? all.find(matchRow) : null
  // A linked player on another position: look his row up, then switch to his position.
  const lookupQ = usePlayerBoardRows(
    userId,
    season,
    playerParam && rowsQ.status === 'ready' && !onBoard ? playerParam : null,
  )
  const looked = lookupQ.status === 'ready' ? lookupQ.data.find(matchRow) ?? null : null
  useEffect(() => {
    if (looked && POSITIONS.includes(looked.position_group) && looked.position_group !== pos) {
      const next = new URLSearchParams(params)
      if (looked.position_group === 'QB') next.delete('pos')
      else next.set('pos', looked.position_group)
      setParams(next, { replace: true })
    }
  }, [looked, pos, params, setParams])
  const profileRow = onBoard ?? null
  const profileMissing = playerParam && lookupQ.status === 'ready' && !looked

  const through = boardMeta?.through_week
  const sub = [
    'Every QB, RB, WR and TE ranked inside his position',
    through != null && `season to date through week ${through}`,
    'hover a player for a preview, click for his profile',
  ]
    .filter(Boolean)
    .join(' · ')

  let body
  if (metaQ.status === 'loading' || (boardMeta && rowsQ.status === 'loading')) body = <Loading />
  else if (metaQ.status === 'error' || rowsQ.status === 'error')
    body = (
      <Notice
        title="The player board couldn't load."
        text="Something went wrong reaching the data. Try again in a moment."
        action={<Retry onClick={metaQ.status === 'error' ? metaQ.retry : rowsQ.retry} />}
      />
    )
  else if (!boardMeta)
    body = <Notice title="No player board published yet" text="The board will appear here once the first update is out." />
  else if (!spec || all.length === 0)
    body = <Notice title={`No ${POS_PLURAL[pos].toLowerCase()} published yet`} text="This position has no player lines for the season so far." />
  else {
    const footLabel = comp.label
    body = (
      <div className="panel">
        <p className="rk-bar pb-note">
          {POS_PLURAL[pos]}: {qualifiers.length} qualify
          {share != null && ` at ${Math.round(share * 100)}% of the leader's ${volumePhrase(spec)}`}
          {leader && ` (${leader.player}, ${Number(leader.volume).toLocaleString('en-US')})`}. Cells are tinted by
          percentile among qualifiers.
        </p>
        <div className="rk-wrap pb-wrap" onPointerLeave={onHoverEnd}>
          <BoardTable
            pos={pos}
            spec={spec}
            comp={comp}
            rows={ordered}
            shownCount={shown.length}
            ranks={ranks}
            by={by}
            onSort={onSort}
            onFlip={onFlip}
            onOpen={open}
            onHoverRow={onHoverRow}
            onHoverEnd={onHoverEnd}
          />
        </div>
        <div className="pb-foot">
          {!comp.held && (
            <p>
              <b>{footLabel}</b> is the weighted mean of the sub-skill percentiles (weights in each header's tooltip). It
              ranks this season's production inside the position. It is not a projection.
            </p>
          )}
          <p>
            Only qualifiers are ranked. Untinted, unranked rows are under the volume line; their numbers are real, but
            there are too few to place.
          </p>
          <p>
            EPA/rush and Usage are CFBD's, season to date, garbage time included. QB rush yards are the box score's, so
            sacks count against them.
          </p>
          <p>
            Source: {boardMeta.source || 'CollegeFootballData'}.{through != null && ` Season to date through week ${through}.`}{' '}
            Data from{' '}
            <a href="https://collegefootballdata.com" target="_blank" rel="noreferrer">
              CollegeFootballData.com
            </a>
            .
          </p>
        </div>
        {hover && spec && (
          <Preview
            hover={hover}
            spec={spec}
            comp={comp}
            compRank={compRanks.get(hover.row)}
            qualCount={qualifiers.length}
          />
        )}
      </div>
    )
  }

  const counts = volumesQ.status === 'ready' ? qualifierCounts(volumesQ.data, share) : {}

  return (
    <>
      <div className="desk-head">
        <div className="stack stack--sm">
          <span className="eb">College Football{season ? `, ${season}` : ''}</span>
          <h1 className="disp h2">Players</h1>
          {boardMeta && <p className="rk-sub">{sub}</p>}
        </div>
      </div>

      {boardMeta && (
        <div className="panel toolbar">
          <div className="tool">
            <span className="tool-label">Position</span>
            <Seg
              label="Position"
              options={POSITIONS.map((p) => [
                p,
                <span key={p} className="pb-tab">
                  {p}
                  {counts[p] != null && <span className="pb-badge">{counts[p]}</span>}
                </span>,
              ])}
              value={pos}
              onChange={setPos}
            />
          </div>
          <div className="tool">
            <label htmlFor="pl-qual">Qualifier</label>
            <div
              className="pb-qual"
              title={`A player is ranked when his ${volumePhrase(spec)} are at least this share of the position leader's. Below the line his numbers are shown but not ranked or shaded.`}
            >
              <input
                id="pl-qual"
                type="number"
                inputMode="numeric"
                min="0"
                max="100"
                step="5"
                value={qualDraft ?? Math.round(share * 100)}
                onChange={(e) => {
                  // Keep what's typed (even blank) on screen; apply it once it's a valid percent.
                  setQualDraft(e.target.value)
                  const n = Number(e.target.value)
                  if (e.target.value !== '' && Number.isFinite(n) && n >= 0 && n <= 100) setShare(Math.round(n))
                }}
                onBlur={() => setQualDraft(null)}
              />
              <span>% of leader</span>
            </div>
          </div>
          <label className="tool pb-check">
            <input type="checkbox" checked={qualOnly} onChange={(e) => setQualOnly(e.target.checked)} />
            <span>Qualified only</span>
          </label>
          <div className="tool">
            <label htmlFor="pl-conf">Conference</label>
            <select id="pl-conf" value={conf} onChange={(e) => setConf(e.target.value)}>
              <option value="">All conferences</option>
              {conferences.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="tool tool--grow">
            <label htmlFor="pl-search">Search</label>
            <div className="search">
              <IconSearch size={16} />
              <input
                id="pl-search"
                type="search"
                placeholder="Player or team"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {body}

      {playerParam && profileRow && spec && (
        <Profile
          key={rowKey(profileRow)}
          row={profileRow}
          spec={spec}
          comp={comp}
          compRank={compRanks.get(profileRow)}
          qualCount={qualifiers.length}
          season={season}
          metaByTable={metaQ.byTable}
          userId={userId}
          entitled={entitled}
          onClose={close}
        />
      )}
      {profileMissing && (
        <Drawer title="Player not found" onClose={close}>
          <p className="soft">That player isn't on this season's board.</p>
        </Drawer>
      )}
    </>
  )
}

// ---------------------------------------------------------------------
// The full profile (drawer; full screen on phones)
// ---------------------------------------------------------------------

function Drawer({ title, onClose, children, head }) {
  const closeRef = useRef(null)
  const onCloseRef = useRef(onClose)
  useLayoutEffect(() => {
    onCloseRef.current = onClose
  })
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCloseRef.current()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [])
  return (
    <div className="pl-drawer-root" onClick={onClose}>
      <aside className="pl-drawer" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header className="pl-drawer-head">
          {head ?? <h2 className="disp h5">{title}</h2>}
          <button ref={closeRef} type="button" className="pl-close" aria-label="Close" onClick={onClose}>
            <IconClose size={20} />
          </button>
        </header>
        <div className="pl-drawer-body">{children}</div>
      </aside>
    </div>
  )
}

function LineTable({ row, cols, valueKey, pctKey }) {
  return (
    <div className="pl-line-wrap">
      <table className="pl-line">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} scope="col">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {cols.map((c) => {
              const p = c.pct_key ? row[pctKey(c)] : null
              return (
                <td key={c.key} style={tint(p)}>
                  {fmt(row[valueKey(c)], c.format)}
                </td>
              )
            })}
          </tr>
          <tr className="pl-line-pct">
            {cols.map((c) => {
              const p = c.pct_key ? row[pctKey(c)] : null
              return <td key={c.key}>{p == null ? '' : Math.round(p)}</td>
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

const SHARE = {
  QB: ['share_att', 'attempts'],
  RB: ['share_rush', 'carries'],
  WR: ['share_tgt', 'targets'],
  TE: ['share_tgt', 'targets'],
}

function UsageChart({ games, pos, teamWeeks }) {
  const [key] = SHARE[pos]
  const pts = games.filter((g) => g[key] != null)
  if (pts.length < 2) return <p className="pl-muted">Not enough games with team totals to draw usage.</p>

  const weeks = games.map((g) => g.week).filter((w) => w != null)
  const lo = Math.min(...weeks)
  const hi = Math.max(...weeks)
  // A week the team played with no line for him is a gap (DNP or no stat): the line breaks.
  // A week the team didn't play is a bye: nothing drawn, no break. Without the team's
  // schedule, every missing week counts as a gap.
  const played = teamWeeks ? new Set(teamWeeks.map(Number)) : null
  const segs = []
  const gaps = []
  let cur = []
  const cut = () => {
    if (cur.length) segs.push(cur)
    cur = []
  }
  for (let w = lo; w <= hi; w++) {
    const gs = games.filter((g) => g.week === w)
    if (gs.length) {
      for (const g of gs) {
        if (g[key] != null) cur.push(g)
        else cut()
      }
    } else if (!played || played.has(w)) {
      gaps.push(w)
      cut()
    }
  }
  cut()

  const W = 560
  const H = 176
  const L = 40
  const R = 40
  const T = 24
  const B = 44
  const x = (w) => L + ((w - lo) / Math.max(1, hi - lo)) * (W - L - R)
  const max = Math.max(0.2, ...pts.map((g) => Number(g[key]))) * 1.08
  const y = (v) => T + (1 - Number(v) / max) * (H - T - B)
  const base = H - B

  return (
    <svg className="pl-usage" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Share of team ${SHARE[pos][1]} by week`}>
      <line x1={L} x2={W - R} y1={base} y2={base} className="axis" />
      {segs.map((s, i) => (
        <polyline key={i} className="line" points={s.map((g) => `${x(g.week)},${y(g[key])}`).join(' ')} />
      ))}
      {gaps.map((w) => (
        <g key={`gap${w}`} className="gap">
          <text x={x(w)} y={base - 6} textAnchor="middle">
            –
          </text>
          <text x={x(w)} y={base + 16} textAnchor="middle" className="wk">
            W{w}
          </text>
          <text x={x(w)} y={base + 32} textAnchor="middle" className="opp">
            no line
          </text>
        </g>
      ))}
      {pts.map((g) => (
        <g key={g.game_id}>
          <circle cx={x(g.week)} cy={y(g[key])} r="3.5" className="dot" />
          <text x={x(g.week)} y={y(g[key]) - 9} textAnchor="middle" className="val">
            {Math.round(Number(g[key]) * 100)}
          </text>
          <text x={x(g.week)} y={base + 16} textAnchor="middle" className="wk">
            W{g.week}
          </text>
          <text x={x(g.week)} y={base + 32} textAnchor="middle" className="opp">
            {(g.opponent ?? '').length > 9 ? `${g.opponent.slice(0, 8)}…` : g.opponent}
          </text>
        </g>
      ))}
    </svg>
  )
}

const SIDES = ['left', 'middle', 'right']

function ZoneGrid({ zones, pos, minZone }) {
  const role = pos === 'QB' ? 'passer' : 'target'
  const unit = pos === 'QB' ? 'att' : 'tgt'
  const noun = pos === 'QB' ? 'throws' : 'targets'
  const mine = zones.filter((z) => z.role === role)
  if (mine.length === 0) return <p className="pl-muted">No charted {noun} this season.</p>
  const at = (depth, side) => mine.find((z) => z.depth === depth && z.side === side)
  const total = mine.find((z) => z.role_total != null)?.role_total
  const unl = mine.find((z) => z.unlabelled != null)?.unlabelled ?? 0
  return (
    <>
      <div className="pl-zones">
        {['deep', 'short'].map((d) =>
          SIDES.map((s) => {
            const z = at(d, s)
            const thin = !!z?.thin
            const style = z && !thin && z.epa != null ? tint(Math.max(0, Math.min(100, 50 + Number(z.epa) * 60))) : undefined
            return (
              <div
                key={`${d}-${s}`}
                className={`pl-zone${thin ? ' thin' : ''}${z ? '' : ' none'}`}
                style={style}
                title={thin ? `Under ${minZone} ${noun}: too few to read` : undefined}
              >
                <span className="pl-zone-l">
                  {d} {s}
                </span>
                {z ? (
                  <>
                    <b>{signed(z.epa, 2)}</b>
                    <span>
                      {z.share == null ? '—' : `${Math.round(Number(z.share) * 100)}%`} · {z.n ?? 0} {unit}
                    </span>
                    <span>{z.cmp_pct == null ? '—' : `${Math.round(Number(z.cmp_pct) * 100)}%`} cmp</span>
                  </>
                ) : (
                  <span className="pl-muted">none</span>
                )}
              </div>
            )
          }),
        )}
      </div>
      <p className="pl-note">
        Line of scrimmage below the short row · EPA per {pos === 'QB' ? 'throw' : 'target'} ·{' '}
        {unl > 0 ? `${unl} of ${total ?? '—'} without a location in CFBD's feed` : `${total ?? '—'} charted`}
      </p>
    </>
  )
}

const PROJ = {
  QB: [
    ['pass_attempts', 'Att'],
    ['completions', 'Cmp'],
    ['pass_yards', 'Pass yds'],
    ['pass_tds', 'Pass TD'],
    ['rush_yards', 'Rush yds'],
  ],
  RB: [
    ['rush_attempts', 'Car'],
    ['rush_yards', 'Rush yds'],
    ['rush_tds', 'Rush TD'],
    ['receptions', 'Rec'],
    ['receiving_yards', 'Rec yds'],
  ],
  WR: [
    ['receptions', 'Rec'],
    ['receiving_yards', 'Rec yds'],
    ['receiving_tds', 'Rec TD'],
  ],
  TE: [
    ['receptions', 'Rec'],
    ['receiving_yards', 'Rec yds'],
    ['receiving_tds', 'Rec TD'],
  ],
}

const etTime = (ts) =>
  ts
    ? new Date(ts).toLocaleString('en-US', {
        timeZone: 'America/New_York',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }) + ' ET'
    : null

function ThisWeek({ entitled, weekQ, pos, weekMeta }) {
  if (!entitled) {
    return (
      <div className="pl-locked">
        <span className="icon-circle">
          <IconLock size={18} />
        </span>
        <div>
          <strong>Projections are for subscribers</strong>
          <p className="pl-muted">This week's projection is part of the Player Projections package.</p>
        </div>
        <Link className="btn btn-ghost btn-sm" to="/sports/ncaaf#packages">
          See packages
        </Link>
      </div>
    )
  }
  if (weekQ.status === 'loading' || weekQ.status === 'idle') return <SectionLoader what="this week's projection" />
  if (weekQ.status === 'error') return <SectionError what="this week's projection" onRetry={weekQ.retry} />
  const rows = [...weekQ.data].sort((a, b) => String(a.game_date ?? '').localeCompare(String(b.game_date ?? '')))
  if (rows.length === 0) return <p className="pl-muted">No projection for him this week yet.</p>
  const cols = PROJ[pos] ?? []
  return (
    <div className="pl-proj">
      {rows.map((p) => (
        <div key={`${p.week}:${p.game_id}`} className="pl-proj-game">
          <div className="pl-proj-title">
            <strong>Week {p.week ?? weekMeta?.week} projection</strong>
            {(p.as_of || weekMeta?.as_of) && <span className="pl-muted"> as of {etTime(p.as_of ?? weekMeta.as_of)}</span>}
            {rows.length > 1 && p.game_date && <span className="pl-muted"> · {longDate(p.game_date)}</span>}
          </div>
          <div className="pl-pv-stats pl-proj-stats">
            {cols.map(([k, lab]) => (
              <span key={k}>
                <small>{lab}</small>
                <b>{dec1(p[k])}</b>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function GameLog({ games, pos }) {
  const opp = (g) => `${g.home ? 'vs' : '@'} ${g.opponent ?? '—'}`
  const n = (v) => (v == null ? '—' : v)
  return (
    <div className="pl-line-wrap">
      <table className="pl-line pl-log">
        <thead>
          {pos === 'QB' ? (
            <tr>
              <th className="l">Wk</th>
              <th className="l">Opp</th>
              <th>C/A</th>
              <th>Yds</th>
              <th>TD</th>
              <th>INT</th>
              <th>Car</th>
              <th>Rush</th>
              <th>Rush TD</th>
            </tr>
          ) : (
            <tr>
              <th className="l">Wk</th>
              <th className="l">Opp</th>
              <th>Car</th>
              <th>Rush</th>
              <th>Tgt</th>
              <th>Rec</th>
              <th>Yds</th>
              <th>TD</th>
            </tr>
          )}
        </thead>
        <tbody>
          {games.map((g) =>
            pos === 'QB' ? (
              <tr key={g.game_id}>
                <td className="l">{n(g.week)}</td>
                <td className="l">{opp(g)}</td>
                <td>
                  {n(g.pass_comp)}/{n(g.pass_att)}
                </td>
                <td>{n(g.pass_yds)}</td>
                <td>{n(g.pass_td)}</td>
                <td>{n(g.pass_int)}</td>
                <td>{n(g.rush_att)}</td>
                <td>{n(g.rush_yds)}</td>
                <td>{n(g.rush_td)}</td>
              </tr>
            ) : (
              <tr key={g.game_id}>
                <td className="l">{n(g.week)}</td>
                <td className="l">{opp(g)}</td>
                <td>{n(g.rush_att)}</td>
                <td>{n(g.rush_yds)}</td>
                <td>{n(g.targets)}</td>
                <td>{n(g.rec)}</td>
                <td>{n(g.rec_yds)}</td>
                <td>{g.rush_td == null && g.rec_td == null ? '—' : (g.rush_td ?? 0) + (g.rec_td ?? 0)}</td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}

function OnPaper({ row }) {
  const home = [row.home_city, row.home_state].filter(Boolean).join(', ')
  const country = row.home_country && row.home_country !== 'USA' ? row.home_country : null
  const from = [home, country].filter(Boolean).join(', ')
  const bio = bioLine(row, { slot: false })
  const transfer = row.portal_origin
    ? [
        `from ${row.portal_origin}${row.portal_date ? `, ${longDate(row.portal_date)}` : ''}`,
        row.portal_stars ? `${stars(row.portal_stars)} in the portal` : null,
        row.portal_rating != null ? fmt(row.portal_rating, 'dec2') : null,
        row.portal_eligibility || null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null
  const depth = row.role_slot
    ? `${row.role_slot}${row.role_depth != null ? `, ${ordinal(row.role_depth)} on the depth chart` : ''}${
        row.role_week != null ? ` (week ${row.role_week})` : ''
      }${row.is_transfer ? ' · transfer' : ''}${row.is_redshirt ? ' · redshirt' : ''}${
        row.is_true_freshman ? ' · true freshman' : ''
      }`
    : null
  const hasRecruit = row.recruit_year != null || row.recruit_stars != null || row.recruit_rating != null
  const recruit = hasRecruit
    ? [
        [
          stars(row.recruit_stars),
          row.recruit_year,
          row.recruit_type && row.recruit_type !== 'HighSchool' ? row.recruit_type : null,
          row.recruit_position,
        ]
          .filter(Boolean)
          .join(' '),
        row.recruit_rating != null ? Number(row.recruit_rating).toFixed(4) : null,
        row.recruit_ranking != null ? `#${row.recruit_ranking} nationally` : null,
        row.recruit_school || null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  return (
    <dl className="pl-paper">
      {from && (
        <>
          <dt>From</dt>
          <dd>{from}</dd>
        </>
      )}
      {bio && (
        <>
          <dt>Listed</dt>
          <dd>{bio}</dd>
        </>
      )}
      {row.jersey != null && (
        <>
          <dt>Jersey</dt>
          <dd>#{row.jersey}</dd>
        </>
      )}
      {transfer ? (
        <>
          <dt>Transfer</dt>
          <dd>{transfer}</dd>
        </>
      ) : (
        row.from_team && (
          <>
            <dt>Last season</dt>
            <dd>{row.from_team}</dd>
          </>
        )
      )}
      {depth && (
        <>
          <dt>Depth chart</dt>
          <dd>{depth}</dd>
        </>
      )}
      <dt>Recruiting</dt>
      {recruit ? <dd>{recruit}</dd> : <dd className="pl-muted">No recruiting record found</dd>}
    </dl>
  )
}

function Section({ title, children }) {
  return (
    <section className="pl-sec">
      <h3 className="pl-sec-h">{title}</h3>
      {children}
    </section>
  )
}

function Profile({ row, spec, comp, compRank, qualCount, season, metaByTable, userId, entitled, onClose }) {
  const pos = row.position_group
  const gamesQ = useGameLines(userId, season, row.player_id)
  const zonesQ = useZones(userId, season, row.player_id)
  const weekQ = usePlayerWeek(userId, season, row.player_id, entitled)

  const games = useMemo(
    () => (gamesQ.data ?? []).filter((g) => g.team === row.team).sort((a, b) => (a.week ?? 0) - (b.week ?? 0)),
    [gamesQ.data, row.team],
  )
  const teamWeeks = metaByTable?.player_game_line?.extra?.team_weeks?.[row.team] ?? null
  const minZone = metaByTable?.player_zone?.extra?.min_zone ?? 10
  const weekMeta = metaByTable?.player_week?.extra ?? null
  // Last season's percentiles are published at the Command Center's line, not re-placed.
  const lastShare = metaByTable?.player_board?.extra?.qualify?.share_of_leader ?? null

  const bio = bioLine(row)
  const q = !!row.qualified
  const score = row[comp.column]
  const bw = q ? bestWorst(row, spec.skills) : null
  const lastTitle = row.last_team
    ? [
        `Last season · ${row.last_team}`,
        row.last_composite != null && !comp.held ? `score ${dec1(row.last_composite)}` : 'not ranked',
        row.last_position && row.last_position !== pos ? `as a ${row.last_position}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null

  const head = (
    <div className="pl-head">
      <Avatar name={row.player} pos={pos} size="lg" />
      <div>
        <h2 className="disp h4 pl-head-name">{row.player}</h2>
        <p className="pl-head-sub">
          {pos} · {row.team}
          {bio ? ` · ${bio}` : ''}
          {row.role_unit === 'reserves' && <span className="pl-reserve"> · on the reserves list</span>}
        </p>
      </div>
    </div>
  )

  return (
    <Drawer title={row.player} onClose={onClose} head={head}>
      {!comp.held && (
        <section className="pl-score">
          {q && score != null ? (
            <>
              <div className="pl-score-top">
                <span className="pl-score-big">{dec1(score)}</span>
                <span className="pl-score-lab">
                  {comp.label}
                  <span className="pl-score-rank">
                    #{compRank ?? '—'} of {qualCount} qualified {pos}s
                  </span>
                </span>
              </div>
              <div className="pl-pbar" aria-hidden="true">
                <i style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
              </div>
            </>
          ) : (
            <p className="pl-muted">
              Not ranked: under the volume line ({row.volume ?? '—'} {volumePhrase(spec)})
            </p>
          )}
        </section>
      )}

      {q && <SkillStrip row={row} skills={spec.skills} />}
      {bw && (
        <p className="pl-read">
          Best at <b>{bw.best.label.toLowerCase()}</b> ({ordinal(bw.best.v)} percentile), weakest at{' '}
          <b>{bw.worst.label.toLowerCase()}</b> ({ordinal(bw.worst.v)}), each placed among this season's {qualCount}{' '}
          qualified {pos}s.
        </p>
      )}

      <Section title={`This season · ${row.team}`}>
        <LineTable row={row} cols={spec.columns} valueKey={(c) => c.key} pctKey={(c) => c.pct_key} />
        <p className="pl-note">Second row: percentile among qualifiers at the position.</p>
      </Section>

      {lastTitle && (
        <Section title={lastTitle}>
          <LineTable
            row={row}
            cols={spec.columns}
            valueKey={(c) => c.last_key ?? `last_${c.key}`}
            pctKey={(c) => `last_pct_${c.key}`}
          />
          {lastShare != null && (
            <p className="pl-note">
              Second row: percentile among last season's qualifiers at {Math.round(lastShare * 100)}% of the leader.
            </p>
          )}
        </Section>
      )}

      <Section title={`Usage by game · share of team ${SHARE[pos]?.[1] ?? 'volume'}`}>
        {gamesQ.status === 'error' ? (
          <SectionError what="the game log" onRetry={gamesQ.retry} />
        ) : gamesQ.status !== 'ready' ? (
          <SectionLoader what="the game log" />
        ) : (
          <UsageChart games={games} pos={pos} teamWeeks={teamWeeks} />
        )}
      </Section>

      <Section title={`Where the ball goes · ${pos === 'QB' ? 'his throws' : 'his targets'}`}>
        {zonesQ.status === 'error' ? (
          <SectionError what="the throw zones" onRetry={zonesQ.retry} />
        ) : zonesQ.status !== 'ready' ? (
          <SectionLoader what="the throw zones" />
        ) : (
          <ZoneGrid zones={zonesQ.data} pos={pos} minZone={minZone} />
        )}
      </Section>

      <Section title="This week">
        <ThisWeek entitled={entitled} weekQ={weekQ} pos={pos} weekMeta={weekMeta} />
      </Section>

      <Section title="On paper">
        <OnPaper row={row} />
      </Section>

      <Section title="Game log">
        {gamesQ.status === 'error' ? (
          <SectionError what="the game log" onRetry={gamesQ.retry} />
        ) : gamesQ.status !== 'ready' ? (
          <SectionLoader what="the game log" />
        ) : games.length === 0 ? (
          <p className="pl-muted">No games logged for {row.team}.</p>
        ) : (
          <GameLog games={games} pos={pos} />
        )}
      </Section>
    </Drawer>
  )
}

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------

function SignInGate() {
  return (
    <>
      <div className="desk-head">
        <div className="stack stack--sm">
          <span className="eb">College Football</span>
          <h1 className="disp h2">Players</h1>
        </div>
      </div>
      <div className="empty">
        <span className="icon-circle">
          <IconLock size={22} />
        </span>
        <h2 className="disp h5">Sign in to see the player board</h2>
        <p className="soft measure">
          Every FBS quarterback, running back, receiver and tight end, ranked inside his position. Free with a Rogue
          Analytics account.
        </p>
        <DiscordButton />
      </div>
    </>
  )
}

export default function Players() {
  const { user, authLoading, accountLoading, hasTier } = useAuth()
  const entitled = !!user && !accountLoading && hasTier('player_projections')
  return (
    <div className="desk pl-page">
      <div className="wrap wrap--wide desk-body">
        {authLoading ? <Loading /> : user ? <Board userId={user.id} entitled={entitled} /> : <SignInGate />}
      </div>
    </div>
  )
}
