// Team profiles: URL slugs, and team info + schedule from ESPN's public API
// (site.api.espn.com, no key; the per-team endpoints allow browser requests).
import { useEffect, useState } from 'react'
import espnTeamIds from './espnTeamIds.js'

const ESPN = 'https://site.api.espn.com/apis/site/v2/sports/football/college-football'

// Lowercase letters and digits only, for matching names across sources ("Hawai'i" = "Hawaii").
export const normName = (s) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')

// URL slug for a team name as the stats tables spell it: "Texas A&M" -> "texas-am",
// "Miami (OH)" -> "miami-oh", "San José State" -> "san-jose-state".
export const teamSlug = (name) =>
  (name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['&]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const teamPath = (name) => `/college-football/teams/${teamSlug(name)}`

const ESPN_IDS = Object.fromEntries(Object.entries(espnTeamIds).map(([name, id]) => [normName(name), id]))

// A team's logo for dark backgrounds, resized by ESPN's image server (every FBS team has one).
export const teamLogo = (name, size = 64) => {
  const id = ESPN_IDS[normName(name)]
  return id ? `https://a.espncdn.com/combiner/i?img=/i/teamlogos/ncaa/500-dark/${id}.png&h=${size}&w=${size}` : null
}

const getJson = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url} ${r.status}`)
    return r.json()
  })

// The logo drawn for dark backgrounds when ESPN has one.
const logoOf = (team) => {
  const logos = team?.logos ?? []
  return (logos.find((l) => l.rel?.includes('dark')) ?? logos[0])?.href ?? null
}

// ESPN ranks unranked teams 99.
const apRank = (r) => (r && r < 99 ? r : null)

function toGame(event, teamId) {
  const c = event.competitions?.[0] ?? {}
  const us = c.competitors?.find((x) => x.team?.id === teamId)
  const them = c.competitors?.find((x) => x.team?.id !== teamId)
  const completed = !!c.status?.type?.completed
  const score = (x) => (x?.score?.value ?? (x?.score != null ? Number(x.score) : null))
  return {
    id: event.id,
    week: event.week?.number ?? null,
    postseason: event.seasonType?.type === 3,
    note: c.notes?.[0]?.headline ?? null,
    date: event.date,
    timeValid: event.timeValid !== false && c.timeValid !== false,
    completed,
    state: c.status?.type?.state ?? null, // pre | in | post
    site: c.neutralSite ? 'neutral' : us?.homeAway === 'home' ? 'home' : 'away',
    venue: c.venue?.fullName ?? null,
    city: [c.venue?.address?.city, c.venue?.address?.state].filter(Boolean).join(', ') || null,
    tv: c.broadcasts?.[0]?.media?.shortName ?? null,
    us: completed ? score(us) : null,
    them: completed ? score(them) : null,
    won: completed ? !!us?.winner : null,
    rank: apRank(us?.curatedRank?.current),
    opp: {
      id: them?.team?.id ?? null,
      name: them?.team?.location ?? them?.team?.displayName ?? 'TBD',
      abbr: them?.team?.abbreviation ?? '',
      logo: logoOf(them?.team),
      rank: apRank(them?.curatedRank?.current),
    },
  }
}

const average = (xs) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : null)

// One team's ESPN profile and schedule, both from the schedule endpoint. (ESPN's /teams/{id}
// endpoint stopped sending CORS headers in October 2026, so browsers can't read it.)
// `name` is the stats tables' team name.
// status: 'idle' | 'loading' | 'error' | 'ready'; when ready: { team, games }
export function useEspnTeam(name, season) {
  const key = name ? `${name}:${season ?? ''}` : null
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!key) return
    let cancelled = false
    Promise.resolve()
      .then(() => {
        const id = ESPN_IDS[normName(name)]
        if (!id) throw new Error(`No ESPN id for ${name}; add it to lib/espnTeamIds.js`)
        const q = season ? `?season=${season}` : ''
        return getJson(`${ESPN}/teams/${id}/schedule${q}`).then((s) => {
          const team = s.team ?? {}
          const games = (s.events ?? []).map((e) => toGame(e, id)).sort((a, b) => a.date.localeCompare(b.date))
          const played = games.filter((g) => g.completed && g.us != null && g.them != null)
          // The current AP rank rides on the next game, or on the last one once the season is over.
          const current = games.find((g) => !g.completed) ?? games[games.length - 1]
          return {
            team: {
              id,
              name: team.displayName,
              nickname: team.name,
              abbr: team.abbreviation,
              color: team.color ? `#${team.color}` : null,
              logo: `https://a.espncdn.com/i/teamlogos/ncaa/500-dark/${id}.png`,
              rank: current?.rank ?? null,
              standing: team.standingSummary ?? null,
              record: team.recordSummary ?? null,
              pointsFor: average(played.map((g) => g.us)),
              pointsAgainst: average(played.map((g) => g.them)),
            },
            games,
          }
        })
      })
      .then(
        (data) => !cancelled && setResult({ key, data }),
        (error) => {
          console.error('Failed to load ESPN team', error)
          if (!cancelled) setResult({ key, error: true })
        },
      )
    return () => {
      cancelled = true
    }
  }, [key, name, season])

  if (!key) return { status: 'idle' }
  if (!result || result.key !== key) return { status: 'loading' }
  if (result.error) return { status: 'error' }
  return { status: 'ready', ...result.data }
}

