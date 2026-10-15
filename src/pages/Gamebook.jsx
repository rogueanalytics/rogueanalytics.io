import { Link, useParams } from 'react-router-dom'
import SubNav from '../components/SubNav.jsx'
import { SignInButton } from '../components/Buttons.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { useGamebook, useRanks } from '../lib/gamebook.js'
import { usePageMeta } from '../lib/usePageMeta.js'
import { track } from '../lib/track.js'
import {
  advantage, american, barWidth, better, fmt, kickedOff, kickoffText, lineNum, lineText, pdfTitle, prob,
  probPoints, rankText, recordText, signed, spreadGapText, stamp, totalGapText, zoneLabel,
} from '../lib/gamebookFormat.js'
import '../styles/gamebook.css'

// The Game Book: one game, six sections, general to specific. Every number comes from the
// published payload (Command Center gamebook.py); the printed PDF is this same page under
// the print stylesheet, so web and PDF cannot disagree.

const SECTIONS = [
  ['overview', 'Overview'],
  ['market', 'Market vs Rogue'],
  ['profile', 'Team profile'],
  ['key-plays', 'Key plays'],
  ['advanced', 'Advanced matchups'],
  ['summary', 'Matchup summary'],
]

function TeamMark({ team, size = 56 }) {
  return (
    <span className="gb-mark" style={{ width: size, height: size }}>
      {team.logo_dark && <img className="gb-screen-only" src={team.logo_dark} alt="" width={size} height={size} />}
      {team.logo && <img className={team.logo_dark ? 'gb-print-only' : ''} src={team.logo} alt="" width={size} height={size} />}
      {!team.logo && !team.logo_dark && <span className="gb-mark-none">{team.abbreviation || team.school[0]}</span>}
    </span>
  )
}

