import { useEffect } from 'react'

// Per-route <title> and meta description. On unmount it falls back to a plain site title
// (index.html's title is the homepage's, which would mislabel other pages).
const DEFAULT_TITLE = 'Rogue Analytics'
const descTag = () => document.querySelector('meta[name="description"]')
const DEFAULT_DESC = typeof document !== 'undefined' ? descTag()?.getAttribute('content') ?? '' : ''

export function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title
    if (description) descTag()?.setAttribute('content', description)
    return () => {
      document.title = DEFAULT_TITLE
      descTag()?.setAttribute('content', DEFAULT_DESC)
    }
  }, [title, description])
}
