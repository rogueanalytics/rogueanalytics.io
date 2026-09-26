// Data hooks for the members area. Phase 4 replaces these with Supabase queries.
// Until then, local dev can preview page states with ?preview=live | pending | off.

function previewState() {
  if (!import.meta.env.DEV) return null
  return new URLSearchParams(window.location.search).get('preview')
}

// status: 'locked' | 'pending' | 'live' | 'off'
export function useProjections() {
  const p = previewState()
  if (p === 'live') return { status: 'live', rows: [], skeleton: true, updatedAt: null }
  if (p === 'pending') return { status: 'pending' }
  if (p === 'off') return { status: 'off' }
  return { status: 'locked' }
}

export function useGamebooks() {
  const p = previewState()
  if (p === 'live') {
    return {
      skeleton: true,
      freePreview: { id: 'preview' },
      days: [
        { day: 'Thursday', games: [{ id: 't1' }] },
        { day: 'Friday', games: [{ id: 'f1' }, { id: 'f2' }] },
        { day: 'Saturday', games: [{ id: 's1' }, { id: 's2' }, { id: 's3' }, { id: 's4' }] },
      ],
    }
  }
  return { freePreview: null, days: [] }
}
