import { Link } from 'react-router-dom'
import Seam from '../components/Seam.jsx'
import { ArrowLink } from '../components/Buttons.jsx'
import { useAuth } from '../auth/AuthProvider.jsx'
import { PRODUCTS } from '../config.js'
import { track } from '../lib/track.js'
import { usePageMeta } from '../lib/usePageMeta.js'
import '../styles/home.css'

// Pre-launch page for NCAAB. Social posts link here. Keep dates and features out until confirmed.
const ncaab = PRODUCTS.find((p) => p.id === 'ncaab_projections')

const POINTS = [
  ['Same method', 'Built from team-level forecasts down to players, independent of the betting line.'],
  ['Built for your models', 'Player projections you can download as a .csv for your own analysis.'],
  ['Account ready at launch', 'Create your account now with Discord, so you can subscribe as soon as it opens.'],
]

export default function CollegeBasketball() {
  const { session } = useAuth()
  usePageMeta(
    'College Basketball Player Projections | Rogue Analytics',
    'College basketball player projections from Rogue Analytics are coming. Built from the team up, independent of the line.',
  )
  return (
    <>
      <section className="dark hero hero--sm">
        <div className="wrap hero-in">
          <span className="eb">College basketball player projections</span>
          <h1 className="disp h1 h1--sm">College basketball projections are coming.</h1>
          <p className="lede">
            Player-level projections for college basketball, built the same way as our football numbers: from the team
            up, independent of the line.
          </p>
          <div className="btn-row">
            {session ? (
              <ArrowLink to="/account">Your account is ready</ArrowLink>
            ) : (
              <ArrowLink to="/sign-in?next=/college-basketball" onClick={() => track('ncaab_account_click')}>
                Create your account
              </ArrowLink>
            )}
            <Link className="btn btn-ghost" to="/sports/ncaaf">
              See football projections
            </Link>
          </div>
          <span className="mono small dim">
            ${ncaab.price}
            {ncaab.priceNote}
          </span>
        </div>
      </section>
      <Seam />

      <section className="section">
        <div className="wrap hm-grid-3">
          {POINTS.map(([title, text]) => (
            <div key={title} className="step">
              <strong className="step-title">{title}</strong>
              <p className="body small-body">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
