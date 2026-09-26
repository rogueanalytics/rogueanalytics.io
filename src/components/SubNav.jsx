import { NavLink } from 'react-router-dom'
import { MEMBERS_ENABLED } from '../config.js'

// NCAAF product menu. Hidden while the members area is switched off.
export default function SubNav() {
  if (!MEMBERS_ENABLED) return null
  return (
    <div className="subnav">
      <div className="wrap subnav-in">
        <span className="subnav-label">NCAAF</span>
        <NavLink end className="nav-a subnav-a" to="/sports/ncaaf">
          Overview &amp; Packages
        </NavLink>
        <NavLink className="nav-a subnav-a" to="/sports/ncaaf/projections">
          Projections
        </NavLink>
        <NavLink className="nav-a subnav-a" to="/sports/ncaaf/gamebooks">
          Gamebooks
        </NavLink>
      </div>
    </div>
  )
}
