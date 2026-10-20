import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { MANAGE_SUBSCRIPTION_URL, PLANS, planById } from '../config/plans';
import CheckoutButton from '../components/CheckoutButton';
import { useBillingSync } from '../lib/billing';
import '../styles/account.css';

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export default function Account() {
  const { user, profile, subscriptions, activeTiers, accountLoading, accountError, refreshAccount, signOut } =
    useAuth();
  const location = useLocation();
  const needsTier = location.state?.needsTier;
  const awaitingPayment = useBillingSync(new URLSearchParams(location.search).get('checkout') === 'success');

  if (accountLoading && !profile) return <div className="ra-auth-status">Loading your account…</div>;

  const name = profile?.display_name || profile?.discord_username || user?.email;
  const memberSince = profile?.created_at ? dateFmt.format(new Date(profile.created_at)) : null;
  const liveSubs = subscriptions.filter((s) => ['active', 'trialing', 'past_due'].includes(s.status));

  return (
    <div className="ra-account">
      <header className="ra-account-head">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="ra-account-avatar" />
        ) : (
          <div className="ra-account-avatar ra-account-avatar--blank" aria-hidden="true">
            {name?.[0]?.toUpperCase()}
          </div>
        )}
        <div>
          <h1>{name}</h1>
          {profile?.discord_username && <p className="ra-account-sub">@{profile.discord_username} on Discord</p>}
        </div>
        <button type="button" className="ra-btn ra-btn--ghost ra-account-signout" onClick={signOut}>
          Sign out
        </button>
      </header>

      {accountError && (
        <p className="ra-auth-error" role="alert">
          Couldn't load your account details: {accountError}.{' '}
          <button type="button" className="ra-link" onClick={refreshAccount}>Reload</button>
        </p>
      )}

      {needsTier && (
        <p className="ra-account-notice" role="status">
          That page needs the {planById(needsTier)?.name ?? needsTier} plan.
        </p>
      )}

      <section className="ra-account-section">
        <h2>Account details</h2>
        <dl className="ra-account-details">
          <dt>Email</dt>
          <dd>{profile?.email ?? user?.email ?? 'Not shared'}</dd>
          {memberSince && (
            <>
              <dt>Member since</dt>
              <dd>{memberSince}</dd>
            </>
          )}
        </dl>
      </section>

      {awaitingPayment && (
        <p className="ra-account-notice" role="status">
          Thanks for subscribing. Your plan shows up here as soon as Buildr confirms the payment.
        </p>
      )}

      <section className="ra-account-section">
        <h2>Your plan</h2>
        {liveSubs.length === 0 ? (
          <p className="ra-account-empty">You don't have a plan yet. Pick one below.</p>
        ) : (
          <ul className="ra-sub-list">
            {liveSubs.map((s) => (
              <li key={s.id} className="ra-sub">
                <span className="ra-sub-name">{planById(s.tier)?.name ?? s.tier}</span>
                <span className={`ra-sub-status ra-sub-status--${s.status}`}>{s.status.replace('_', ' ')}</span>
                {s.current_period_end && (
                  <span className="ra-sub-renew">Renews {dateFmt.format(new Date(s.current_period_end))}</span>
                )}
              </li>
            ))}
          </ul>
        )}
        {subscriptions.some((s) => s.buildr_subscription_id) && (
          <a className="ra-btn ra-btn--ghost ra-account-manage" href={MANAGE_SUBSCRIPTION_URL} target="_blank" rel="noreferrer">
            Manage subscription
          </a>
        )}
      </section>

      <section className="ra-account-section" id="plans">
        <h2>College football plans</h2>
        <div className="ra-plan-grid">
          {PLANS.map((plan) => {
            const owned = activeTiers.has(plan.id);
            return (
              <article key={plan.id} className={`ra-plan${owned ? ' ra-plan--owned' : ''}`}>
                <h3>{plan.name}</h3>
                <p className="ra-plan-price">
                  ${plan.price}
                  <span>/month</span>
                </p>
                <p className="ra-plan-desc">{plan.description}</p>
                {owned ? (
                  <span className="ra-plan-owned">Included in your plan</span>
                ) : (
                  <CheckoutButton plan={plan} />
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
