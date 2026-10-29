import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo.jsx'
import { IconChevron, IconClose, IconMenu } from './Icons.jsx'
import AuthButton from '../auth/AuthButton.jsx'
import { track } from '../lib/track.js'
import { MEMBERS_ENABLED } from '../config.js'

// Products menu: one row per sport, each sport's pages ordered by cost. Hovering (or tapping) a sport opens its pages in a flyout to the side.
const PRODUCT_SPORTS = [
  {
    id: 'cfb',
    label: 'College Football',
    items: [
      { label: 'Teams', to: '/college-football/teams', note: 'Every FBS team, raw and opponent-adjusted' },
      { label: 'Players', to: '/college-football/players', note: 'QB, RB, WR and TE season rankings' },
      { label: 'Gamebooks', to: '/college-football/gamebooks', note: 'Every game, broken down', soon: !MEMBERS_ENABLED },
      { label: 'Player Projections', to: '/college-football/projections', note: 'Player stat lines for every slate, with .csv download' },
    ],
  },
  {
    id: 'cbb',
    label: 'College Basketball',
    items: [
      { label: 'Player Projections', to: '/college-basketball', note: 'College basketball player projections', soon: true },
    ],
  },
]

const LINKS = [
  { label: 'How It Works', to: '/#how-it-works' },
  { label: 'Methodology', to: '/#methodology' },
  { label: 'Pricing', to: '/#pricing' },
]

const PRODUCT_PATHS = ['/products', '/college-football', '/college-basketball']

// Hover opens the menu on devices with a real pointer; touch devices fall back to tap-to-toggle.
const canHover = () => window.matchMedia('(hover: hover)').matches
const FOCUSABLE = 'a[href], button:not([disabled])'

export default function Nav() {
  const [productsOpen, setProductsOpen] = useState(false)
  const [activeSport, setActiveSport] = useState(null)
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
    setActiveSport(null)
    setMenuOpen(false)
  }

  // Closing the menu also folds the open flyout, so it reopens showing just the sports.
  const closeProducts = () => {
    setProductsOpen(false)
    setActiveSport(null)
  }

  // Products dropdown: close on outside click or Escape.
  useEffect(() => {
    if (!productsOpen) return
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) closeProducts()
    }
    const onKey = (e) => e.key === 'Escape' && closeProducts()
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
            onMouseLeave={() => canHover() && closeProducts()}
          >
            <button
              type="button"
              className={`nav-a${productsActive ? ' active' : ''}`}
              aria-expanded={productsOpen}
              aria-controls="products-menu"
              onClick={() => (canHover() || !productsOpen ? setProductsOpen(true) : closeProducts())}
            >
              Products
              <IconChevron size={14} />
            </button>
            {productsOpen && (
              <div className="dd-menu dd-fly" id="products-menu">
                {PRODUCT_SPORTS.map((sp) => {
                  const open = activeSport === sp.id
                  return (
                    <div className="dd-sport" key={sp.id} onMouseEnter={() => canHover() && setActiveSport(sp.id)}>
                      <button
                        type="button"
                        className={`dd-sport-btn${open ? ' open' : ''}`}
                        aria-expanded={open}
                        aria-controls={`products-${sp.id}`}
                        onClick={() => setActiveSport((cur) => (canHover() || cur !== sp.id ? sp.id : null))}
                        onFocus={() => canHover() && setActiveSport(sp.id)}
                      >
                        {sp.label}
                        <IconChevron size={14} />
                      </button>
                      {open && (
                        <div className="dd-panel" id={`products-${sp.id}`}>
                          <span className="dd-label">{sp.label}</span>
                          {sp.items.map((it) => (
                            <Link className="dd-item" key={it.label} to={it.to}>
                              <span className="dd-item-name">
                                {it.label}
                                {it.soon && <span className="dd-tag">Coming soon</span>}
                              </span>
                              <span className="dd-item-note">{it.note}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {LINKS.map((l) => (
            <Link key={l.label} className={`nav-a${pathname === '/' && hash === l.to.slice(1) ? ' active' : ''}`} to={l.to}>
              {l.label}
            </Link>
          ))}
          <NavLink className="nav-a" to="/consulting">
            Consulting
          </NavLink>
          <NavLink className="nav-a" to="/about">
            About
          </NavLink>
          <div className="nav-right">
            <AuthButton />
            <Link
              className="btn btn-green btn-sm"
              to="/college-football/projections"
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
