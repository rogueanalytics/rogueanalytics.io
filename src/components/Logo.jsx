import { Link } from 'react-router-dom'

export default function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Rogue Analytics home">
      <img src="/knight-light.png" alt="" width="36" height="38" />
      <span className="logo-word">
        <span className="logo-top">ROGUE</span>
        <span className="logo-sub">ANALYTICS</span>
      </span>
    </Link>
  )
}
