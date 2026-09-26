import { Link } from 'react-router-dom'
import { MEMBERS_ENABLED } from '../config.js'
import { signInWithDiscord } from '../lib/auth.js'
import { IconArrow, IconLogin } from './Icons.jsx'

export function DiscordButton({ children = 'Log in with Discord', className = '' }) {
  return (
    <button type="button" className={`btn btn-disc ${className}`} onClick={signInWithDiscord}>
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

export function ArrowLink({ to, children, variant = 'green', className = '' }) {
  return (
    <Link to={to} className={`btn btn-${variant} ${className}`}>
      {children}
      <IconArrow size={16} />
    </Link>
  )
}
