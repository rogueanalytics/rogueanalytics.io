import Seam from '../components/Seam.jsx'
import { ArrowLink } from '../components/Buttons.jsx'

export default function Home() {
  return (
    <>
      <section className="dark hero">
        <div className="wrap hero-in">
          <span className="eb">Sports modeling and analytics consulting</span>
          <h1 className="disp h1">Built on the wrong side of the counter. Run on the right one.</h1>
          <p className="lede">
            Rogue Analytics builds models, projections, and the tools to use them, for sports
            markets and for businesses that run on data.
          </p>
          <div className="btn-row">
            <ArrowLink to="/college-football/teams">College Football</ArrowLink>
            <ArrowLink to="/college-basketball/teams" variant="ghost">
              College Basketball
            </ArrowLink>
            <ArrowLink to="/analytics" variant="ghost">
              Analytics Solutions
            </ArrowLink>
          </div>
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
              Rogue Analytics was started by a business intelligence leader with a background in
              sports betting analytics and data infrastructure.
            </p>
            <p>
              We started on the sportsbook side. Now we build models for the people betting against
              the line, and bring the same approach to clients outside of sports.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--flush-top">
        <div className="wrap stack stack--lg">
          <span className="eb eb--muted">What we do</span>
          <div className="grid-2">
            <div className="card">
              <h3 className="disp h3">Analytics Solutions</h3>
              <p className="body body-lg">
                Consulting for teams that need models, apps, and data systems built, not just
                scoped.
              </p>
              <div className="rowlist">
                <div>Predictive modeling</div>
                <div>App and tool building</div>
                <div>Dashboards and BI</div>
                <div>Data pipelines and infrastructure</div>
              </div>
              <ArrowLink to="/analytics" variant="line" className="self-start">
                Explore Analytics Solutions
              </ArrowLink>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
