import { Fragment, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import Seam from '../components/Seam.jsx'
import PricingTable from '../components/PricingTable.jsx'
import { ArrowLink } from '../components/Buttons.jsx'
import { IconArrow, IconCheck, IconDash } from '../components/Icons.jsx'
import { DROP_SCHEDULE, PRODUCTS } from '../config.js'
import { perText, priceText } from '../lib/products.js'
import { track } from '../lib/track.js'
import { usePageMeta } from '../lib/usePageMeta.js'
import '../styles/home.css'

const TITLE = 'College Football Player Projections | Rogue Analytics'
const DESCRIPTION =
  'Player-level college football projections, built bottom-up from team models. Download as .csv for your own analysis.'

const [weekday, saturday] = DROP_SCHEDULE

// Hero preview. Real players, made-up but realistic values: a layout illustration, never model
// output. Check the names against current rosters before each season.
const SAMPLE_COLUMNS = ['Pass Yds', 'Rush Yds', 'Rec Yds', 'Any TD']
const SAMPLE_ROWS = [
  ['Julian Sayin', 'QB', 'OSU', '246.5', '12.5', '–', '0.14'],
  ['Jeremiah Smith', 'WR', 'OSU', '–', '2.5', '94.5', '0.58'],
  ['Bryce Underwood', 'QB', 'MICH', '208.5', '31.5', '–', '0.27'],
  ['Jordan Marshall', 'RB', 'MICH', '–', '68.5', '11.5', '0.46'],
  ['Andrew Marsh', 'WR', 'MICH', '–', '–', '54.5', '0.31'],
]

const CHAIN = ['Team points', 'Plays', 'Pass / rush split', 'Usage shares', 'Player projections']

const Ico = ({ children }) => (
  <svg className="hm-ico" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const VALUE = [
  {
    title: 'A stat line for every projected player',
    text: 'Passing, rushing and receiving volume and yards, plus anytime touchdown, for every slate from Thursday to Saturday.',
    icon: (
      <Ico>
        <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
        <path d="M3.5 9.5h17M3.5 14.5h17M9.5 9.5v10" />
      </Ico>
    ),
  },
  {
    title: 'Built from the team up, not from the line',
    text: "Projections start from team scoring and play volume, then split down to players. Because they're independent of the market, you can compare the two.",
    icon: (
      <Ico>
        <rect x="9" y="2.5" width="6" height="4" rx="1" />
        <path d="M12 6.5V12M6 15v-3h12v3" />
        <rect x="3" y="15" width="6" height="4.5" rx="1" />
        <rect x="15" y="15" width="6" height="4.5" rx="1" />
      </Ico>
    ),
  },
  {
    title: 'Player projections, ready for your model',
    text: 'Filter by team or position, then download the player projections as a .csv whose columns match the Unabated Simulator upload format.',
    icon: (
      <Ico>
        <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
      </Ico>
    ),
  },
  {
    title: 'A guide to every game',
    soon: true,
    text: 'Game Books put the market consensus line next to the Rogue projected spread and total, with projected scores, win probabilities and opponent-adjusted team metrics. Read on the site.',
    icon: (
      <Ico>
        <rect x="3" y="5" width="18" height="14" rx="1.5" />
        <path d="M12 5v14" />
        <circle cx="12" cy="12" r="2.5" />
      </Ico>
    ),
  },
]

const FAQ = [
  [
    'What is Rogue Analytics?',
    "An independent college sports analytics shop. We publish player projections and game-level analysis for people who do their own research. We don't sell picks.",
  ],
  ['Who are the products for?', 'Anyone who works from their own numbers: bettors and traders checking their models, market makers who want an independent read, sports modelers, and fans who want more than the box score.'],
  [
    "What's the difference between a Game Book and Player Projections?",
    'A Game Book is game-level analysis you read on the site: the market consensus line, the Rogue projected spread and total, projected scores and win probabilities, and the team metrics behind them. Player Projections include every Game Book, plus a projected stat line for every player on the slate that you can download.',
  ],
  [
    'When are projections published?',
    `Weekday slates post at ${weekday.time} on game day. The Saturday slate posts Friday at ${saturday.time}. Each table shows its last-updated time, and a slate stays up through game day.`,
  ],
  ['How do I access my subscription?', 'Sign in with Discord. Your plan unlocks the projection table on this site.'],
  [
    'Can I use the projections in my own model?',
    'Yes. Download any filtered view of the player projections as a .csv. The columns match the Unabated Simulator upload format.',
  ],
  [
    'Can I download game-level numbers like projected totals?',
    'No. Game-level numbers, including spreads and totals, are in Game Books, which you read on the site. Downloads cover player projections only.',
  ],
  [
    'Are the projections guaranteed to be accurate?',
    'No. Projections are statistical estimates, and real games vary. Use them as one input to your own decisions.',
  ],
  [
    'When is college basketball coming?',
    'College basketball player projections are in development. See the college basketball page for launch details.',
  ],
]

const FAQ_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
}

function Illustrative({ children = 'Illustrative · sample values' }) {
  return <span className="hm-illus">{children}</span>
}

function Hero() {
  return (
    <section className="dark hm-hero" data-section="hero">
      <div className="wrap hm-hero-grid">
        <div className="hm-hero-copy">
          <span className="eb">College football player projections</span>
          <h1 className="disp hm-h1">See the game beyond the numbers.</h1>
          <p className="lede hm-lede">
            Player-level projections for college football, built bottom-up from team models. Check them against your own
            numbers and find your own edge.
          </p>
          <div className="btn-row">
            <ArrowLink to="/sports/ncaaf" onClick={() => track('hero_cta_click', { label: 'Explore Projections' })}>
              Explore Projections
            </ArrowLink>
            <Link className="btn btn-ghost" to="/#how-it-works">
              See How It Works
            </Link>
          </div>
          <div className="hm-sports">
            <span className="hm-sport">
              <span className="hm-sport-dot" aria-hidden="true" />
              College football · live now
            </span>
            <Link className="hm-sport hm-sport--soon" to="/college-basketball">
              <span className="hm-sport-dot" aria-hidden="true" />
              College basketball · coming soon
            </Link>
          </div>
          <p className="hm-support">Independent analysis. Actionable data. Your decisions.</p>
        </div>

        <figure className="hm-preview">
          <div className="hm-preview-head">
            <span className="hm-preview-title">College Football Player Projections</span>
            <span className="hm-seg" aria-hidden="true">
              <span>Thu</span>
              <span>Fri</span>
              <span className="on">Sat</span>
            </span>
            <Illustrative />
          </div>
          <div className="hm-preview-scroll">
            <table className="hm-ptable">
              <caption className="sr-only">
                Illustrative layout of the projection table. Player names are real; the values are samples, not
                projections.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Player</th>
                  <th scope="col">Pos</th>
                  <th scope="col">Team</th>
                  {SAMPLE_COLUMNS.map((c) => (
                    <th scope="col" key={c} className="num">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SAMPLE_ROWS.map(([name, pos, team, ...vals]) => (
                  <tr key={name}>
                    <th scope="row">{name}</th>
                    <td className="hm-pos">{pos}</td>
                    <td className="hm-pos">{team}</td>
                    {vals.map((v, i) => (
                      <td key={SAMPLE_COLUMNS[i]} className="num">
                        {v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <figcaption className="hm-preview-foot">
            <span>
              <span className="dot" aria-hidden="true" /> Saturday slate drops Friday {saturday.time}
            </span>
            <span>.csv · Unabated Simulator format</span>
          </figcaption>
        </figure>
      </div>
    </section>
  )
}

function Value() {
  return (
    <section className="section hm-value" data-section="value">
      <div className="wrap">
        <div className="hm-head">
          <span className="eb eb--ink">What you get</span>
          <h2 className="disp hm-h2">The data you need. Without the noise.</h2>
          <p className="body body-lg">No picks and no plays of the day. Numbers you can check against your own work.</p>
        </div>
        <div className="hm-value-grid">
          {VALUE.map((v) => (
            <div className="hm-value-item" key={v.title}>
              {v.icon}
              <div>
                <h3 className="hm-h3">
                  {v.title}
                  {v.soon && <span className="hm-status">Coming soon</span>}
                </h3>
                <p className="body small-body">{v.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function GameBookMini() {
  return (
    <div className="hm-mini" aria-label="Illustrative Game Book matchup preview">
      <div className="hm-vs hm-vs--head">
        <span>Away</span>
        <span>Off. EPA / play</span>
        <span>Home</span>
      </div>
      <div className="hm-vs">
        <span>.18</span>
        <span className="hm-vs-bars" aria-hidden="true">
          <i className="l">
            <b style={{ width: '62%' }} />
          </i>
          <i className="r">
            <b style={{ width: '48%' }} />
          </i>
        </span>
        <span>.12</span>
      </div>
      <div className="hm-wp" aria-label="Win probability: away 41 percent, home 59 percent">
        <span style={{ width: '41%' }}>41%</span>
        <span>59%</span>
      </div>
      <div className="hm-mini-foot">
        <span>Rogue spread Home −3.3 · Total 51.5</span>
        <Illustrative>Illustrative</Illustrative>
      </div>
    </div>
  )
}

function PlayerMini() {
  const bars = [
    ['Pass Yds', 78, '248.5'],
    ['Rush Yds', 46, '78.2'],
    ['Rec Yds', 52, '71.9'],
  ]
  return (
    <div className="hm-mini" aria-label="Illustrative player projection preview">
      {bars.map(([label, w, v]) => (
        <div className="hm-bar" key={label}>
          <span>{label}</span>
          <i aria-hidden="true">
            <b style={{ width: `${w}%` }} />
          </i>
          <span>{v}</span>
        </div>
      ))}
      <div className="hm-mini-foot">
        <span />
        <Illustrative>Illustrative</Illustrative>
      </div>
    </div>
  )
}

function ProductCard({ product }) {
  const live = product.status === 'live'
  return (
    <article className={`hm-prod${live ? ' hm-prod--live' : ''}`}>
      <div className="hm-prod-top">
        <span className="hm-prod-sport">{product.sport}</span>
        <span className={`hm-status${live ? ' hm-status--live' : ''}`}>{live ? 'Live' : 'Coming soon'}</span>
      </div>
      <h3 className="hm-prod-name">{product.name}</h3>
      <div className={`hm-price${product.price == null ? ' hm-price--label' : ''}`}>
        <span className="disp">{priceText(product)}</span>
        {perText(product) && <span className="per">{perText(product)}</span>}
      </div>
      <p className="body small-body">{product.summary}</p>
      {product.id === 'game_book' && <GameBookMini />}
      {product.id === 'ncaaf_projections' && <PlayerMini />}
      {product.id === 'ncaab_projections' && (
        <div className="hm-mini hm-mini--empty">Basketball preview at launch</div>
      )}
      <ul className="hm-prod-list">
        {product.includes.map((t) => (
          <li key={t}>
            <IconCheck size={15} />
            <span>{t}</span>
          </li>
        ))}
        {product.excludes.map((t) => (
          <li key={t} className="x">
            <IconDash size={15} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
      <Link
        className={`btn btn-sm btn-block ${live ? 'btn-dark' : 'btn-line'}`}
        to={product.cta.to}
        onClick={() => track('product_card_click', { product: product.id })}
      >
        {product.cta.label}
        <IconArrow size={15} />
      </Link>
    </article>
  )
}

function Products() {
  return (
    <section className="section hm-alt" id="products" data-section="products">
      <div className="wrap">
        <div className="hm-head">
          <span className="eb eb--ink">Products</span>
          <h2 className="disp hm-h2">Pick the depth you need.</h2>
        </div>
        <div className="hm-grid-3">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </section>
  )
}

function InAction() {
  return (
    <section className="section hm-white" data-section="in-action">
      <div className="wrap">
        <div className="hm-head">
          <span className="eb eb--ink">See it in use</span>
          <h2 className="disp hm-h2">Read a slate the way we do.</h2>
          <p className="body body-lg">Three views, and what each one tells you.</p>
        </div>
        <div className="hm-grid-3">
          <article className="hm-act">
            <div className="hm-act-shot">
              <div className="hm-ln">
                <span>Jeremiah Smith · Rec Yds</span>
                <b>94.5</b>
              </div>
              <div className="hm-ln">
                <span>Your number</span>
                <b>88.5</b>
              </div>
              <div className="hm-ln">
                <span>Difference</span>
                <b>+6.0</b>
              </div>
              <Illustrative>Illustrative</Illustrative>
            </div>
            <div className="hm-act-body">
              <h3 className="hm-h3">Player projection</h3>
              <p className="body small-body">Each value is a projected stat for this game. Filter to a team, sort a column, export it.</p>
              <p className="hm-read">
                How to read it: a projection is a central estimate. The gap between it and your number, or a posted line,
                is where your own analysis starts.
              </p>
            </div>
          </article>
          <article className="hm-act">
            <div className="hm-act-shot">
              <div className="hm-ln">
                <span>Market consensus spread</span>
                <b>Home −2.5</b>
              </div>
              <div className="hm-ln">
                <span>Rogue projected spread</span>
                <b>Home −3.3</b>
              </div>
              <div className="hm-ln">
                <span>Projected score · total</span>
                <b>24.1 – 27.4 · 51.5</b>
              </div>
              <div className="hm-ln">
                <span>Win probability</span>
                <b>Away 41% · Home 59%</b>
              </div>
              <span className="hm-row-tags">
                <span className="hm-status">Coming soon</span>
                <Illustrative>Illustrative</Illustrative>
              </span>
            </div>
            <div className="hm-act-body">
              <h3 className="hm-h3">Game Book matchup</h3>
              <p className="body small-body">
                The game-level view, read on the site: the market's line next to ours, projected scores, and the team
                metrics behind them.
              </p>
              <p className="hm-read">
                How to read it: when the Rogue projected spread differs from the market consensus, that gap is a starting
                point for your own analysis, not a pick.
              </p>
            </div>
          </article>
          <article className="hm-act">
            <div className="hm-act-shot hm-act-shot--live">
              <div className="hm-ln">
                <span>Team Rankings</span>
                <b>Live</b>
              </div>
              <div className="hm-ln">
                <span>Raw · Advanced · Opponent-adjusted</span>
                <b>Free</b>
              </div>
              <div className="hm-ln">
                <span>Team profiles</span>
                <b>Free</b>
              </div>
              <span className="hm-shot-note">Real data, live on the site now.</span>
            </div>
            <div className="hm-act-body">
              <h3 className="hm-h3">Try it free: team rankings</h3>
              <p className="body small-body">
                Every FBS team ranked on raw, advanced and opponent-adjusted stats. It's the team layer the projections are
                built on.
              </p>
              <Link
                className="hm-text-link"
                to="/college-football/teams"
                onClick={() => track('free_tool_click', { tool: 'team_rankings' })}
              >
                Browse Team Rankings <IconArrow size={14} />
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    ['Sign in and choose a plan', 'Your Discord account is your Rogue Analytics login. Choose a plan, billed monthly.'],
    [
      'Open the board when the slate drops',
      `Weekday slates post at ${weekday.time} on game day. The Saturday slate posts Friday at ${saturday.time}. Each table shows when it was last updated.`,
    ],
    ['Apply your own analysis', 'Compare against your numbers or the market, export a .csv, and make your own call.'],
  ]
  return (
    <section className="section hm-alt" id="how-it-works" data-section="how-it-works">
      <div className="wrap">
        <div className="hm-head">
          <span className="eb eb--ink">How it works</span>
          <h2 className="disp hm-h2">From sign-in to your own model in three steps.</h2>
        </div>
        <ol className="hm-steps">
          {steps.map(([title, text], i) => (
            <li key={title}>
              <span className="step-n">Step {i + 1}</span>
              <h3 className="hm-h3">{title}</h3>
              <p className="body small-body">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Methodology() {
  return (
    <section className="section dark" id="methodology" data-section="methodology">
      <div className="wrap">
        <div className="hm-head">
          <span className="eb">Methodology</span>
          <h2 className="disp hm-h2">Modeled from the ground up.</h2>
          <p className="soft body-lg">Every player projection rolls up from a team-level forecast. Nothing is backed out of the betting line.</p>
        </div>
        <div className="chain hm-chain" aria-label="How projections are built">
          {CHAIN.map((c, i) => (
            <Fragment key={c}>
              {i > 0 && (
                <span className="chain-arrow">
                  <IconArrow size={14} />
                </span>
              )}
              <span className={`chip${i === CHAIN.length - 1 ? ' hm-chip-end' : ''}`}>{c}</span>
            </Fragment>
          ))}
        </div>
        <div className="hm-grid-3 hm-meth">
          <div>
            <h3 className="hm-h3">Independent of the market</h3>
            <p className="soft small-body">Projections never start from a posted number, so comparing them to the market gives you a real second opinion.</p>
          </div>
          <div>
            <h3 className="hm-h3">Inputs</h3>
            <p className="soft small-body">
              Team efficiency from play-by-play data, opponent-adjusted metrics, and player usage history. The team layer is
              public on the <Link className="link" to="/college-football/teams">Team Rankings</Link> page.
            </p>
          </div>
          <div className="hm-lim">
            <h3 className="hm-h3">Limitations</h3>
            <p className="soft small-body">
              Projections are estimates, not outcomes. They're published at a fixed time and can miss later news such as
              injuries. Early-season samples are small.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          track('pricing_view')
          io.disconnect()
        }
      },
      { threshold: 0.3 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <section className="section hm-white" id="pricing" data-section="pricing" ref={ref}>
      <div className="wrap">
        <div className="hm-head">
          <span className="eb eb--ink">Pricing</span>
          <h2 className="disp hm-h2">Compare products.</h2>
          <p className="body body-lg">Monthly plans, lowest to highest.</p>
        </div>
        <PricingTable />
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section className="section hm-alt" id="faq" data-section="faq">
      <div className="wrap hm-faq-wrap">
        <div className="hm-head">
          <span className="eb eb--ink">FAQ</span>
          <h2 className="disp hm-h2">Questions, answered.</h2>
        </div>
        <div className="hm-faq">
          {FAQ.map(([q, a], i) => (
            <details key={q} open={i === 0}>
              <summary>{q}</summary>
              <p className="body">{a}</p>
            </details>
          ))}
        </div>
      </div>
      <script type="application/ld+json">{JSON.stringify(FAQ_LD)}</script>
    </section>
  )
}

function Close() {
  return (
    <section className="dark hm-close" data-section="close">
      <div className="wrap hm-close-in">
        <span className="eb">Get started</span>
        <h2 className="disp hm-h2">Bring better data to your next decision.</h2>
        <p className="lede">College football projections for people who want to dig deeper than the box score.</p>
        <div className="btn-row">
          <ArrowLink to="/sports/ncaaf" onClick={() => track('hero_cta_click', { label: 'Explore Projections', placement: 'close' })}>
            Explore Projections
          </ArrowLink>
          <Link className="btn btn-ghost" to="/#pricing">
            Compare Products
          </Link>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  usePageMeta(TITLE, DESCRIPTION)
  return (
    <>
      <Hero />
      <Seam />
      <Value />
      <Products />
      <InAction />
      <HowItWorks />
      <Methodology />
      <Pricing />
      <Faq />
      <Close />
    </>
  )
}
