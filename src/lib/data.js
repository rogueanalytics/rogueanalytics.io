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

// ---------------------------------------------------------------------
// Team rankings. The CFB Command Center publishes three tables and a meta
// table (one row per table and season, with the column definitions). The
// site only reads them; ranks are computed in the browser (lib/rank.js).
// ---------------------------------------------------------------------

// Newest season's meta rows, keyed by table name.
// status: 'loading' | 'error' | 'empty' | 'ready'
export function useTeamStatsMeta() {
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('team_stats_meta')
      .select('*')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error('Failed to load team_stats_meta', error)
        setResult(error ? { error: true } : { rows: data ?? [] })
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  const retry = () => {
    setResult(null)
    setAttempt((n) => n + 1)
  }

  if (!result) return { status: 'loading' }
  if (result.error) return { status: 'error', retry }
  if (result.rows.length === 0) return { status: 'empty' }
  const season = Math.max(...result.rows.map((m) => m.season))
  const byTable = Object.fromEntries(result.rows.filter((m) => m.season === season).map((m) => [m.table_name, m]))
  return { status: 'ready', season, byTable }
}

async function fetchWide(table, season) {
  const { data, error } = await supabase.from(table).select('*').eq('season', season)
  if (error) throw error
  return data
}

// One team per row for a view's table (all three are wide: one column per stat), fetched
// whole. Results are cached so switching back is instant.
// status: 'loading' | 'error' | 'ready'
export function useTeamStatsRows(table, season) {
  const key = table && season != null ? `${table}:${season}` : null
  const [cache, setCache] = useState({})
  const entry = key ? cache[key] : null

  useEffect(() => {
    if (!key || entry) return
    let cancelled = false
    fetchWide(table, season).then(
      (rows) => !cancelled && setCache((c) => ({ ...c, [key]: { rows } })),
      (error) => {
        console.error(`Failed to load ${table}`, error)
        if (!cancelled) setCache((c) => ({ ...c, [key]: { error: true } }))
      },
    )
    return () => {
      cancelled = true
    }
  }, [key, entry, table, season])

  const retry = () =>
    setCache((c) => {
      const next = { ...c }
      delete next[key]
      return next
    })

  if (!entry) return { status: 'loading' }
  if (entry.error) return { status: 'error', retry }
  return { status: 'ready', rows: entry.rows }
}
