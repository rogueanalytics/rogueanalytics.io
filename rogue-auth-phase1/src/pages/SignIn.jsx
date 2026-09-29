import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { safeNext, useAuth } from '../auth/AuthProvider';
import '../styles/account.css';

export default function SignIn() {
  const { session, authLoading, signInWithDiscord } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  if (!authLoading && session) return <Navigate to={next} replace />;

  async function handleDiscord() {
    setPending(true);
    setError(null);
    try {
      await signInWithDiscord(next); // browser leaves for Discord on success
    } catch (e) {
      setError(`Discord sign-in didn't start: ${e.message}. Try again.`);
      setPending(false);
    }
  }

  return (
    <main className="ra-auth">
      <section className="ra-auth-panel">
        <h1>Sign in to Rogue Analytics</h1>
        <p className="ra-auth-lede">
          Your account holds your subscriptions and gives you access to projections and gamebooks.
          New here? Signing in with Discord creates your account.
        </p>

        <button type="button" className="ra-btn ra-btn--discord" onClick={handleDiscord} disabled={pending}>
          {pending ? 'Opening Discord…' : 'Continue with Discord'}
        </button>

        {error && <p className="ra-auth-error" role="alert">{error}</p>}

        <p className="ra-auth-fine">
          We use your Discord username, avatar, and email. We never post to Discord for you.
        </p>
      </section>
    </main>
  );
}

