import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo.jsx'
import { IconChevron, IconClose, IconMenu } from './Icons.jsx'
import AuthButton from '../auth/AuthButton.jsx'
import { track } from '../lib/track.js'

// Products menu: what you can buy (lowest price first), then the college football data pages.
const PRODUCT_GROUPS = [
  {
    label: 'Subscriptions',
    items: [
      { label: 'College Football Game Book', to: '/#products', note: 'Every game, broken down', tag: 'Coming soon' },
      { label: 'College Football Player Projections', to: '/sports/ncaaf', note: 'Player stat lines for every slate · $100/mo', tag: 'Live', live: true },
      { label: 'College Basketball Player Projections', to: '/college-basketball', note: 'College basketball player projections', tag: 'Coming soon' },
    ],
  },
  {
    label: 'College football data',
    items: [
      { label: 'Team Rankings', to: '/college-football/teams', note: 'Every FBS team, raw and opponent-adjusted', tag: 'Free' },
      { label: 'Player Board', to: '/college-football/players', note: 'QB, RB, WR and TE season rankings', tag: 'Free with sign-in' },
      { label: 'Projection Table', to: '/college-football/projections', note: "This week's player projections and .csv download", tag: 'Subscribers' },
    ],
  },
]

const LINKS = [
  { label: 'How It Works', to: '/#how-it-works' },
  { label: 'Methodology', to: '/#methodology' },
  { label: 'Pricing', to: '/#pricing' },
]

const PRODUCT_PATHS = ['/sports', '/college-football', '/college-basketball']

// Hover opens the menu on devices with a real pointer; touch devices fall back to tap-to-toggle.
const canHover = () => window.matchMedia('(hover: hover)').matches
const FOCUSABLE = 'a[href], button:not([disabled])'

export default function Nav() {
  const [productsOpen, setProductsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname, hash } = useLocation()
  const headerRef = useRef(null)
  const menuRef = useRef(null)
  const toggleRef = useRef(null)

  // Close menus whenever the route (or homepage section) changes
  const [lastLoc, setLastLoc] = useState(pathname + hash)
  if (pathname + hash !== lastLoc) {
    setLastLoc(pathname + hash)
    setProductsOpen(false)
    setMenuOpen(false)
  }

  // Products dropdown: close on outside click or Escape.
  useEffect(() => {
    if (!productsOpen) return
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setProductsOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setProductsOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [productsOpen])

  // Mobile sheet: lock page scroll, keep Tab inside the header, Escape closes and refocuses the toggle.
  useEffect(() => {
    if (!menuOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        toggleRef.current?.focus()
        return
      }
      if (e.key !== 'Tab' || !headerRef.current) return
      const els = [...headerRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (els.length === 0) return
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const productsActive = PRODUCT_PATHS.some((p) => pathname.startsWith(p))

  return (
    <header className="nav" ref={headerRef}>
      <div className="wrap nav-in">
        <Logo />
        <button
          type="button"
          ref={toggleRef}
          className="nav-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="nav-menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <IconClose size={22} /> : <IconMenu size={22} />}
        </button>
        <nav id="nav-menu" className={`nav-menu${menuOpen ? ' open' : ''}`} aria-label="Main">
          <div
            className="dd"
            ref={menuRef}
            onMouseEnter={() => canHover() && setProductsOpen(true)}
            onMouseLeave={() => canHover() && setProductsOpen(false)}
          >
            <button
              type="button"
              className={`nav-a${productsActive ? ' active' : ''}`}
              aria-expanded={productsOpen}
              aria-controls="products-menu"
              onClick={() => setProductsOpen((o) => (canHover() ? true : !o))}
            >
              Products
              <IconChevron size={14} />
            </button>
            {productsOpen && (
              <div className="dd-menu dd-menu--wide" id="products-menu">
                {PRODUCT_GROUPS.map((g) => (
                  <div className="dd-group" key={g.label}>
                    <span className="dd-label">{g.label}</span>
                    {g.items.map((it) => (
                      <Link className="dd-item" key={it.label} to={it.to}>
                        <span className="dd-item-name">
                          {it.label}
                          <span className={`dd-tag${it.live ? ' dd-tag--live' : ''}`}>{it.tag}</span>
                        </span>
                        <span className="dd-item-note">{it.note}</span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
          {LINKS.map((l) => (
            <Link key={l.label} className={`nav-a${pathname === '/' && hash === l.to.slice(1) ? ' active' : ''}`} to={l.to}>
              {l.label}
            </Link>
          ))}
          <NavLink className="nav-a" to="/about">
            About
          </NavLink>
          <div className="nav-right">
            <AuthButton />
            <Link
              className="btn btn-green btn-sm"
              to="/sports/ncaaf"
              onClick={() => track('nav_cta_click', { label: 'Explore Projections' })}
            >
              Explore Projections
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}
