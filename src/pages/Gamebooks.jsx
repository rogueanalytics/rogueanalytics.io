import SubNav from '../components/SubNav.jsx'
import { ArrowLink, DiscordButton } from '../components/Buttons.jsx'
import { IconLock } from '../components/Icons.jsx'
import { useGamebooks } from '../lib/data.js'

const CONTENTS = ['Team metrics', 'Advanced analysis', 'Depth charts', 'Injury report', 'Roster and starters']

const matchup = (g) =>
  g?.away ? (
    <>
      {g.awayRank ? `#${g.awayRank} ` : ''}
      {g.away} <span className="dim-500">@</span> {g.homeRank ? `#${g.homeRank} ` : ''}
      {g.home}
    </>
  ) : (
    <>
      [Away Team] <span className="dim-500">@</span> [Home Team]
    </>
  )

export default function Gamebooks() {
  const { freePreview, days, week } = useGamebooks()
  const hasGames = days.length > 0

  return (
    <div className="desk">
      <SubNav />
      <div className="wrap desk-body">
        <div className="desk-head">
          <div className="stack stack--sm">
            <span className="eb">NCAAF Gamebooks{week ? `, week ${week}` : ''}</span>
            <h1 className="disp h2">Gamebooks</h1>
          </div>
          <p className="soft measure-sm">A data-driven viewing guide for every game on the slate.</p>
        </div>

        {!hasGames && (
          <div className="empty">
            <h2 className="disp h5">This week's Gamebooks aren't posted yet.</h2>
            <p className="soft measure">Matchups will appear here once they're published.</p>
          </div>
        )}

        {freePreview && (
          <div className="preview-card">
            <div className="stack">
              <span className="tag tag-live">Free preview: game of the week</span>
              <h2 className="disp h4">{matchup(freePreview)}</h2>
              <span className="mono small soft">{freePreview.kickoff || '[Day], [kickoff] ET'}</span>
              <div className="chips">
                {CONTENTS.map((c) => (
                  <span key={c} className="chip">
                    {c}
                  </span>
                ))}
              </div>
            </div>
            <ArrowLink to="/sports/ncaaf/gamebooks">Open free Gamebook</ArrowLink>
          </div>
        )}

        {hasGames && (
          <>
            <div className="list-head">
              <h2 className="disp h5">All matchups</h2>
              <DiscordButton className="btn-sm">Log in with Discord to unlock</DiscordButton>
            </div>
            <div className="panel games">
              {days.map((d) => (
                <div key={d.day}>
                  <div className="day">{d.day}</div>
                  {d.games.map((g) => (
                    <div key={g.id} className="game-row">
                      <span className="game-name">{matchup(g)}</span>
                      <span className="game-meta">
                        <span className="mono small dim">{g.kickoff || '[Kickoff] ET'}</span>
                        <span className="locked-tag">
                          <IconLock size={14} />
                          Locked
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
