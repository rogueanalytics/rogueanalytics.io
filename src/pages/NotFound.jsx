import { ArrowLink } from '../components/Buttons.jsx'

export default function NotFound() {
  return (
    <section className="dark hero hero--tall">
      <div className="wrap hero-in">
        <span className="eb">404</span>
        <h1 className="disp h1 h1--sm">This page doesn't exist.</h1>
        <p className="lede">Check the address, or head back to the home page.</p>
        <div className="btn-row">
          <ArrowLink to="/">Go to the home page</ArrowLink>
        </div>
      </div>
    </section>
  )
}
