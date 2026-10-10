import { Link } from 'react-router-dom'
import Logo from './Logo.jsx'
import { CONTACT_EMAIL } from '../config.js'

// Privacy, Terms and social links go here once those pages and accounts exist.
const COLUMNS = [
  {
    label: 'Products',
    links: [
      ['College Football Game Book', '/#products'],
      ['College Football Player Projections', '/sports/ncaaf'],
      ['College Basketball Player Projections', '/college-basketball'],
    ],
  },
  {
    label: 'College football data',
    links: [
      ['Team Rankings', '/college-football/teams'],
      ['Player Board', '/college-football/players'],
      ['Projection Table', '/college-football/projections'],
    ],
  },
  {
    label: 'Learn',
    links: [
      ['How It Works', '/#how-it-works'],
      ['Methodology', '/#methodology'],
      ['Pricing', '/#pricing'],
      ['FAQ', '/#faq'],
    ],
  },
  {
    label: 'Company',
    links: [
      ['About', '/about'],
      ['Analytics consulting', '/analytics'],
    ],
  },
]

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div className="footer-brand">
          <Logo />
          <span>Independent college sports analytics. Built on the wrong side of the counter, run on the right one.</span>
          {CONTACT_EMAIL && (
            <a className="footer-mail" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          )}
        </div>
        {COLUMNS.map((c) => (
          <nav className="footer-col" key={c.label} aria-label={c.label}>
            <span className="footer-head">{c.label}</span>
            {c.links.map(([label, to]) => (
              <Link key={label} to={to}>
                {label}
              </Link>
            ))}
          </nav>
        ))}
        <p className="footer-disc">
          Rogue Analytics publishes statistical projections for informational and research purposes. Projections are
          estimates, not guarantees, and nothing on this site is betting advice. Rogue Analytics does not accept
          wagers. You are responsible for your own decisions. If you or someone you know has a gambling problem, call
          1-800-GAMBLER.
        </p>
        <span className="footer-copy">© {new Date().getFullYear()} Rogue Analytics</span>
      </div>
    </footer>
  )
}
