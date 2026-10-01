// Data hooks for the members area.
// Local dev can preview page states with ?preview=live | pending | off.
import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from '../auth/AuthProvider.jsx'

function previewState() {
  if (!import.meta.env.DEV) return null
  return new URLSearchParams(window.location.search).get('preview')
}

// Today's date in Eastern time, as YYYY-MM-DD (matches a Postgres `date` column).
const todayET = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

// status: 'locked' | 'pending' | 'live' | 'off'
export function useProjections() {
  const { user, hasTier, authLoading, accountLoading } = useAuth()
  const allowed = !!user && hasTier('player_projections')
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!allowed) return
    let cancelled = false
    // Projections expire the day after their game_date. RLS enforces the same rule server-side.
    supabase
      .from('projections_cfb_thursday')
      .select('*')
      .gte('game_date', todayET())
      .order('name')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error('Failed to load projections', error)
        setResult(data ?? [])
      })
    return () => {
      cancelled = true
    }
  }, [allowed])

  const p = previewState()
  if (p === 'live') return { status: 'live', rows: [], skeleton: true, updatedAt: null }
  if (p === 'pending') return { status: 'pending' }
  if (p === 'off') return { status: 'off' }

  if (authLoading || accountLoading) return { status: 'live', rows: [], skeleton: true, updatedAt: null }
  if (!allowed) return { status: 'locked' }
  if (result === null) return { status: 'live', rows: [], skeleton: true, updatedAt: null }
  if (result.length === 0) return { status: 'pending' }

  const updatedAt = result.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), result[0].updated_at)
  return { status: 'live', rows: result, week: result[0].week, updatedAt }
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
