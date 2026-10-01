import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo.jsx'
import { DiscordButton } from './Buttons.jsx'
import { MEMBERS_ENABLED } from '../config.js'
import { IconChevron, IconClose, IconMenu } from './Icons.jsx'
import AuthButton from '../auth/AuthButton.jsx'

const MENUS = [
  {
    id: 'cfb',
    label: 'College Football',
    base: '/college-football',
    items: ['Teams', 'Players', 'Projections'],
  },
  {
    id: 'cbb',
    label: 'College Basketball',
    base: '/college-basketball',
    items: ['Teams', 'Players', 'Projections'],
  },
]

// Hover opens menus on devices with a real pointer; touch devices fall back to tap-to-toggle.
const canHover = () => window.matchMedia('(hover: hover)').matches

export default function Nav() {
  const [openId, setOpenId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const navRef = useRef(null)

  // Close menus whenever the route changes
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setOpenId(null)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!openId) return
    const onDown = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenId(null)
    }
    const onKey = (e) => e.key === 'Escape' && setOpenId(null)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [openId])

  return (
    <header className="nav">
      <div className="wrap nav-in">
        <Logo />
        <button
          type="button"
          className="nav-toggle"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="nav-menu"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? <IconClose size={22} /> : <IconMenu size={22} />}
        </button>
        <nav id="nav-menu" className={`nav-menu${menuOpen ? ' open' : ''}`} aria-label="Main" ref={navRef}>
          {MENUS.map((m) => (
            <div
              className="dd"
              key={m.id}
              onMouseEnter={() => canHover() && setOpenId(m.id)}
              onMouseLeave={() => canHover() && setOpenId((o) => (o === m.id ? null : o))}
            >
              <button
                type="button"
                className={`nav-a${pathname.startsWith(m.base) ? ' active' : ''}`}
                aria-expanded={openId === m.id}
                aria-controls={`${m.id}-menu`}
                onClick={() => setOpenId((o) => (canHover() ? m.id : o === m.id ? null : m.id))}
              >
                {m.label}
                <IconChevron size={14} />
              </button>
              {openId === m.id && (
                <div className="dd-menu" id={`${m.id}-menu`}>
                  {m.items.map((item) => (
                    <Link className="dd-a" key={item} to={`${m.base}/${item.toLowerCase()}`}>
                      {item}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
          <NavLink className="nav-a" to="/analytics">
            Analytics Solutions
          </NavLink>
          <div className="nav-right">
            <AuthButton />
            {MEMBERS_ENABLED && <DiscordButton className="btn-sm" />}
          </div>
        </nav>
      </div>
    </header>
  )
}
