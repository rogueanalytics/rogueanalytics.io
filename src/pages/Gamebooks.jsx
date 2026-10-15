import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import SubNav from '../components/SubNav.jsx'
import { SignInButton } from '../components/Buttons.jsx'
import { IconLock } from '../components/Icons.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { useGamebookSlate, useRanks } from '../lib/gamebook.js'
import { kickoffText, lineNum, lineText, prob } from '../lib/gamebookFormat.js'
import { teamLogo } from '../lib/teams.js'
import { usePageMeta } from '../lib/usePageMeta.js'
import '../styles/gamebook.css'

// The Game Books landing page: every published game of the week as a card, in kickoff
// order, grouped by day. Each card shows the matchup, ranks, records and the consensus
// spread / total / moneyline, all copied from the published book; a card opens its book.

const ET = 'America/New_York'
const dayOf = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { timeZone: ET, weekday: 'long', month: 'long', day: 'numeric' }) : 'Date TBA'
const timeOf = (iso) => kickoffText(iso).split(' · ')[1] ?? 'Time TBA'
const norm = (s) => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function TeamLine({ name, abbr, rank, record, conference, winProb, side }) {
  const logo = teamLogo(name, 64)
  return (
    <div className="gbl-team">
      {logo ? <img src={logo} alt="" width="32" height="32" /> : <span className="gbl-logo-none">{(abbr || name)[0]}</span>}
      <span className="gbl-name">
        {rank && <span className="gbl-rank">#{rank}</span>}
        <span className="gbl-school">{name}</span>
        <span className="gbl-meta">
          {[record, conference].filter(Boolean).join(' · ')}
          <span className="sr-only">{side === 'home' ? ' (home)' : ' (away)'}</span>
        </span>
      </span>
      <span className="gbl-ml" title="Market win probability, vig removed">
        {prob(winProb)}
      </span>
    </div>
  )
}

function GameCard({ g, ranks, open, to }) {
  const r = ranks[g.game_id] || {}
  return (
    <Link to={to} className="gbl-card" aria-label={`${g.away_team} ${g.neutral_site ? 'vs' : 'at'} ${g.home_team} Game Book`}>
      <div className="gbl-top">
        <span className="gbl-time">{timeOf(g.kickoff)}</span>
        <span className="gbl-venue">{g.venue || ''}</span>
      </div>
      <div className="gbl-cols">
        {g.free_preview ? (
          <span className="gbl-flag gbl-flag--free">Free preview</span>
        ) : !open ? (
          <span className="gbl-flag">
            <IconLock size={12} /> Members
          </span>
        ) : (
          <span />
        )}
        <span className="gbl-ml-h" aria-hidden="true">Implied win prob.</span>
      </div>
      <TeamLine name={g.away_team} abbr={g.away_abbr} rank={r.away} record={g.away_record} conference={g.away_conference} winProb={g.away_novig_prob} side="away" />
      <span className="gbl-at">{g.neutral_site ? 'vs' : 'at'}</span>
      <TeamLine name={g.home_team} abbr={g.home_abbr} rank={r.home} record={g.home_record} conference={g.home_conference} winProb={g.home_novig_prob} side="home" />
      <dl className="gbl-market">
        <div>
          <dt>Spread</dt>
          <dd>{lineText(g.spread, g.home_abbr || g.home_team, g.away_abbr || g.away_team)}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{g.total != null ? lineNum(g.total) : '—'}</dd>
        </div>
      </dl>
    </Link>
  )
}

export default function Gamebooks() {
  usePageMeta('College Football Game Books | Rogue Analytics', 'Matchup research for every game on the slate.')
  const q = useGamebookSlate()
  const { user, hasTier } = useAuth()
  const { search } = useLocation()
  const entitled = hasTier('gamebooks')
  const ranks = useRanks(q.season, q.week)
  const [team, setTeam] = useState('')
  const [conf, setConf] = useState('')

  const games = useMemo(() => (q.status === 'ready' ? q.games : []), [q])
  const conferences = useMemo(
    () => [...new Set(games.flatMap((g) => [g.away_conference, g.home_conference]).filter(Boolean))].sort(),
    [games],
  )
  const shown = useMemo(() => {
    const t = norm(team.trim())
    return games.filter(
      (g) =>
        (!conf || g.away_conference === conf || g.home_conference === conf) &&
        (!t || norm(g.away_team).includes(t) || norm(g.home_team).includes(t) ||
          norm(g.away_abbr) === t || norm(g.home_abbr) === t),
    )
  }, [games, team, conf])
  const days = []
  for (const g of shown) {
    const d = dayOf(g.kickoff)
    if (!days.length || days[days.length - 1].day !== d) days.push({ day: d, games: [] })
    days[days.length - 1].games.push(g)
  }
  // Keep ?preview=sample on the way into a book in local dev.
  const keep = import.meta.env.DEV && search.includes('preview=') ? search : ''
  const bookPath = (g) => `/college-football/gamebooks/${g.game_id}${keep}`

  return (
    <div className="desk gb-page">
      <SubNav />
      <div className="wrap desk-body">
        <div className="desk-head">
          <div className="stack stack--sm">
            <span className="eb">College Football{q.week ? ` · ${q.season} · Week ${q.week}` : ''}</span>
            <h1 className="disp h2">Game Books</h1>
          </div>
          <p className="soft measure-sm">
            Matchup research for every game on the slate: the market, Rogue's projection, and the stats behind both.
          </p>
        </div>

        {games.length > 0 && (
          <div className="gbl-tools" role="search">
            <div className="tool tool--grow">
              <label htmlFor="gbl-team">Search team</label>
              <input id="gbl-team" type="search" value={team} placeholder="e.g. Alabama" onChange={(e) => setTeam(e.target.value)} />
            </div>
            <div className="tool">
              <label htmlFor="gbl-conf">Conference</label>
              <select id="gbl-conf" value={conf} onChange={(e) => setConf(e.target.value)}>
                <option value="">All conferences</option>
                {conferences.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <span className="gbl-count mono small" aria-live="polite">
              {shown.length} of {games.length} games
            </span>
            {!user && <SignInButton className="btn-sm" />}
          </div>
        )}

        {q.status === 'loading' && (
          <div className="gbl-grid" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="gbl-card gbl-card--skel">
                <span className="skel" style={{ width: '40%' }} />
                <span className="skel" style={{ width: '80%' }} />
                <span className="skel" style={{ width: '70%' }} />
              </div>
            ))}
          </div>
        )}

        {q.status === 'error' && (
          <div className="empty">
            <h2 className="disp h5">Game Books didn't load.</h2>
            <p className="soft measure">Something went wrong on our side. Try again in a minute.</p>
          </div>
        )}

        {q.status === 'ready' && !games.length && (
          <div className="empty">
            <h2 className="disp h5">This week's Game Books aren't posted yet.</h2>
            <p className="soft measure">Matchups appear here once they're published.</p>
          </div>
        )}

        {games.length > 0 && !shown.length && (
          <div className="empty">
            <h2 className="disp h5">No games match.</h2>
            <p className="soft measure">Try another team name or conference.</p>
          </div>
        )}

        {days.map((d) => (
          <section key={d.day} className="gbl-day" aria-label={d.day}>
            <h2 className="gbl-day-h">{d.day}</h2>
            <div className="gbl-grid">
              {d.games.map((g) => (
                <GameCard key={g.game_id} g={g} ranks={ranks} open={entitled || g.free_preview} to={bookPath(g)} />
              ))}
            </div>
          </section>
        ))}

        {games.length > 0 && (
          <p className="gb-note">
            Consensus lines are the average across sportsbooks via CFBD; the spread is named from the favorite. Implied
            win probability is the consensus moneyline converted to a probability with the books' margin removed
            (moneylines are in each Game Book). Ranks: AP / CFP via ESPN. Times Eastern.
          </p>
        )}
      </div>
    </div>
  )
}
