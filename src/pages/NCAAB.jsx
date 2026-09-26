import { ArrowLink } from '../components/Buttons.jsx'

export default function NCAAB() {
  return (
    <section className="dark hero hero--tall">
      <div className="wrap hero-in">
        <span className="eb">NCAAB</span>
        <h1 className="disp h1">College Basketball</h1>
        <p className="lede">Coming soon.</p>
        <div className="btn-row">
          <ArrowLink to="/sports" variant="ghost">
            Back to Sports Solutions
          </ArrowLink>
          <ArrowLink to="/sports/ncaaf">NCAAF is live</ArrowLink>
        </div>
      </div>
    </section>
  )
}