// ---------------------------------------------------------------------
// Passing by zone, charted from ESPN's play-by-play text ("pass complete short right to …").
// ESPN writes short/deep and left/middle/right on most throws; sacks, and some interceptions
// and touchdowns, carry no direction and stay uncharted.
// ---------------------------------------------------------------------

export const ZONES = ['deep-left', 'deep-middle', 'deep-right', 'short-left', 'short-middle', 'short-right']

const ZONE_RE = /\b(short|deep) (left|middle|right)\b/i
const isPassPlay = (type, text) =>
  /pass|intercept/i.test(type) && !/two.?point|conversion/i.test(type) && !/no play/i.test(text)

// Success, as usual: 50% of the yards needed on 1st down, 70% on 2nd, all of them on 3rd/4th.
const successful = (down, distance, gained, td) => {
  if (td) return true
  if (!down || distance == null) return gained > 0
  const need = down === 1 ? 0.5 : down === 2 ? 0.7 : 1
  return gained >= need * distance
}

// Every pass play in one game: { off (ESPN team id), zone | null, complete, int, td, yards, success }.
const gamePasses = new Map()
function loadGamePasses(eventId) {
  if (!gamePasses.has(eventId)) {
    const p = getJson(`${ESPN}/summary?event=${eventId}`)
      .then((j) =>
        (j.drives?.previous ?? []).flatMap((d) =>
          (d.plays ?? [])
            .filter((p) => isPassPlay(p.type?.text ?? '', p.text ?? ''))
            .map((p) => {
              const type = p.type?.text ?? ''
              const text = p.text ?? ''
              const z = text.match(ZONE_RE)
              const int = /intercept/i.test(type) || /intercepted/i.test(text)
              const td = type === 'Passing Touchdown'
              const complete = !int && (td || /pass complete/i.test(text) || type === 'Pass Reception')
              const yards = complete ? (p.statYardage ?? 0) : 0
              return {
                off: p.start?.team?.id ?? d.team?.id ?? null,
                zone: z ? `${z[1]}-${z[2]}`.toLowerCase() : null,
                complete,
                int,
                td,
                yards,
                success: !int && successful(p.start?.down, p.start?.distance, yards, td),
              }
            }),
        ),
      )
      .catch((e) => {
        gamePasses.delete(eventId) // let a later visit try again
        throw e
      })
    gamePasses.set(eventId, p)
  }
  return gamePasses.get(eventId)
}

const emptyZone = () => ({ att: 0, cmp: 0, yds: 0, td: 0, int: 0, succ: 0 })
function tally(plays) {
  const zones = Object.fromEntries(ZONES.map((z) => [z, emptyZone()]))
  for (const p of plays) {
    if (!p.zone) continue
    const z = zones[p.zone]
    z.att++
    z.cmp += p.complete ? 1 : 0
    z.yds += p.yards
    z.td += p.td ? 1 : 0
    z.int += p.int ? 1 : 0
    z.succ += p.success ? 1 : 0
  }
  return { total: plays.length, charted: plays.filter((p) => p.zone).length, zones }
}

// Throws by zone in a team's completed games: `off` = its own, `def` = its opponents'.
// Pass `enabled` false to skip the fetch (each game's play-by-play is ~0.5 MB).
// status: 'idle' | 'loading' | 'error' | 'ready'
export function usePassZones(teamId, eventIds, enabled) {
  const key = enabled && teamId && eventIds.length ? `${teamId}:${eventIds.join(',')}` : null
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!key) return
    let cancelled = false
    Promise.all(key.split(':')[1].split(',').map(loadGamePasses)).then(
      (games) => {
        if (cancelled) return
        const plays = games.flat()
        setResult({ key, off: tally(plays.filter((p) => p.off === teamId)), def: tally(plays.filter((p) => p.off !== teamId)) })
      },
      (error) => {
        console.error('Failed to load play-by-play', error)
        if (!cancelled) setResult({ key, error: true })
      },
    )
    return () => {
      cancelled = true
    }
  }, [key, teamId])

  if (!key) return { status: 'idle' }
  if (!result || result.key !== key) return { status: 'loading' }
  if (result.error) return { status: 'error' }
  return { status: 'ready', off: result.off, def: result.def, games: eventIds.length }
}