function Section({ id, n, title, lede, children }) {
  return (
    <section id={id} className="gb-section" aria-labelledby={`${id}-h`}>
      <header className="gb-sh">
        <span className="gb-sn">{String(n).padStart(2, '0')}</span>
        <div>
          <h2 id={`${id}-h`} className="gb-h2">{title}</h2>
          {lede && <p className="gb-lede">{lede}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

function Note({ children }) {
  return <p className="gb-note">{children}</p>
}

// Percentile bar with its text: the bar is decoration, the rank says it.
function Pct({ cell, flip = false }) {
  if (!cell || cell.pct == null) return <span className="gb-bar gb-bar--none" aria-hidden="true" />
  return (
    <span className={`gb-bar${flip ? ' gb-bar--flip' : ''}`} aria-hidden="true">
      <span style={{ width: barWidth(cell) }} />
    </span>
  )
}

function Val({ cell, format, mark }) {
  return (
    <span className={`gb-val${mark ? ' gb-val--best' : ''}`}>
      <b>{fmt(cell?.value, format)}</b>
      {mark && <span className="gb-best" aria-label="better of the two">▲</span>}
      <small>{rankText(cell)}</small>
    </span>
  )
}

// ---------------------------------------------------------------- 01 overview
function Overview({ book }) {
  const { game: g, market: m, model: r, quality: qa } = book
  const away = g.away.school
  const home = g.home.school
  const rows = Object.fromEntries(book.comparison.map((c) => [c.key, c]))
  const wpFav = r && (r.home_win_prob >= r.away_win_prob ? 'home' : 'away')
  return (
    <Section id="overview" n={1} title="Game overview">
      <div className="gb-glance">
        <div className="gb-tile">
          <span className="gb-k">Consensus spread</span>
          <span className="gb-v">{lineText(m.spread, home, away)}</span>
          <span className="gb-s">Total {lineNum(m.total)}</span>
        </div>
        <div className="gb-tile gb-tile--rogue">
          <span className="gb-k">Rogue projection</span>
          <span className="gb-v">{r ? lineText(r.spread, home, away) : '—'}</span>
          <span className="gb-s">Total {fmt(r?.total, 'dec1')}</span>
        </div>
        <div className="gb-tile gb-tile--rogue">
          <span className="gb-k">Rogue projected score</span>
          <span className="gb-v gb-v--score">
            {away} {fmt(r?.away_points, 'dec1')} <span className="gb-dim">·</span> {home} {fmt(r?.home_points, 'dec1')}
          </span>
          <span className="gb-s">
            Win probability: {away} {prob(r?.away_win_prob)} · {home} {prob(r?.home_win_prob)}
          </span>
        </div>
        <div className="gb-tile">
          <span className="gb-k">Market vs Rogue</span>
          <span className="gb-s gb-s--lg">Spread: {spreadGapText(rows.spread?.difference, home, away)}</span>
          <span className="gb-s gb-s--lg">Total: {totalGapText(rows.total?.difference)}</span>
          {wpFav && (
            <span className="gb-s gb-s--lg">
              {wpFav === 'home' ? home : away} win: {prob(rows[`${wpFav}_win`]?.rogue)} Rogue vs{' '}
              {prob(rows[`${wpFav}_win`]?.market)} market (no-vig)
            </span>
          )}
        </div>
      </div>

      {book.summary.thesis.length > 0 && (
        <div className="gb-thesis">
          <h3 className="gb-h3">Matchup thesis</h3>
          <ol>
            {book.summary.thesis.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </div>
      )}

      {r && !r.trustworthy && (
        <p className="gb-alert" role="note">
          <b>Low-confidence projection.</b> The model's inputs for this game are thin or incomplete this week.
        </p>
      )}
      {qa.notes.length > 0 && (
        <div className="gb-dq" role="note">
          <span className="gb-k">Data notes</span>
          <ul>
            {qa.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  )
}

// ---------------------------------------------------------------- 02 market vs Rogue
function MarketVsRogue({ book }) {
  const { game: g, market: m, model: r } = book
  const away = g.away.school
  const home = g.home.school
  const rows = Object.fromEntries(book.comparison.map((c) => [c.key, c]))
  const ml = (side) => {
    const c = rows[`${side}_win`]
    const team = side === 'home' ? home : away
    return (
      <tr key={side}>
        <th scope="row">
          Moneyline: {team}
          <small>Win probability</small>
        </th>
        <td data-label="Consensus">
          {c.market_price != null ? american(c.market_price) : '—'}
          <small>
            {prob(c.market)} no-vig · {prob(m[`${side}_implied_prob`])} raw
          </small>
        </td>
        <td data-label="Rogue projection">
          {prob(c.rogue)}
          <small>Fair odds {american(c.rogue_price)}</small>
        </td>
        <td data-label="Difference" className="gb-diff">{probPoints(c.difference)}</td>
      </tr>
    )
  }
  const pts = (key, label, sub, formatSide = lineNum) => {
    const c = rows[key]
    return (
      <tr key={key}>
        <th scope="row">
          {label}
          {sub && <small>{sub}</small>}
        </th>
        <td data-label="Consensus">{formatSide(c.market)}</td>
        <td data-label="Rogue projection">{formatSide(c.rogue)}</td>
        <td data-label="Difference" className="gb-diff">{c.difference == null ? '—' : `${signed(c.difference)} pts`}</td>
      </tr>
    )
  }
  return (
    <Section
      id="market"
      n={2}
      title="Market vs Rogue"
      lede="The sportsbook consensus beside Rogue's projection. Every difference is Rogue minus the market."
    >
      <div className="gb-table-wrap">
        <table className="gb-table gb-table--market">
          <thead>
            <tr>
              <th scope="col">Market</th>
              <th scope="col">Consensus</th>
              <th scope="col">Rogue projection</th>
              <th scope="col">Difference</th>
            </tr>
          </thead>
          <tbody>
            {pts('spread', 'Spread', `Home line: ${home}`, (v) => lineText(v, home, away))}
            {pts('total', 'Game total')}
            {ml('away')}
            {ml('home')}
            {pts('away_total', `${away} team total`, 'Market: implied from spread and total')}
            {pts('home_total', `${home} team total`, 'Market: implied from spread and total')}
          </tbody>
        </table>
      </div>
      <p className="gb-read">
        Spread difference: {spreadGapText(rows.spread.difference, home, away)}. Total: {totalGapText(rows.total.difference)}.
      </p>
      <div className="gb-method">
        <p>
          <b>Consensus.</b> {m.n_books ? `${m.n_books} sportsbook${m.n_books === 1 ? '' : 's'}` : 'No sportsbooks'} via
          CFBD (spread {m.n_spread ?? 0}, total {m.n_total ?? 0}, moneyline {m.n_moneyline ?? 0} quotes), captured{' '}
          {stamp(m.as_of)}. Spreads and totals are averaged across books. Moneylines are averaged as implied
          probabilities, never as American odds; the raw probability still carries the books' margin, and the no-vig
          probability removes it proportionally. Team totals are (total ∓ spread) ÷ 2 from the same consensus.
        </p>
        <p>
          <b>Rogue.</b> Projected scores split Rogue's projected total by its projected margin. The market line is
          never a model input. {r?.margin_sigma ? `Typical miss on the margin: ±${fmt(r.margin_sigma, 'dec1')} pts.` : ''}
        </p>
        <p>
          A difference shows where the model disagrees with the market. It is not a guaranteed outcome or a
          recommendation to bet.
        </p>
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------- 03 team profile
function ProfileTable({ group, away, home }) {
  const cols = [`${away} offense`, `${home} offense`, `${away} defense`, `${home} defense`]
  return (
    <div className="gb-card gb-keep">
      <h3 className="gb-h3">{group.title}</h3>
      <div className="gb-table-wrap">
        <table className="gb-table gb-table--profile">
          <thead>
            <tr>
              <th scope="col">Metric</th>
              <th scope="col" colSpan={2}>Offense</th>
              <th scope="col" colSpan={2}>Defense (allowed)</th>
            </tr>
            <tr className="gb-sub">
              <th scope="col"><span className="sr-only">Metric</span></th>
              <th scope="col">{away}</th>
              <th scope="col">{home}</th>
              <th scope="col">{away}</th>
              <th scope="col">{home}</th>
            </tr>
          </thead>
          <tbody>
            {group.rows.map((row) => {
              const bo = better(row.away.offense, row.home.offense)
              const bd = better(row.away.defense, row.home.defense)
              return (
                <tr key={row.key}>
                  <th scope="row">
                    <span title={row.definition}>{row.label}</span>
                  </th>
                  {[
                    [row.away.offense, bo === 'a'],
                    [row.home.offense, bo === 'b'],
                    [row.away.defense, bd === 'a'],
                    [row.home.defense, bd === 'b'],
                  ].map(([cell, mark], i) => (
                    <td data-label={cols[i]} key={i}>
                      {cell ? (
                        <>
                          <Val cell={cell} format={row.format} mark={mark} />
                          <Pct cell={cell} />
                        </>
                      ) : (
                        <span className="gb-na">n/a</span>
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TeamProfile({ book }) {
  const { profile: p, game: g } = book
  const away = g.away.school
  const home = g.home.school
  if (!p.groups.length)
    return (
      <Section id="profile" n={3} title="Team profile">
        <p className="gb-empty">Season statistics were unavailable when this report was built.</p>
      </Section>
    )
  return (
    <Section
      id="profile"
      n={3}
      title="Team profile"
      lede={`Season-to-date, raw (not opponent-adjusted) through week ${p.as_of.advanced.through_week ?? '—'}. Ranks are among FBS teams; ▲ marks the better of the two teams on each line. Defensive ranks reward allowing less.`}
    >
      {p.ratings.length > 0 && (
        <div className="gb-ratings">
          {p.ratings.map((r) => {
            const b = better(r.away, r.home)
            return (
              <div key={r.key} className="gb-rating">
                <span className="gb-k">{r.label}</span>
                <span>
                  {away} <Val cell={r.away} format="int" mark={b === 'a'} />
                </span>
                <span>
                  {home} <Val cell={r.home} format="int" mark={b === 'b'} />
                </span>
              </div>
            )
          })}
        </div>
      )}
      <div className="gb-stack">
        {p.groups.map((grp) => (
          <ProfileTable key={grp.title} group={grp} away={away} home={home} />
        ))}
      </div>
      <Note>
        Sources: CFBD advanced season stats (garbage time excluded) and box-score stats (garbage time included).
        Hover a metric name for its definition.
      </Note>
    </Section>
  )
}

// ---------------------------------------------------------------- 04 key plays
function VsTable({ rows, offTeam, defTeam, showAdv = true }) {
  return (
    <div className="gb-table-wrap">
      <table className={`gb-table gb-table--vs${showAdv ? '' : ' gb-table--2'}`}>
        <thead>
          <tr>
            <th scope="col">Metric</th>
            <th scope="col">{offTeam} offense</th>
            <th scope="col">{defTeam} defense allows</th>
            {showAdv && <th scope="col">Matchup</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const a = advantage(r.advantage)
            return (
              <tr key={r.label}>
                <th scope="row">
                  <span title={r.definition || undefined}>{r.label}</span>
                </th>
                <td data-label={`${offTeam} offense`}>
                  <Val cell={r.offense} format={r.format} />
                  <Pct cell={r.offense} />
                </td>
                <td data-label={`${defTeam} defense allows`}>
                  <Val cell={r.opponent_defense} format={r.format} />
                  <Pct cell={r.opponent_defense} />
                </td>
                {showAdv && <td data-label="Matchup" className={`gb-adv gb-adv--${a.tone}`}>{r.advantage == null ? '—' : a.short}</td>}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const driverText = (team, unit, driver) =>
  driver === 'efficiency'
    ? `${team}'s ${unit} is built on consistency: its success rate ranks well above its explosiveness.`
    : driver === 'explosive'
      ? `${team}'s ${unit} leans on big plays: its explosiveness ranks well above its success rate.`
      : driver === 'balanced'
        ? `${team}'s ${unit} is balanced between consistency and big plays.`
        : null

function ZoneField({ t, min }) {
  const deep = t.zones.filter((z) => z.zone.startsWith('deep'))
  const short = t.zones.filter((z) => z.zone.startsWith('short'))
  const cell = (z) => {
    const a = advantage(z.advantage)
    return (
      <div key={z.zone} className={`gb-zone${z.thin ? ' gb-zone--thin' : ''} gb-zone--${z.thin ? 'none' : a.tone}`}>
        <span className="gb-zone-name">{zoneLabel(z.zone)}</span>
        <span className="gb-zone-big">{fmt(z.offense.share?.value, 'pct')}</span>
        <span className="gb-zone-k">of {t.team}'s throws · {z.offense.attempts ?? 0} att</span>
        <dl className="gb-zone-dl">
          <dt>Success</dt>
          <dd>
            {fmt(z.offense.success_rate?.value, 'pct')} <span className="gb-dim">vs</span>{' '}
            {fmt(z.opponent_defense.success_rate?.value, 'pct')}
          </dd>
          <dt>Yds/att</dt>
          <dd>
            {fmt(z.offense.yards_per_attempt?.value, 'dec1')} <span className="gb-dim">vs</span>{' '}
            {fmt(z.opponent_defense.yards_per_attempt?.value, 'dec1')}
          </dd>
          <dt>Comp</dt>
          <dd>
            {fmt(z.offense.completion_rate?.value, 'pct')} <span className="gb-dim">vs</span>{' '}
            {fmt(z.opponent_defense.completion_rate?.value, 'pct')}
          </dd>
        </dl>
        <span className="gb-zone-adv">
          {z.thin ? `Small sample (under ${min} att)` : a.label}
        </span>
      </div>
    )
  }
  return (
    <figure className="gb-field gb-keep" aria-label={`${t.team} passing by field zone against ${t.opponent}'s defense`}>
      <div className="gb-field-grid">
        <span className="gb-field-depth">Deep</span>
        {deep.map(cell)}
        <span className="gb-field-depth">Short</span>
        {short.map(cell)}
      </div>
      <div className="gb-field-los">
        <span>Left</span>
        <span>Line of scrimmage · offense value vs {t.opponent} defense allowed</span>
        <span>Right</span>
      </div>
    </figure>
  )
}

function zoneRead(t, min) {
  const ok = t.zones.filter((z) => !z.thin && z.advantage != null)
  const top = [...t.zones].sort((a, b) => (b.offense.share?.value ?? 0) - (a.offense.share?.value ?? 0))[0]
  const best = [...ok].sort((a, b) => b.advantage - a.advantage)[0]
  const worst = [...ok].sort((a, b) => a.advantage - b.advantage)[0]
  const out = []
  if (top?.offense.share)
    out.push(`${t.team} throws ${top.zone} most often (${fmt(top.offense.share.value, 'pct')} of charted throws).`)
  if (best && best.advantage >= 0.25)
    out.push(`Best matchup: ${best.zone}, where ${t.team}'s efficiency outranks what ${t.opponent} allows (${advantage(best.advantage).label.toLowerCase()}).`)
  if (worst && worst !== best && worst.advantage <= -0.25)
    out.push(`Toughest: ${worst.zone}, where ${t.opponent}'s defense holds the edge.`)
  if (t.thin_zones > 0) out.push(`${t.thin_zones} of 6 zones are under ${min} attempts on one side and are not read.`)
  return out
}

function Passing({ kp }) {
  const p = kp.passing
  return (
    <div className="gb-sub-section">
      <h3 className="gb-h3 gb-h3--lg">A. Passing</h3>
      {['away', 'home'].map((side) => {
        const t = p.teams[side]
        const reads = zoneRead(t, p.min_attempts)
        const d = driverText(t.team, 'passing game', t.driver)
        return (
          <article key={side} className="gb-card gb-mu">
            <h4 className="gb-h4">
              {t.team} passing offense <span className="gb-dim">vs</span> {t.opponent} pass defense
            </h4>
            {(reads.length > 0 || d) && (
              <ul className="gb-reads">
                {d && <li>{d}</li>}
                {reads.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            )}
            <div className="gb-two">
              <VsTable rows={t.totals} offTeam={t.team} defTeam={t.opponent} showAdv={false} />
              <ZoneField t={t} min={p.min_attempts} />
            </div>
            <Note>
              {t.charted_attempts} of {t.attempts ?? '—'} attempts charted to a zone. Zone values compare {t.team}'s
              rate with what {t.opponent} allows in the same zone; the label rates efficiency (completion %, yards
              per attempt, success, EPA) by percentile. Dashed zones have under {p.min_attempts} attempts on either
              side.
            </Note>
          </article>
        )
      })}
      <Note>
        Source: CFBD team passing by location (season to date, as of {stamp(p.as_of)}); explosive-pass rate
        from CFBD's per-throw feed. Garbage time included.
      </Note>
    </div>
  )
}

function Rushing({ kp }) {
  const r = kp.rushing
  return (
    <div className="gb-sub-section">
      <h3 className="gb-h3 gb-h3--lg">B. Rushing</h3>
      {['away', 'home'].map((side) => {
        const t = r.teams[side]
        const d = driverText(t.team, 'run game', t.driver)
        return (
          <article key={side} className="gb-card gb-mu">
            <h4 className="gb-h4">
              {t.team} run game <span className="gb-dim">vs</span> {t.opponent} run defense
            </h4>
            {d && (
              <ul className="gb-reads">
                <li>{d}</li>
              </ul>
            )}
            <div className="gb-two">
              <VsTable rows={t.metrics} offTeam={t.team} defTeam={t.opponent} />
              <div className="gb-dirs gb-keep">
                <h5 className="gb-k">By direction</h5>
                <div className="gb-table-wrap">
                  <table className="gb-table gb-table--dirs">
                    <thead>
                      <tr>
                        <th scope="col">Direction</th>
                        <th scope="col">Share</th>
                        <th scope="col">Yds/carry</th>
                        <th scope="col">Success</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.directions.map((x) => (
                        <tr key={x.direction} className={x.thin ? 'gb-thin' : ''}>
                          <th scope="row">
                            {zoneLabel(x.direction)}
                            <small>
                              {x.offense.carries ?? 0} carries{x.thin ? ' · small sample' : ''}
                            </small>
                          </th>
                          <td data-label="Share">
                            {fmt(x.offense.share?.value, 'pct')}
                            <small>faced {fmt(x.opponent_defense.share?.value, 'pct')}</small>
                          </td>
                          <td data-label="Yds/carry">
                            {fmt(x.offense.yards_per_carry?.value, 'dec1')}
                            <small>allows {fmt(x.opponent_defense.yards_per_carry?.value, 'dec1')}</small>
                          </td>
                          <td data-label="Success">
                            {fmt(x.offense.success_rate?.value, 'pct')}
                            <small>allows {fmt(x.opponent_defense.success_rate?.value, 'pct')}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </article>
        )
      })}
      <Note>
        Line, second-level and open-field yards split each carry by where the yards came from. Direction splits:
        CFBD team rushing by direction (as of {stamp(r.as_of)}); sacks and kneels carry no direction. Explosive-run
        rate is not yet available.
      </Note>
    </div>
  )
}

function Receiving({ kp }) {
  const rc = kp.receiving
  return (
    <div className="gb-sub-section">
      <h3 className="gb-h3 gb-h3--lg">C. Receiving</h3>
      {['away', 'home'].map((side) => {
        const t = rc.teams[side]
        if (!t.metrics.length)
          return (
            <article key={side} className="gb-card gb-mu">
              <h4 className="gb-h4">{t.team} receiving</h4>
              <p className="gb-empty">Receiving data is unavailable for {t.team}.</p>
            </article>
          )
        const top = [...t.depth_bands].sort((a, b) => (b.offense?.share ?? 0) - (a.offense?.share ?? 0))[0]
        return (
          <article key={side} className="gb-card gb-mu">
            <h4 className="gb-h4">
              {t.team} receivers <span className="gb-dim">vs</span> {t.opponent} coverage
            </h4>
            {top?.offense && (
              <ul className="gb-reads">
                <li>
                  {top.label} is {t.team}'s most-targeted depth ({fmt(top.offense.share, 'pct')} of targets with air
                  yards); {t.opponent} has seen {fmt(top.opponent_defense?.share, 'pct')} of targets there.
                </li>
              </ul>
            )}
            <div className="gb-two">
              <VsTable rows={t.metrics} offTeam={t.team} defTeam={t.opponent} />
              <div className="gb-dirs gb-keep">
                <h5 className="gb-k">Target depth (air yards)</h5>
                <div className="gb-table-wrap">
                  <table className="gb-table gb-table--dirs">
                    <thead>
                      <tr>
                        <th scope="col">Depth</th>
                        <th scope="col">Share</th>
                        <th scope="col">Catch rate</th>
                        <th scope="col">Yds/target</th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.depth_bands.map((b) => (
                        <tr key={b.band} className={b.thin ? 'gb-thin' : ''}>
                          <th scope="row">
                            {b.label}
                            <small>
                              {b.offense?.targets ?? 0} targets{b.thin ? ' · small sample' : ''}
                            </small>
                          </th>
                          <td data-label="Share">
                            {fmt(b.offense?.share, 'pct')}
                            <small>faced {fmt(b.opponent_defense?.share, 'pct')}</small>
                          </td>
                          <td data-label="Catch rate">
                            {fmt(b.offense?.catch_rate, 'pct')}
                            <small>allows {fmt(b.opponent_defense?.catch_rate, 'pct')}</small>
                          </td>
                          <td data-label="Yds/target">
                            {fmt(b.offense?.yds_per_target, 'dec1')}
                            <small>allows {fmt(b.opponent_defense?.yds_per_target, 'dec1')}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <Note>
              {t.targets ?? 0} targets in {t.games ?? 0} games
              {t.air_coverage != null ? `; ${fmt(t.air_coverage, 'pct')} carry air yards` : ''}. Team-level
              aggregates only.
            </Note>
          </article>
        )
      })}
      <Note>
        Source: CFBD per-throw passing feed (intended receiver, air yards, yards after catch, EPA), season to date,
        garbage time included. Explosive = a completion of {rc.explosive_yards}+ yards.
      </Note>
    </div>
  )
}

function KeyPlays({ book }) {
  return (
    <Section
      id="key-plays"
      n={4}
      title="Key plays"
      lede="How each offense produces yards through the air, on the ground and through its receivers, set against what the opposing defense allows. Ranks are among FBS teams."
    >
      <Passing kp={book.key_plays} />
      <Rushing kp={book.key_plays} />
      <Receiving kp={book.key_plays} />
    </Section>
  )
}

// ---------------------------------------------------------------- 05 advanced
function Advanced({ book }) {
  const adv = book.advanced
  if (!adv.groups.length)
    return (
      <Section id="advanced" n={5} title="Advanced matchups">
        <p className="gb-empty">Advanced matchup data was unavailable when this report was built.</p>
      </Section>
    )
  return (
    <Section
      id="advanced"
      n={5}
      title="Advanced matchups"
      lede="Each offense against the defense it will face. Opponent-adjusted metrics are net of the schedule each team has played; rows marked Raw are season numbers without that adjustment."
    >
      <div className="gb-legend" aria-hidden="true">
        <span className="gb-adv gb-adv--off">▲ Offense</span> offense percentile at least 25 points higher
        <span className="gb-adv gb-adv--def">▼ Defense</span> defense at least 25 points higher
        <span>Doubled arrows: 45+ points</span>
      </div>
      <div className="gb-stack">
        {adv.groups.map((grp) => (
          <div key={grp.key} className="gb-card gb-adv-group">
            <h3 className="gb-h3">{grp.title}</h3>
            {grp.why && <p className="gb-why">{grp.why}</p>}
            {['away_offense', 'home_offense'].map((dir) => {
              const d = grp[dir]
              if (!d?.rows.length) return null
              return (
                <div key={dir} className="gb-table-wrap">
                  <table className="gb-table gb-table--adv">
                    <caption>
                      {d.offense_team} offense <span className="gb-dim">vs</span> {d.defense_team} defense
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Metric</th>
                        <th scope="col">{d.offense_team} offense</th>
                        <th scope="col">{d.defense_team} defense</th>
                        <th scope="col">Advantage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.rows.map((r) => {
                        const a = advantage(r.advantage, { notable: adv.notable, strong: adv.strong })
                        return (
                          <tr key={r.label}>
                            <th scope="row">
                              {r.label}
                              <small>{r.adjusted ? 'Opponent-adjusted' : 'Raw'}</small>
                            </th>
                            <td data-label={`${d.offense_team} offense`}>
                              <Val cell={r.offense} format={r.format} />
                              <Pct cell={r.offense} />
                            </td>
                            <td data-label={`${d.defense_team} defense`}>
                              <Val cell={r.defense} format={r.format} />
                              <Pct cell={r.defense} />
                            </td>
                            <td data-label="Advantage" className={`gb-adv gb-adv--${a.tone}`}>
                              {a.short}
                              <small>{r.advantage == null ? '' : signed(r.advantage * 100, 0)}</small>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <Note>
        Advantage = offense percentile minus defense percentile, in points (−100 to +100). Opponent adjustment:
        Rogue's ridge solve over CFBD advanced stats, this season only, through week{' '}
        {adv.as_of.adjusted.through_week ?? '—'}.
      </Note>
    </Section>
  )
}

// ---------------------------------------------------------------- 06 summary
function Summary({ book }) {
  const s = book.summary
  const list = (items) => (
    <ul>
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  )
  return (
    <Section id="summary" n={6} title="Matchup summary">
      <div className="gb-card gb-keep">
        <h3 className="gb-h3">Key takeaways</h3>
        {s.takeaways.length ? (
          <ol className="gb-takeaways">
            {s.takeaways.map((t) => (
              <li key={t.text}>
                <span className={`gb-tag gb-tag--${t.strength}`}>{t.strength}</span> {t.text}
              </li>
            ))}
          </ol>
        ) : (
          <p className="gb-empty">No matchup crosses the threshold for a takeaway; the teams grade out evenly.</p>
        )}
      </div>
      <div className="gb-two">
        <div className="gb-card gb-keep">
          <h3 className="gb-h3">Evidence behind Rogue's projection</h3>
          {s.supporting.length ? list(s.supporting) : <p className="gb-empty">Nothing beyond the takeaways above.</p>}
        </div>
        <div className="gb-card gb-keep">
          <h3 className="gb-h3">Reasons for caution</h3>
          {s.countervailing.length ? list(s.countervailing) : <p className="gb-empty">No notable counter-evidence.</p>}
        </div>
      </div>
      {s.limitations.length > 0 && (
        <div className="gb-card gb-keep">
          <h3 className="gb-h3">Data limitations</h3>
          {list(s.limitations)}
        </div>
      )}
    </Section>
  )
}

function Methodology({ book }) {
  const qa = book.quality
  return (
    <footer className="gb-method gb-method--foot gb-keep">
      <h2 className="gb-h3">Sources and conventions</h2>
      <ul>
        {Object.values(book.conventions).map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <dl className="gb-sources">
        {Object.entries(book.sources).map(([k, s]) => (
          <div key={k}>
            <dt>{s.label}</dt>
            <dd>{s.detail}</dd>
          </div>
        ))}
      </dl>
      <p>
        Report generated {stamp(book.generated_at)} · market captured {stamp(qa.data_as_of.market)} · stats through week{' '}
        {qa.data_as_of.stats_through_week ?? '—'} · model coverage {fmt(qa.model_coverage, 'pct')} · report ID{' '}
        {book.game.game_id}-{book.checksum.slice(0, 8)}
      </p>
      <p>
        For research and entertainment. Projections are estimates, not guarantees, and nothing here is a
        recommendation to place a bet.
      </p>
    </footer>
  )
}

// ---------------------------------------------------------------- page
function Header({ book }) {
  const g = book.game
  const qa = book.quality
  const started = kickedOff(g.kickoff)
  const rank = useRanks(g.season, g.week)[g.game_id] || {}
  const download = () => {
    track('gamebook_pdf', { game: g.game_id })
    const was = document.title
    document.title = pdfTitle(book) // the browser names the saved PDF after the title
    window.print()
    document.title = was
  }
  return (
    <header className="gb-head">
      <div className="gb-print-only gb-brand">
        <img src="/knight-dark.png" alt="" width="28" height="30" />
        <span>Rogue Analytics</span>
        <span className="gb-brand-sub">College Football Game Book</span>
      </div>
      <p className="eb">
        College Football Game Book · {g.season} · Week {g.week}
        {g.conference_game && g.home.conference ? ` · ${g.home.conference}` : ''}
      </p>
      <h1 className="gb-matchup">
        <span className="gb-team">
          <TeamMark team={g.away} />
          <span>
            <span className="gb-team-name">
              {rank.away && <span className="gb-rank">#{rank.away}</span>}
              {g.away.school}
            </span>
            <span className="gb-team-meta">
              {[recordText(g.away), g.away.conference].filter(Boolean).join(' · ')}
            </span>
          </span>
        </span>
        <span className="gb-at">{g.neutral_site ? 'vs' : 'at'}</span>
        <span className="gb-team">
          <TeamMark team={g.home} />
          <span>
            <span className="gb-team-name">
              {rank.home && <span className="gb-rank">#{rank.home}</span>}
              {g.home.school}
            </span>
            <span className="gb-team-meta">
              {[recordText(g.home), g.home.conference].filter(Boolean).join(' · ')}
            </span>
          </span>
        </span>
      </h1>
      <p className="gb-when">
        {kickoffText(g.kickoff)}
        {g.venue ? ` · ${g.venue}` : ''}
        {g.neutral_site ? ' (neutral site)' : ''}
      </p>
      <div className="gb-meta">
        <span>Generated {stamp(book.generated_at)}</span>
        <span>Market as of {stamp(qa.data_as_of.market)}</span>
        <span>Stats through week {qa.data_as_of.stats_through_week ?? '—'}</span>
        <span>Model coverage {fmt(qa.model_coverage, 'pct')}</span>
        <span className={`gb-status gb-status--${qa.status}`}>
          {qa.status === 'complete' ? 'Complete' : 'Complete, with data notes'}
        </span>
      </div>
      {started && (
        <p className="gb-alert" role="note">
          <b>Kickoff has passed.</b> This is the pregame report as published; numbers are not updated in-game.
        </p>
      )}
      <div className="gb-actions gb-screen-only">
        <button type="button" className="btn btn-green" onClick={download}>
          Download Game Book PDF
        </button>
        <span className="gb-hint">Opens your browser's print dialog; choose “Save as PDF”. US Letter, portrait.</span>
      </div>
      <nav className="gb-toc gb-screen-only" aria-label="Sections">
        {SECTIONS.map(([id, label], i) => (
          <a key={id} href={`#${id}`}>
            <span>{String(i + 1).padStart(2, '0')}</span> {label}
          </a>
        ))}
      </nav>
    </header>
  )
}

// Running footer on every printed page: game identity and page numbers.
function PrintPageRules({ book }) {
  const g = book.game
  const esc = (s) => String(s).replace(/["\\]/g, '')
  const left = esc(`Rogue Analytics Game Book · ${g.away.school} at ${g.home.school} · Week ${g.week}, ${g.season}`)
  const right = esc(`Generated ${stamp(book.generated_at)}`)
  return (
    <style>{`@media print { @page { @bottom-left { content: "${left}"; } @top-right { content: "${right}"; } } }`}</style>
  )
}

function Shell({ children }) {
  return (
    <div className="desk gb-page">
      <SubNav />
      <div className="wrap gb-wrap">{children}</div>
    </div>
  )
}

function Message({ title, text, action }) {
  return (
    <Shell>
      <div className="empty gb-msg">
        <h1 className="disp h5">{title}</h1>
        <p className="soft measure">{text}</p>
        {action}
        <Link className="link soft" to="/college-football/gamebooks">
          All Game Books
        </Link>
      </div>
    </Shell>
  )
}

export default function GamebookPage() {
  const { gameId } = useParams()
  const q = useGamebook(gameId)
  const { user } = useAuth()
  const book = q.status === 'ready' ? q.book : null
  const title = book
    ? `${book.game.away.school} at ${book.game.home.school} Game Book | Rogue Analytics`
    : 'Game Book | Rogue Analytics'
  usePageMeta(title, 'College football matchup research: market consensus, Rogue projection, team stats and matchups.')

  if (q.status === 'loading')
    return (
      <Shell>
        <div className="gb-loading" aria-busy="true">
          <span className="skel" style={{ width: '40%' }} />
          <span className="skel" style={{ width: '70%', height: 28 }} />
          <span className="skel" style={{ width: '55%' }} />
        </div>
      </Shell>
    )
  if (q.status === 'error')
    return <Message title="This Game Book didn't load." text="Something went wrong on our side. Try again in a minute." />
  if (q.status === 'missing')
    return <Message title="Game Book not found." text="It may not be published yet, or the link is out of date." />
  if (q.status === 'locked')
    return (
      <Message
        title={`${q.slate.away_team} at ${q.slate.home_team}`}
        text={
          user
            ? 'This Game Book is part of the Game Book plan. Your account does not include it yet.'
            : 'Game Books are for members. Log in to read this one.'
        }
        action={
          user ? (
            <Link className="btn btn-green" to="/account">
              See plans
            </Link>
          ) : (
            <SignInButton />
          )
        }
      />
    )

  return (
    <Shell>
      <PrintPageRules book={book} />
      <article className="gb">
        <Header book={book} />
        <Overview book={book} />
        <MarketVsRogue book={book} />
        <TeamProfile book={book} />
        <KeyPlays book={book} />
        <Advanced book={book} />
        <Summary book={book} />
        <Methodology book={book} />
      </article>
    </Shell>
  )
}
