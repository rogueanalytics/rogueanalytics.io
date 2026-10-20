import { Link, useLocation } from 'react-router-dom'
import { MEMBERS_ENABLED } from '../config.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import { IconArrow, IconLogin } from './Icons.jsx'
import { track } from '../lib/track.js'

// Sends the visitor to /sign-in (Apple, Google or Discord), then back here (or to `next`).
export function SignInButton({ children = 'Sign in', className = '', next: nextPath }) {
  const { pathname, search } = useLocation()
  const next = nextPath ?? pathname + search
  return (
    <Link
      to={`/sign-in?next=${encodeURIComponent(next)}`}
      className={`btn btn-green ${className}`}
      onClick={() => track('sign_in_start', { from: pathname })}
    >
      <IconLogin size={16} />
      {children}
    </Link>
  )
}

// Package call-to-action: "opening soon" while the members area is off. Checkout
// starts on /account, so it always belongs to a signed-in account.
export function SubscribeButton({ className = '' }) {
  const { session } = useAuth()
  if (!MEMBERS_ENABLED) {
    return (
      <span className={`btn btn-soon ${className}`} aria-disabled="true">
        Subscriptions opening soon
      </span>
    )
  }
  if (session) {
    return (
      <Link to="/account#plans" className={`btn btn-green ${className}`}>
        Subscribe
      </Link>
    )
  }
  return (
    <SignInButton className={className} next="/account#plans">
      Sign in to subscribe
    </SignInButton>
  )
}

export function ArrowLink({ to, children, variant = 'green', className = '', onClick }) {
  return (
    <Link to={to} className={`btn btn-${variant} ${className}`} onClick={onClick}>
      {children}
      <IconArrow size={16} />
    </Link>
  )
}
