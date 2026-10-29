import { useState } from 'react'
import Seam from '../components/Seam.jsx'
import { IconCheck } from '../components/Icons.jsx'
import { CONTACT_EMAIL, FORMSPREE_ID } from '../config.js'
import { usePageMeta } from '../lib/usePageMeta.js'
import { track } from '../lib/track.js'

const SERVICES = [
  [
    'Custom Applications and Dashboards',
    'Tools built around your workflow, not the other way around. Data collection, modeling, and the interface your team actually works in.',
  ],
  [
    'Sports Trading Analytics',
    'Trade tracking, P/L reporting, closing line value, and performance analysis that shows where your edge comes from and where it leaks.',
  ],
  [
    'Data Pipelines and Automation',
    'Scraping, ETL, scheduled refreshes, and validation checks that replace repetitive manual work and spreadsheet-heavy processes.',
  ],
]

const APPROACH = [
  ['Understand the problem', 'Start with how you work today: the data, the decisions, and where the time goes.'],
  ['Build a practical solution', 'Ship the smallest tool that solves the real problem, then improve it with use.'],
  ['Make it easy to run and scale', 'Documented, automated, and easy to operate, so it keeps working after hand-off.'],
]

const AUDIENCE = [
  'Businesses looking to automate time-consuming, manual tasks',
  'Teams with an established process that needs better technology behind it',
  'Professional sports traders and trading groups',
]

const PROJECT_TYPES = [...SERVICES.map(([title]) => title), 'Something else']

function ContactForm() {
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  async function onSubmit(e) {
    e.preventDefault()
    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form))
    track('consulting_inquiry', { type: data.project_type })

    if (!FORMSPREE_ID) {
      if (CONTACT_EMAIL) {
        const body = `${data.project_type}\n\n${data.message}\n\n${data.name}${data.company ? `, ${data.company}` : ''}\n${data.email}`
        window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
          'Consulting inquiry',
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
        body: JSON.stringify({ ...data, _subject: `Consulting inquiry: ${data.project_type}` }),
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
        <label htmlFor="c-company">Company or group (optional)</label>
        <input id="c-company" name="company" autoComplete="organization" />
      </div>
      <div className="field">
        <label htmlFor="c-type">What do you need?</label>
        <select id="c-type" name="project_type" required defaultValue="">
          <option value="" disabled>
            Choose one
          </option>
          {PROJECT_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="c-msg">Describe the problem</label>
        <textarea
          id="c-msg"
          name="message"
          rows={6}
          required
          placeholder="What you do today, what's slow or missing, and what a good outcome looks like."
        />
      </div>
      {/* Spam trap: Formspree drops submissions that fill this in. */}
      <input type="text" name="_gotcha" tabIndex={-1} autoComplete="off" className="sr-only" aria-hidden="true" />
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

export default function Consulting() {
  usePageMeta(
    'Consulting | Rogue Analytics',
    'Custom applications, sports trading analytics, data pipelines and automation for sports traders, trading groups and businesses.',
  )
  return (
    <>
      <section className="dark hero hero--sm">
        <div className="wrap hero-in">
          <span className="eb">Rogue Analytics Consulting</span>
          <h1 className="disp h1 h1--sm">Better technology behind the process you already run.</h1>
          <p className="lede">
            Custom tools, analytics, and automation that turn complex data and repetitive workflows into better
            decisions.
          </p>
        </div>
      </section>
      <Seam />

      <section className="section">
        <div className="wrap split">
          <div className="stack">
            <span className="eb eb--muted">Why consulting</span>
            <h2 className="disp h2">Built for our own work first.</h2>
          </div>
          <div className="prose">
            <p>
              Rogue Analytics started as sports models and tools for our own projects. That work grew into systems that
              turn complex data and repetitive workflows into actionable insight.
            </p>
            <p>
              We're now taking on work with professional sports traders, trading groups, and businesses that need custom
              analytical tools and automation.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--flush-top">
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
            <a className="card card--svc card--dark" href="#contact">
              <h3 className="disp h4">Something else?</h3>
              <p className="body body-lg soft">
                An idea for a tool, an inefficient workflow, or a project you've been meaning to build. Let's talk.
              </p>
            </a>
          </div>
        </div>
      </section>

      <section className="section section--flush-top">
        <div className="wrap stack stack--lg">
          <div className="stack stack--sm">
            <span className="eb eb--muted">How we work</span>
            <h2 className="disp h2">Understand it, build it, make it easy to run.</h2>
          </div>
          <ol className="grid-3 plain-list">
            {APPROACH.map(([title, text], i) => (
              <li key={title} className="step">
                <span className="step-n">Step {i + 1}</span>
                <span className="step-title">{title}</span>
                <p className="body">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section--flush-top">
        <div className="wrap">
          <div className="band">
            <div className="stack">
              <span className="eb">Who it's for</span>
              <ul className="checks">
                {AUDIENCE.map((t) => (
                  <li key={t}>
                    <IconCheck />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--flush-top" id="contact">
        <div className="wrap split">
          <div className="stack">
            <span className="eb eb--muted">Contact</span>
            <h2 className="disp h2">Tell us what you're trying to solve.</h2>
            <p className="body body-lg">
              Describe the problem and how you handle it today. We'll reply by email to set up a call.
            </p>
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
