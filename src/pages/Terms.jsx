import { Link } from 'react-router-dom'
import Seam from '../components/Seam.jsx'
import { CONTACT_EMAIL } from '../config.js'
import { usePageMeta } from '../lib/usePageMeta.js'

const UPDATED = 'October 12, 2026'

export default function Terms() {
  usePageMeta('Terms of Service | Rogue Analytics', 'The terms for using Rogue Analytics and its subscriptions.')
  return (
    <>
      <section className="dark hero hero--sm">
        <div className="wrap hero-in">
          <span className="eb">Legal</span>
          <h1 className="disp h1 h1--sm">Terms of Service</h1>
        </div>
      </section>
      <Seam />

      <section className="section">
        <div className="wrap">
          <div className="prose legal">
            <p className="soft">Last updated {UPDATED}</p>

            <p>
              These terms apply when you use rogueanalytics.io. By creating an account or subscribing, you agree to them.
            </p>

            <h2 className="disp h5">Who can use it</h2>
            <p>You must be at least 18 years old. You are responsible for activity on your account.</p>

            <h2 className="disp h5">Not betting advice</h2>
            <p>
              Rogue Analytics publishes statistical projections and analysis for informational and research purposes.
              Projections are estimates, not guarantees. Nothing on this site is betting, financial or investment advice,
              and Rogue Analytics does not accept wagers. You are responsible for your own decisions and for following
              the laws where you live. If you or someone you know has a gambling problem, call 1-800-GAMBLER.
            </p>

            <h2 className="disp h5">Subscriptions</h2>
            <p>
              Paid plans are sold through Buildr, processed by Whop, and renew each billing period until you cancel. You
              can cancel through your Whop account at any time; your access continues until the end of the period you
              already paid for. Prices and plan contents may change, and we will tell you before a price change applies to
              your subscription.
            </p>

            <h2 className="disp h5">Using our content</h2>
            <p>
              Your subscription is for your own use. You may use projections, Game Books and CSV downloads in your own
              research and models. You may not resell, republish or share them, or give others access to your account.
              We may suspend accounts that do.
            </p>

            <h2 className="disp h5">Availability</h2>
            <p>
              We work to publish on the stated schedule, but data can be late, incomplete or wrong, and the site can be
              unavailable. The service is provided as is, without warranties of any kind.
            </p>

            <h2 className="disp h5">Limitation of liability</h2>
            <p>
              To the fullest extent the law allows, Rogue Analytics is not liable for any losses, including betting or
              trading losses, from using or relying on the site. Our total liability for any claim is limited to what you
              paid us in the three months before it.
            </p>

            <h2 className="disp h5">Ending your account</h2>
            <p>
              You can stop using the site and ask us to delete your account at any time. We may suspend or close accounts
              that break these terms.
            </p>

            <h2 className="disp h5">Changes</h2>
            <p>If we change these terms, we will update the date at the top of this page.</p>

            <h2 className="disp h5">Contact</h2>
            <p>
              Questions:{' '}
              {CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> : 'use the contact form on our Consulting page'}
              . See also our <Link to="/privacy">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
