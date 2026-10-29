// Conversion events. Does nothing until the Google tag (gtag.js) is loaded in index.html.
// Never pass personal data (ids, emails, Discord names) in props.
export function track(name, props = {}) {
  if (typeof window === 'undefined') return
  if (typeof window.gtag === 'function') window.gtag('event', name, props)
  if (import.meta.env.DEV) console.debug('[track]', name, props)
}
