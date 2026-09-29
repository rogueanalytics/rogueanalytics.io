import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo.jsx'
import { DiscordButton } from './Buttons.jsx'
import { MEMBERS_ENABLED } from '../config.js'
import { IconChevron, IconClose, IconMenu } from './Icons.jsx'
import AuthButton from '../auth/AuthButton.jsx'

export default function Nav() {
  const [sportsOpen, setSportsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const ddRef = useRef(null)

  // Close menus whenever the route changes
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setSportsOpen(false)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!sportsOpen) return
    const onDown = (e) => {
      if (ddRef.current && !ddRef.current.contains(e.target)) setSportsOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setSportsOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [sportsOpen])

  const sportsActive = pathname.startsWith('/sports')

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
        <nav id="nav-menu" className={`nav-menu${menuOpen ? ' open' : ''}`} aria-label="Main">
          <div className="dd" ref={ddRef}>
            <button
              type="button"
              className={`nav-a${sportsActive ? ' active' : ''}`}
              aria-expanded={sportsOpen}
              aria-controls="sports-menu"
              onClick={() => setSportsOpen((o) => !o)}
            >
              Sports Solutions
              <IconChevron size={14} />
            </button>
            {sportsOpen && (
              <div className="dd-menu" id="sports-menu">
                <Link className="dd-a" to="/sports/ncaaf">
                  NCAAF <span className="tag tag-live">Live</span>
                </Link>
                <Link className="dd-a" to="/sports/ncaab">
                  NCAAB <span className="tag">Coming soon</span>
                </Link>
                <Link className="dd-a dd-all" to="/sports">
                  All sports solutions
                </Link>
              </div>
            )}
          </div>
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
