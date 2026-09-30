import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'
import { CONTACT_EMAIL } from '../config.js'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-in">
        <div className="footer-brand">
          <Logo />
          <span>Built on the wrong side of the counter, run on the right one.</span>
        </div>
        <div className="footer-links">
          <Link to="/college-football/teams">College Football</Link>
          <Link to="/college-basketball/teams">College Basketball</Link>
          <Link to="/analytics">Analytics Solutions</Link>
          {CONTACT_EMAIL && <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>}
        </div>
        <span className="footer-copy">© {new Date().getFullYear()} Rogue Analytics</span>
      </div>
    </footer>
  )
}
