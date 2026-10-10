import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import Seam from '../components/Seam.jsx'
import SubNav from '../components/SubNav.jsx'
import PricingTable from '../components/PricingTable.jsx'
import { SubscribeButton } from '../components/Buttons.jsx'
import { IconArrow, IconCheck } from '../components/Icons.jsx'
import { DROP_SCHEDULE, PACKAGES } from '../config.js'
import { usePageMeta } from '../lib/usePageMeta.js'

const CHAIN = ['Team points', 'Plays', 'Pass / rush split', 'Usage shares', 'Player projections']

const STEPS = [
  ['Log in with Discord', 'Your Discord account is your Rogue Analytics login.'],
  ['Choose a plan', 'Player Projections, billed monthly.'],
  ['Open the projection table', 'Filter the slate, then download the player projections as a .csv.'],
]

function PackageCard({ pkg, dark, badge, id, soon, cta }) {
  return (
    <div className={`card pkg${dark ? ' card--dark' : ''}`} id={id}>
      <div className="pkg-top">
        <span className={`eb${dark ? '' : ' eb--ink'}`}>{pkg.name}</span>
        {badge && <span className="pill">{badge}</span>}
      </div>
      <div className="price">
        {pkg.price != null ? (
          <>
            <span className="disp">${pkg.price}</span>
            <span className="per">{pkg.per ?? '/mo'}</span>
          </>
        ) : (
          <span className="disp h5">Pricing at launch</span>
        )}
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
      {cta ? (
        <Link className="btn btn-line btn-block" to={cta.to}>
          {cta.label}
        </Link>
      ) : soon ? (
        <span className="btn btn-soon btn-block" aria-disabled="true">
          Coming soon
        </span>
      ) : (
        <SubscribeButton className="btn-block" />
      )}
    </div>
  )
}

export default function NCAAF() {
  usePageMeta(
    'College Football Projection Plans | Rogue Analytics',
    'College football player projections for every slate, built bottom-up from team models. Download as .csv in the Unabated Simulator format.',
  )
  return (
    <>
      <SubNav />
      <section className="dark hero hero--sm">
        <div className="wrap hero-in">
          <span className="eb">College football</span>
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
          {/* Lowest price first, matching the homepage. */}
          <div className="hm-grid-3 grid-stretch">
            <PackageCard pkg={PACKAGES.gamebooks} badge="Coming soon" id="gamebooks" soon />
            <PackageCard pkg={PACKAGES.projections} dark badge="Live" id="projections" />
            <PackageCard
              pkg={PACKAGES.basketball}
              badge="Coming soon"
              id="basketball"
              cta={{ label: 'Get launch details', to: '/college-basketball' }}
            />
          </div>
        </div>
      </section>

      <section className="section section--flush-top">
        <div className="wrap stack">
          <h3 className="disp h4">Compare products</h3>
          <PricingTable />
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
