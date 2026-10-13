import { Link, useLocation } from 'react-router-dom'
import { MEMBERS_ENABLED } from '../config.js'
import { IconArrow, IconLogin } from './Icons.jsx'
import { track } from '../lib/track.js'

// Sends the visitor to /sign-in (Apple, Google or Discord), then back here.
export function SignInButton({ children = 'Sign in', className = '' }) {
  const { pathname, search } = useLocation()
  const next = pathname + search
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

// Package call-to-action: "opening soon" while the members area is off.
export function SubscribeButton({ className = '' }) {
  if (!MEMBERS_ENABLED) {
    return (
      <span className={`btn btn-soon ${className}`} aria-disabled="true">
        Subscriptions opening soon
      </span>
    )
  }
  return <SignInButton className={className}>Sign in to subscribe</SignInButton>
}

export function ArrowLink({ to, children, variant = 'green', className = '', onClick }) {
  return (
    <Link to={to} className={`btn btn-${variant} ${className}`} onClick={onClick}>
      {children}
      <IconArrow size={16} />
    </Link>
  )
}
