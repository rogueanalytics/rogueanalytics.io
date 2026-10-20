import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { startCheckout } from '../lib/billing';

// Subscribe button for /account (signed-in users only). Asks which email to use on
// Buildr, then opens a checkout our server created for this account, so the payment
// is matched by user id, not by whichever email the sign-in provider shared.
export default function CheckoutButton({ plan }) {
  const { profile, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(profile?.email ?? user?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!open) {
    return (
      <button type="button" className="ra-btn ra-btn--primary" onClick={() => setOpen(true)}>
        Subscribe to {plan.name}
      </button>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      window.location.assign(await startCheckout(plan.id, email));
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <form className="ra-checkout" onSubmit={submit}>
      <label htmlFor={`checkout-email-${plan.id}`}>Email for your Buildr receipt and billing login</label>
      <input
        id={`checkout-email-${plan.id}`}
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <button type="submit" className="ra-btn ra-btn--primary" disabled={busy}>
        {busy ? 'Opening checkout…' : 'Continue to checkout'}
      </button>
      {error && (
        <p className="ra-auth-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
