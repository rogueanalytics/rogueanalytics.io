# Team profile: data the Command Center needs to publish

The team profile page (`/college-football/teams/:slug`, `src/pages/TeamProfile.jsx`) is live
with what exists today:

| Section | Source today |
| --- | --- |
| Logo, colours, record, AP rank, standing, next game | ESPN `site.api.espn.com/.../teams/{id}` |
| Season strip, schedule tab | ESPN `.../teams/{id}/schedule` |
| Hero tiles, fingerprint, scatter, down/play type, notes, stat tabs | `team_stats_basic`, `team_stats_advanced`, `team_stats_adjusted` |

The mockup's other sections are hidden until the Command Center publishes the tables below.
Each table follows the existing pattern: the Command Center writes with the service-role key,
the site reads with the anon key, and a migration grants public read (copy
`supabase/migrations/0002_team_stats_read.sql`, swapping in the new table names).

All endpoints are CollegeFootballData (`https://api.collegefootballdata.com`, Bearer key).
Team names should match the `team` column of the existing tables, so the site can join on them.

---

## 1. `team_ratings`: power rating, its trend, special teams tile

Lights up the hero's power rank, its week-by-week trend line, and the special teams tile.

| Endpoint | Use |
| --- | --- |
| `GET /ratings/sp?year=` | SP+ overall, offense, defense, special teams (until a Rogue rating exists) |
| `GET /ratings/elo?year=&week=` | Elo by week, for the trend line (one call per completed week) |
| `GET /ratings/srs?year=` | Optional second opinion |

One row per team per week (week 0 = preseason):

```
season int, week int, team text, conference text,
rating numeric, rank int,                 -- overall
offense numeric, defense numeric, special_teams numeric,
special_teams_rank int,
source text,                              -- 'sp', 'elo', 'rogue'
generated_at timestamptz
primary key (season, week, team, source)
```

## 2. `team_games`: lines, win chance, per-game numbers

Lights up: the season strip's closing-spread tick and its "Post-game WP" / "EPA" toggles,
win chance and spread on upcoming games, the ATS tile, projected wins, and how hard the
remaining schedule is.

| Endpoint | Use |
| --- | --- |
| `GET /games?year=&seasonType=both` | Game ids, weeks, teams, scores, post-game win probability (`homePostgameWinProbability`) |
| `GET /lines?year=` | Closing spread and total (use one provider consistently; consensus if present) |
| `GET /metrics/wp/pregame?year=` | Pre-game win probability, for upcoming games |
| `GET /stats/game/advanced?year=` | Per-game offense/defense EPA, success rate, explosiveness |

One row per team per game, from that team's side (each game is two rows):

```
season int, week int, season_type text, game_id bigint, start_date timestamptz,
team text, opponent text, home_away text,   -- 'home' | 'away' | 'neutral'
points_for int, points_against int,          -- null until played
spread numeric,                              -- closing, from this team's side (−7 = favoured by 7)
over_under numeric,
pregame_wp numeric, postgame_wp numeric,     -- 0..1
covered boolean,                             -- null until played or on a push
off_epa numeric, def_epa numeric, off_success numeric, def_success numeric,
generated_at timestamptz
primary key (season, game_id, team)
```

The site can then work out ATS, projected wins (wins so far + the sum of `pregame_wp` over the
games left) and how hard the rest of the schedule is (opponents' `team_ratings` averaged over the
games left). The Command Center could also publish those as columns if it prefers.

## 3. `team_drive_outcomes`: "How drives end"

| Endpoint | Use |
| --- | --- |
| `GET /drives?year=` | Every drive with `driveResult` (TD, FG, PUNT, INT, FUMBLE, DOWNS, END OF HALF, …) |

Group results into td / fg / punt / turnover (INT, FUMBLE, and their TD variants) / downs / other.
Leave out garbage time to match the other tables (`team_stats_meta.garbage_time_excluded`).

```
season int, team text,                       -- team = 'FBS' for the FBS-wide average row
side text,                                   -- 'off' (their drives) | 'def' (opponents' drives)
drives int, td int, fg int, punt int, turnover int, downs int, other int,
generated_at timestamptz
primary key (season, team, side)
```

## 4. `team_down_splits`: play calling by down

The live page shows standard and passing downs from `team_stats_advanced`. The mockup's grid
by 1st / 2nd / 3rd-and-4th down needs play-by-play.

| Endpoint | Use |
| --- | --- |
| `GET /plays?year=&week=` | Play-by-play, one call per week; keep `down`, `playType`, `ppa`, offense/defense |

Success follows the usual definition: at least 50% of the yards needed on 1st down, 70% on 2nd,
100% on 3rd and 4th.

```
season int, team text, side text,            -- 'off' | 'def'
down int,                                    -- 1, 2, 3 (3 = 3rd and 4th)
plays int, pass_rate numeric,
success_rate numeric, epa numeric,
rush_success_rate numeric, pass_success_rate numeric,
generated_at timestamptz
primary key (season, team, side, down)
```

## 5. `player_season`: key players (and the player pages)

| Endpoint | Use |
| --- | --- |
| `GET /roster?year=` | Id, name, position, jersey, year (class), height, weight, hometown |
| `GET /stats/player/season?year=` | Counting stats by category (passing, rushing, receiving, defensive, interceptions, …) |
| `GET /ppa/players/season?year=` | EPA (PPA) per play and total, split by pass/rush and down type |
| `GET /player/usage?year=` | Usage rates |
| `GET /recruiting/players?year=` | Stars and rating (one call per recruiting class) |

Percentiles should be computed in the Command Center, among FBS players at the same position,
with a minimum-snaps or minimum-plays cutoff so backups with three snaps don't rank first.

```
season int, team text, player_id bigint,     -- CFBD athlete id
espn_id text null,                           -- for headshots: a.espncdn.com/i/headshots/college-football/players/full/{espn_id}.png
name text, position text, position_group text, jersey int, class text,
height int, weight int, hometown text,
stats jsonb,                                 -- { "passing.YDS": 1612, "rushing.CAR": 71, ... }
ppa_avg numeric, ppa_total numeric, usage numeric,
percentile int,                              -- overall, within position
percentiles jsonb,                           -- per metric, e.g. { "pass": 96, "deep": 88 }
key_player boolean,                          -- top N per team, so the site can show these first
generated_at timestamptz
primary key (season, player_id)
```

## 6. `team_position_rooms`: position rooms

These are built from `player_season`: weight each room's players by snaps or usage, then rank
every room against the same room on every FBS team. CFBD's `GET /talent?year=` (team talent
composite) can stand in at team level.

Depth-chart order and injuries are not in CFBD. ESPN's core API has depth charts
(`sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/{year}/teams/{id}/depthcharts`),
and the Command Center could save them nightly. That endpoint doesn't allow browser requests, so
it has to go through the Command Center.

```
season int, team text, room text,            -- QB, RB, WR/TE, OL, DL, LB, DB, K/P
score numeric,                               -- 0–100
rank int,
starters jsonb,                              -- [{ player_id, name, injured: bool }]
generated_at timestamptz
primary key (season, team, room)
```

---

## Order to build them

1. `team_games`: the most visible change (spreads, win chance, ATS, projected wins), and cheap to fetch.
2. `team_ratings`: the hero's headline number.
3. `team_drive_outcomes`: one endpoint, a simple group-by.
4. `player_season`: unlocks key players and the player pages.
5. `team_down_splits` and `team_position_rooms`: these need play-by-play and player work first.
