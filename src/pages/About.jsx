import Seam from '../components/Seam.jsx'
import { ArrowLink } from '../components/Buttons.jsx'
import { usePageMeta } from '../lib/usePageMeta.js'

export default function About() {
  usePageMeta(
    'About | Rogue Analytics',
    'Rogue Analytics is an independent college sports analytics shop started by a business intelligence leader with a sportsbook background.',
  )
  return (
    <>
      <section className="dark hero hero--sm">
        <div className="wrap hero-in">
          <span className="eb">About</span>
          <h1 className="disp h1 h1--sm">Built on the wrong side of the counter. Run on the right one.</h1>
        </div>
      </section>
      <Seam />

      <section className="section">
        <div className="wrap split">
          <div className="stack">
            <span className="eb eb--muted">Who we are</span>
            <h2 className="disp h2">An independent analytics shop.</h2>
          </div>
          <div className="prose">
            <p>
              Rogue Analytics was started by a business intelligence leader with a background in sports betting analytics
              and data infrastructure.
            </p>
            <p>
              We started on the sportsbook side. Now we build models for the people betting against the line, and bring
              the same approach to clients outside of sports.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--flush-top">
        <div className="wrap">
          <div className="soon-card">
            <div className="stack stack--sm">
              <span className="eb eb--muted">Analytics consulting</span>
              <h2 className="disp h5">Models, apps and data systems for teams outside sports.</h2>
            </div>
            <ArrowLink to="/analytics" variant="line">
              Explore Analytics Solutions
            </ArrowLink>
          </div>
        </div>
      </section>
    </>
  )
}
