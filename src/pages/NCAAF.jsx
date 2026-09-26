import { Fragment } from 'react'
import Seam from '../components/Seam.jsx'
import SubNav from '../components/SubNav.jsx'
import { SubscribeButton } from '../components/Buttons.jsx'
import { IconArrow, IconCheck, IconDash } from '../components/Icons.jsx'
import { DROP_SCHEDULE, PACKAGES } from '../config.js'

const CHAIN = ['Team points', 'Plays', 'Pass / rush split', 'Usage shares', 'Player projections']

const COMPARE = [
  ['Player projections for every slate', true, false],
  ['Unabated Simulator-ready format', true, false],
  ['Searchable table and .csv download', true, false],
  ['Gamebook for every game', true, true],
  ['Team metrics, depth charts, injuries, starters', true, true],
]

const STEPS = [
  ['Log in with Discord', 'Your Discord account is your Rogue Analytics login.'],
  ['Choose a package', 'Player Projections or Gamebooks, billed monthly.'],
  ['Use the NCAAF menu', 'Projections and Gamebooks unlock based on your package.'],
]

function Mark({ on }) {
  return on ? (
    <span className="mark mark--on">
      <IconCheck />
      <span className="sr-only">Included</span>
    </span>
  ) : (
    <span className="mark">
      <IconDash />
      <span className="sr-only">Not included</span>
    </span>
  )
}

function PackageCard({ pkg, dark, badge }) {
  return (
    <div className={`card pkg${dark ? ' card--dark' : ''}`}>
      <div className="pkg-top">
        <span className={`eb${dark ? '' : ' eb--ink'}`}>{pkg.name}</span>
        {badge && <span className="pill">{badge}</span>}
      </div>
      <div className="price">
        <span className="disp">${pkg.price}</span>
        <span className="per">/mo</span>
      </div>
      <p className={dark ? 'soft' : 'body'}>{pkg.audience}</p>
      <hr className="rule" />
      <ul className="checks">
        {pkg.includes.map((t) => (
          <li key={t}>
            <IconCheck />
            <span>{t}</span>
          </li>
        ))}
      </ul>
      <SubscribeButton className="btn-block" />
    </div>
  )
}

export default function NCAAF() {
  return (
    <>
      <SubNav />
      <section className="dark hero hero--sm">
        <div className="wrap hero-in">
          <span className="eb">NCAAF, college football</span>
          <h1 className="disp h1 h1--sm">College football, modeled from the ground up.</h1>
          <p className="lede">
            Every player projection is built bottom-up from team-level models, never from the
            market line.
          </p>
          <div className="chain" aria-label="How projections are built">
            {CHAIN.map((c, i) => (
              <Fragment key={c}>
                {i > 0 && (
                  <span className="chain-arrow">
                    <IconArrow size={14} />
                  </span>
                )}
                <span className="chip">{c}</span>
              </Fragment>
            ))}
          </div>
        </div>
      </section>
      <Seam />

      <section className="section" id="packages">
        <div className="wrap stack stack--lg">
          <div className="stack stack--sm">
            <span className="eb eb--muted">Packages</span>
            <h2 className="disp h2">Pick your package.</h2>
          </div>
          <div className="grid-2 grid-stretch">
            <PackageCard pkg={PACKAGES.projections} dark badge="Includes Gamebooks" />
            <PackageCard pkg={PACKAGES.gamebooks} />
          </div>
        </div>
      </section>

      <section className="section section--flush-top">
        <div className="wrap stack">
          <h3 className="disp h4">Compare packages</h3>
          <div className="table-wrap">
            <table className="compare">
              <thead>
                <tr>
                  <th scope="col">Included</th>
                  <th scope="col">Player Projections, ${PACKAGES.projections.price}</th>
                  <th scope="col">Gamebooks, ${PACKAGES.gamebooks.price}</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([label, a, b]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>
                      <Mark on={a} />
                    </td>
                    <td>
                      <Mark on={b} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="section section--flush-top">
        <div className="wrap grid-4">
          {STEPS.map(([title, text], i) => (
            <div key={title} className="step">
              <span className="step-n">{String(i + 1).padStart(2, '0')}</span>
              <strong className="step-title">{title}</strong>
              <p className="body small-body">{text}</p>
            </div>
          ))}
          <div className="step step--dark">
            <span className="eb">Drop schedule</span>
            {DROP_SCHEDULE.map((s) => (
              <div key={s.label} className="sched-line">
                <strong>{s.label}</strong>
                <span className="mono small soft">
                  {s.time}, {s.when}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
