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

// One table per slate day, all with the same columns (see PROJECTION_COLUMNS).
const PROJECTION_SLATES = [
  { day: 'thursday', label: 'Thursday', table: 'projections_cfb_thursday' },
  { day: 'friday', label: 'Friday', table: 'projections_cfb_friday' },
  { day: 'saturday', label: 'Saturday', table: 'projections_cfb_saturday' },
]

const byName = (a, b) => (a.name ?? '').localeCompare(b.name ?? '')

// Newest row timestamp in a slate, or null. The projection tables are written
// outside this repo, so accept whichever timestamp column they carry.
const TIMESTAMP_COLUMNS = ['updated_at', 'last_updated', 'created_at', 'inserted_at']
function latestTimestamp(rows) {
  let max = null
  for (const r of rows) {
    for (const col of TIMESTAMP_COLUMNS) {
      const t = Date.parse(r[col])
      if (!Number.isNaN(t) && (max === null || t > max)) max = t
    }
  }
  return max === null ? null : new Date(max).toISOString()
}

// PostgREST caps each response at the project's max rows (1000 by default), so
// fetch in pages until a short page comes back. `build` returns a fresh query.
const PAGE_SIZE = 1000
export async function fetchAll(build) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < PAGE_SIZE) return rows
  }
}

// status: 'locked' | 'pending' | 'live' | 'off'
// When live, `slates` lists each day that has projections, in day order:
// { day, label, rows, week, updatedAt }
export function useProjections() {
  const { user, hasTier, authLoading, accountLoading } = useAuth()
  const allowed = !!user && hasTier('player_projections')
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!allowed) return
    let cancelled = false
    // Projections expire the day after their game_date. RLS enforces the same rule server-side.
    const today = todayET()
    Promise.all(
      PROJECTION_SLATES.map(({ table }) =>
        // Stable order so pages don't overlap or skip rows.
        fetchAll(() =>
          supabase.from(table).select('*').gte('game_date', today).order('team').order('name').order('position'),
        ).catch((error) => {
          console.error(`Failed to load ${table}`, error)
          return []
        }),
      ),
    ).then((tables) => {
      if (cancelled) return
      setResult(
        PROJECTION_SLATES.map((s, i) => ({ ...s, rows: tables[i].sort(byName) }))
          .filter((s) => s.rows.length > 0)
          .map((s) => ({
            ...s,
            week: s.rows[0].week,
            updatedAt: latestTimestamp(s.rows),
          })),
      )
    })
    return () => {
      cancelled = true
    }
  }, [allowed])

  const skeleton = { status: 'live', slates: [], skeleton: true }
  const p = previewState()
  if (p === 'live') return skeleton
  if (p === 'pending') return { status: 'pending' }
  if (p === 'off') return { status: 'off' }

  if (authLoading || accountLoading) return skeleton
  if (!allowed) return { status: 'locked' }
  if (result === null) return skeleton
  if (result.length === 0) return { status: 'pending' }
  return { status: 'live', slates: result }
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

function fetchWide(table, season) {
  return fetchAll(() => supabase.from(table).select('*').eq('season', season))
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
