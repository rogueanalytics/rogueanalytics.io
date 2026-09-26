import { Link } from 'react-router-dom'
import Seam from '../components/Seam.jsx'
import { ArrowLink, DiscordButton } from '../components/Buttons.jsx'
import { MEMBERS_ENABLED, PACKAGES } from '../config.js'

export default function Sports() {
  const { projections, gamebooks } = PACKAGES
  return (
    <>
      <section className="dark hero hero--sm">
        <div className="wrap hero-in">
          <span className="eb">Sports Solutions</span>
          <h1 className="disp h1 h1--sm">Projections and game data, built from our own models.</h1>
          <p className="lede">
            Built on CollegeFootballData.com data and weekly depth charts. Our models are
            spread-free: the market line is never an input.
          </p>
        </div>
      </section>
      <Seam />

      <section className="section">
        <div className="wrap stack stack--lg">
          <div className="card product">
            <div className="stack">
              <span className="tag tag-live">NCAAF, live</span>
              <h2 className="disp h2">College Football</h2>
              <p className="body body-lg">
                Model-driven player projections for every slate, and a Gamebook for every game.
              </p>
              <div className="btn-row">
                <ArrowLink to="/sports/ncaaf">Packages and pricing</ArrowLink>
                {MEMBERS_ENABLED && <DiscordButton />}
              </div>
            </div>
            <div className="stack stack--sm">
              <Link to="/sports/ncaaf#packages" className="pkg-link pkg-link--dark">
                <span className="pkg-head">
                  <span className="pkg-name">{projections.name}</span>
                  <span className="disp pkg-price">
                    ${projections.price}
                    <span className="per">/mo</span>
                  </span>
                </span>
                <span className="soft small-body">
                  Slate-level player projections, formatted for the Unabated Simulator. Includes all
                  Gamebooks.
                </span>
              </Link>
              <Link to="/sports/ncaaf#packages" className="pkg-link pkg-link--light">
                <span className="pkg-head">
                  <span className="pkg-name">{gamebooks.name}</span>
                  <span className="disp pkg-price">
                    ${gamebooks.price}
                    <span className="per">/mo</span>
                  </span>
                </span>
                <span className="body small-body">
                  A pre-game viewing guide: team metrics, depth charts, injuries, and starters.
                </span>
              </Link>
            </div>
          </div>

          <div className="soon-card">
            <div className="stack">
              <span className="tag">NCAAB, coming soon</span>
              <h2 className="disp h2 muted">College Basketball</h2>
              <p className="muted">In development.</p>
            </div>
            <ArrowLink to="/sports/ncaab" variant="line">
              Learn more
            </ArrowLink>
          </div>
        </div>
      </section>
    </>
  )
}
