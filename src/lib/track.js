// Conversion events. Does nothing until an analytics provider is added to index.html.
// The Plausible script defines window.plausible; swap the call below to change providers.
// Never pass personal data (ids, emails, Discord names) in props.
export function track(name, props = {}) {
  if (typeof window === 'undefined') return
  if (typeof window.plausible === 'function') window.plausible(name, { props })
  if (import.meta.env.DEV) console.debug('[track]', name, props)
}
