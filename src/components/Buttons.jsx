import { Link, useLocation } from 'react-router-dom'
import { MEMBERS_ENABLED } from '../config.js'
import { useAuth } from '../auth/AuthProvider.jsx'
import { IconArrow, IconLogin } from './Icons.jsx'
import { track } from '../lib/track.js'

export function DiscordButton({ children = 'Log in with Discord', className = '' }) {
  const { signInWithDiscord } = useAuth()
  const { pathname } = useLocation()
  // Return to the page the visitor was on after Discord sign-in.
  const onClick = () => {
    track('sign_in_start', { from: pathname })
    signInWithDiscord(pathname).catch((e) => console.error('Discord sign-in failed', e))
  }
  return (
    <button type="button" className={`btn btn-disc ${className}`} onClick={onClick}>
      <IconLogin size={16} />
      {children}
    </button>
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
  return <DiscordButton className={className}>Log in with Discord to subscribe</DiscordButton>
}

export function ArrowLink({ to, children, variant = 'green', className = '', onClick }) {
  return (
    <Link to={to} className={`btn btn-${variant} ${className}`} onClick={onClick}>
      {children}
      <IconArrow size={16} />
    </Link>
  )
}
