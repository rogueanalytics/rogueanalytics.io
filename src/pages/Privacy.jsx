import Seam from '../components/Seam.jsx'
import { CONTACT_EMAIL } from '../config.js'
import { usePageMeta } from '../lib/usePageMeta.js'

const UPDATED = 'October 12, 2026'

export default function Privacy() {
  usePageMeta('Privacy Policy | Rogue Analytics', 'What Rogue Analytics collects, why, and who it is shared with.')
  return (
    <>
      <section className="dark hero hero--sm">
        <div className="wrap hero-in">
          <span className="eb">Legal</span>
          <h1 className="disp h1 h1--sm">Privacy Policy</h1>
        </div>
      </section>
      <Seam />

      <section className="section">
        <div className="wrap">
          <div className="prose legal">
            <p className="soft">Last updated {UPDATED}</p>

            <h2 className="disp h5">What we collect</h2>
            <p>
              <strong>When you sign in</strong> with Google or Discord, that provider shares your name, email address,
              profile picture and an account ID with us. We use them to create your Rogue Analytics account and show who
              is signed in. We never see your Google or Discord password, and we never post anything on your behalf.
            </p>
            <p>
              <strong>When you subscribe</strong>, payment is handled by Buildr and processed by Whop. We receive your subscription status and
              renewal date, not your card details.
            </p>
            <p>
              <strong>When you use the contact form</strong>, we receive what you type into it, including your name and
              email address, so we can reply.
            </p>
            <p>
              <strong>In your browser</strong>, we store a sign-in session so you stay logged in. We do not use
              advertising cookies or sell tracking data.
            </p>

            <h2 className="disp h5">How we use it</h2>
            <p>
              To run your account, give you access to what you subscribed to, answer your messages, and contact you
              about your account or subscription. We do not sell or rent your personal information.
            </p>

            <h2 className="disp h5">Who processes it for us</h2>
            <ul>
              <li>Supabase: account database and sign-in</li>
              <li>Google and Discord: sign-in, if you choose them</li>
              <li>Buildr and Whop: subscriptions and payments</li>
              <li>Formspree: contact form delivery</li>
              <li>GitHub Pages: website hosting</li>
            </ul>
            <p>Each handles data under its own privacy policy. We share with them only what they need to do that job.</p>

            <h2 className="disp h5">Keeping and deleting your data</h2>
            <p>
              We keep your account data while your account exists. Ask us to delete your account and we will remove your
              profile and sign-in records, except anything we must keep for payment, tax or legal reasons.
            </p>

            <h2 className="disp h5">Your choices</h2>
            <p>
              You can ask to see, correct or delete the personal information we hold about you. You can also remove
              Rogue Analytics' access from your Google or Discord account settings at any time.
            </p>

            <h2 className="disp h5">Children</h2>
            <p>Rogue Analytics is not intended for anyone under 18, and we do not knowingly collect their data.</p>

            <h2 className="disp h5">Changes</h2>
            <p>If we change this policy, we will update the date at the top of this page.</p>

            <h2 className="disp h5">Contact</h2>
            <p>
              Questions or requests:{' '}
              {CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : 'use the contact form on our Consulting page'}
              .
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
