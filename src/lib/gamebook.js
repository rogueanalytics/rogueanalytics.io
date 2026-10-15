// Game Book data. The CFB Command Center builds, audits and publishes one payload per game
// (its gamebook.py); the site only reads it:
//   gamebook_slate  one row per published game: identity, conferences, records and the
//                   consensus quote, copied from the payload. The landing page (public read)
//   gamebook        the payload; RLS returns it to Game Book subscribers, and to anyone
//                   for the week's free preview (supabase/migrations/0005_gamebook_read.sql)
// Ranks come from ESPN's scoreboard (public, browser-readable), keyed by the same game id.
// Local dev can preview real books with ?preview=sample: src/dev/gamebooks, written by the
// Command Center's `app.cli gamebook --site-fixture`.
import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { useAuth } from '../auth/AuthProvider.jsx'

const previewSample = () =>
  import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'sample'

// Behind the DEV constant so a production build drops the fixtures entirely.
const devSlate = import.meta.env.DEV
  ? () => import('../dev/gamebooks/slate.json').then((m) => m.default)
  : () => Promise.resolve([])
const devBooks = import.meta.env.DEV ? import.meta.glob('../dev/gamebooks/books/*.json') : {}
const devBook = (id) => {
  const load = devBooks[`../dev/gamebooks/books/${id}.json`]
  return load ? load().then((m) => m.default) : Promise.resolve(null)
}

// Listing rows still worth showing: games from the last 18 hours on.
const RECENT_MS = 18 * 60 * 60 * 1000
const SLATE_COLUMNS =
  'game_id, season, week, kickoff, away_team, home_team, free_preview, status, venue, neutral_site, ' +
  'away_conference, home_conference, away_abbr, home_abbr, away_record, home_record, spread, total, ' +
  'home_moneyline, away_moneyline, home_novig_prob, away_novig_prob, market_as_of'

const byKickoff = (a, b) =>
  (a.kickoff ?? '').localeCompare(b.kickoff ?? '') || a.home_team.localeCompare(b.home_team)

// status: 'loading' | 'error' | 'ready'; when ready: { games (kickoff order), week, season }
export function useGamebookSlate() {
  const [result, setResult] = useState(null)

  useEffect(() => {
    let cancelled = false
    const done = (r) => !cancelled && setResult(r)
    if (previewSample()) {
      devSlate().then((games) => done({ games: [...games].sort(byKickoff) }))
      return () => {
        cancelled = true
      }
    }
    const since = new Date(Date.now() - RECENT_MS).toISOString()
    supabase
      .from('gamebook_slate')
      .select(SLATE_COLUMNS)
      .gte('kickoff', since)
      .order('kickoff')
      .order('home_team')
      .then(({ data, error }) => {
        if (error) console.error('Failed to load gamebook_slate', error)
        done(error ? { error: true } : { games: data ?? [] })
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!result) return { status: 'loading' }
  if (result.error) return { status: 'error' }
  const g = result.games
  return { status: 'ready', games: g, season: g[0]?.season ?? null, week: g[0]?.week ?? null }
}

// One game's book.
// status: 'loading' | 'error' | 'missing' | 'locked' | 'ready'; when ready: { book }
// 'locked' = the game is published but RLS withheld the payload (signed out, or no plan).
export function useGamebook(gameId) {
  const { user, authLoading, accountLoading } = useAuth()
  const [result, setResult] = useState(null)
  const id = Number(gameId)
  const valid = Number.isInteger(id) && id > 0
  const key = `${id}:${user?.id ?? 'anon'}`

  useEffect(() => {
    if (!valid || authLoading) return
    let cancelled = false
    const done = (r) => !cancelled && setResult({ key, ...r })
    if (previewSample()) {
      devBook(id).then((book) => done(book ? { book } : { missing: true }))
      return () => {
        cancelled = true
      }
    }
    Promise.all([
      supabase.from('gamebook').select('payload').eq('game_id', id).maybeSingle(),
      supabase.from('gamebook_slate').select('game_id, away_team, home_team, kickoff').eq('game_id', id).maybeSingle(),
    ]).then(([book, slate]) => {
      if (book.error || slate.error) {
        console.error('Failed to load Game Book', book.error || slate.error)
        done({ error: true })
      } else if (book.data?.payload) done({ book: book.data.payload })
      else if (slate.data) done({ locked: true, slate: slate.data })
      else done({ missing: true })
    })
    return () => {
      cancelled = true
    }
  }, [key, id, valid, authLoading])

  if (!valid) return { status: 'missing' }
  if (authLoading || accountLoading || !result || result.key !== key) return { status: 'loading' }
  if (result.error) return { status: 'error' }
  if (result.missing) return { status: 'missing' }
  if (result.locked) return { status: 'locked', slate: result.slate }
  return { status: 'ready', book: result.book }
}

// ---------------------------------------------------------------------
// AP / CFP ranks for a week from ESPN's scoreboard: { [game_id]: { home, away } }.
// ESPN's event id is CFBD's game id, so no name matching. Ranks are display only; a failed
// fetch leaves them blank and nothing else on the page depends on them.
// ---------------------------------------------------------------------
const ESPN_BOARD = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard'
const rankCache = new Map()

export function loadRanks(season, week) {
  const key = `${season}:${week}`
  if (!rankCache.has(key)) {
    const p = fetch(`${ESPN_BOARD}?groups=80&limit=400&dates=${season}&seasontype=2&week=${week}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`ESPN ${r.status}`))))
      .then((j) => {
        const out = {}
        for (const e of j.events ?? []) {
          const ranks = {}
          for (const c of e.competitions?.[0]?.competitors ?? []) {
            const r = c.curatedRank?.current
            if (r && r <= 25 && (c.homeAway === 'home' || c.homeAway === 'away')) ranks[c.homeAway] = r
          }
          if (ranks.home || ranks.away) out[e.id] = ranks
        }
        return out
      })
      .catch((e) => {
        rankCache.delete(key) // let a later visit try again
        throw e
      })
    rankCache.set(key, p)
  }
  return rankCache.get(key)
}

// {} until loaded (or on failure): callers treat a missing rank as unranked.
export function useRanks(season, week) {
  const key = season && week ? `${season}:${week}` : null
  const [result, setResult] = useState({ key: null, ranks: {} })
  useEffect(() => {
    if (!key) return
    let cancelled = false
    loadRanks(season, week).then(
      (ranks) => !cancelled && setResult({ key, ranks }),
      (e) => console.warn('Ranks unavailable', e),
    )
    return () => {
      cancelled = true
    }
  }, [key, season, week])
  return result.key === key ? result.ranks : {}
}
