import { useState } from 'react'
import Seam from '../components/Seam.jsx'
import { ArrowLink } from '../components/Buttons.jsx'
import { CONTACT_EMAIL, FORMSPREE_ID } from '../config.js'

const SERVICES = [
  [
    'Predictive Modeling',
    'Forecasting and projection models in Python, validated on time-based holdouts so the backtest actually means something.',
  ],
  [
    'App and Tool Building',
    'Full-stack data applications: data collection, modeling, and the interface your team works in.',
  ],
  [
    'Dashboards and BI',
    'SQL-driven reporting and dashboards designed around the decisions they support.',
  ],
  [
    'Data Pipelines and Infrastructure',
    'Scraping, ETL, scheduled refreshes, and validation checks that stop bad data before it ships.',
  ],
]

function ContactForm() {
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  async function onSubmit(e) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))

    if (!FORMSPREE_ID) {
      if (CONTACT_EMAIL) {
        const body = `${data.message}\n\n${data.name}${data.company ? `, ${data.company}` : ''}\n${data.email}`
        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
          'Analytics inquiry',
        )}&body=${encodeURIComponent(body)}`
      } else {
        setStatus('error')
      }
      return
    }

    setStatus('sending')
    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(String(res.status))
      form.reset()
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <div className="form-done">
        <h3 className="disp h5">Inquiry sent.</h3>
        <p className="body">We'll reply to the email you provided.</p>
      </div>
    )
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="field">
        <label htmlFor="c-name">Name</label>
        <input id="c-name" name="name" required autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="c-email">Email</label>
        <input id="c-email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="c-company">Company (optional)</label>
        <input id="c-company" name="company" autoComplete="organization" />
      </div>
      <div className="field">
        <label htmlFor="c-msg">What are you trying to build?</label>
        <textarea id="c-msg" name="message" rows={5} required />
      </div>
      {status === 'error' && (
        <p className="form-error" role="alert">
          The inquiry didn't send. {CONTACT_EMAIL ? `Email us directly at ${CONTACT_EMAIL}.` : 'Try again in a moment.'}
        </p>
      )}
      <button type="submit" className="btn btn-green self-start" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send inquiry'}
      </button>
    </form>
  )
}

export default function Analytics() {
  return (
    <>
      <section className="dark hero hero--sm">
        <div className="wrap hero-in">
          <span className="eb">Analytics Solutions</span>
          <h1 className="disp h1 h1--sm">Models, apps, and data systems, built to be used.</h1>
          <p className="lede">
            Independent consulting in modeling, application development, and business
            intelligence.
          </p>
        </div>
      </section>
      <Seam />

      <section className="section">
        <div className="wrap stack stack--lg">
          <div className="stack stack--sm">
            <span className="eb eb--muted">What we build</span>
            <h2 className="disp h2">Services</h2>
          </div>
          <div className="grid-2">
            {SERVICES.map(([title, text]) => (
              <div key={title} className="card card--svc">
                <h3 className="disp h4">{title}</h3>
                <p className="body body-lg">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--flush-top">
        <div className="wrap">
          <div className="band">
            <div className="stack">
              <span className="eb">Built in-house</span>
              <h3 className="disp h4">CFB Command Center</h3>
              <p className="soft measure">
                The modeling platform behind our NCAAF products: CollegeFootballData.com ingestion,
                weekly depth-chart scraping, opponent-adjusted features, and a player projection
                engine.
              </p>
            </div>
            <ArrowLink to="/sports" variant="ghost">
              See Sports Solutions
            </ArrowLink>
          </div>
        </div>
      </section>

      <section className="section section--flush-top" id="contact">
        <div className="wrap split">
          <div className="stack">
            <span className="eb eb--muted">Contact</span>
            <h2 className="disp h2">Tell us what you're building.</h2>
            {CONTACT_EMAIL && (
              <p className="body body-lg">
                Or email directly: <a className="link" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </p>
            )}
          </div>
          <ContactForm />
        </div>
      </section>
    </>
  )
}
