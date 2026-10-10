import { NavLink } from 'react-router-dom'
import { MEMBERS_ENABLED } from '../config.js'

// NCAAF product menu. Hidden while the members area is switched off.
export default function SubNav() {
  if (!MEMBERS_ENABLED) return null
  return (
    <div className="subnav">
      <div className="wrap subnav-in">
        <span className="subnav-label">College Football</span>
        <NavLink end className="nav-a subnav-a" to="/sports/ncaaf">
          Overview &amp; Pricing
        </NavLink>
        <NavLink className="nav-a subnav-a" to="/college-football/projections">
          Projections
        </NavLink>
        {/* Game Book tab goes here once Game Books are live. */}
      </div>
    </div>
  )
}
