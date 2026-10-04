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
    opp: {
      id: them?.team?.id ?? null,
      name: them?.team?.location ?? them?.team?.displayName ?? 'TBD',
      abbr: them?.team?.abbreviation ?? '',
      logo: logoOf(them?.team),
      rank: apRank(them?.curatedRank?.current),
    },
  }
}

// One team's ESPN profile and schedule. `name` is the stats tables' team name.
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
        return Promise.all([getJson(`${ESPN}/teams/${id}`), getJson(`${ESPN}/teams/${id}/schedule${q}`)]).then(
          ([t, s]) => {
            const team = t.team
            const stats = Object.fromEntries((team.record?.items?.[0]?.stats ?? []).map((x) => [x.name, x.value]))
            const games = (s.events ?? []).map((e) => toGame(e, id)).sort((a, b) => a.date.localeCompare(b.date))
            return {
              team: {
                id,
                name: team.displayName,
                nickname: team.name,
                abbr: team.abbreviation,
                color: team.color ? `#${team.color}` : null,
                altColor: team.alternateColor ? `#${team.alternateColor}` : null,
                logo: logoOf(team),
                rank: apRank(team.rank),
                standing: team.standingSummary ?? null,
                record: team.record?.items?.[0]?.summary ?? null,
                pointsFor: stats.avgPointsFor ?? null,
                pointsAgainst: stats.avgPointsAgainst ?? null,
              },
              games,
            }
          },
        )
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
