import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { safeNext, useAuth } from '../auth/AuthProvider';
import { APPLE_SIGN_IN_ENABLED } from '../config.js';
import '../styles/account.css';

const PROVIDERS = [
  { id: 'apple', label: 'Apple', Logo: AppleLogo, enabled: APPLE_SIGN_IN_ENABLED },
  { id: 'google', label: 'Google', Logo: GoogleLogo, enabled: true },
  { id: 'discord', label: 'Discord', Logo: DiscordLogo, enabled: true },
].filter((p) => p.enabled);

export default function SignIn() {
  const { session, authLoading, signInWithProvider } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [pending, setPending] = useState(null); // provider id while redirecting
  const [error, setError] = useState(null);

  if (!authLoading && session) return <Navigate to={next} replace />;

  async function handleSignIn({ id, label }) {
    setPending(id);
    setError(null);
    try {
      await signInWithProvider(id, next); // browser leaves for the provider on success
    } catch (e) {
      setError(`${label} sign-in didn't start: ${e.message}. Try again.`);
      setPending(null);
    }
  }

  return (
    <div className="ra-auth">
      <section className="ra-auth-panel">
        <h1>Sign in to Rogue Analytics</h1>
        <p className="ra-auth-lede">
          Your account holds your subscriptions and gives you access to player projections.
          New here? Signing in creates your account.
        </p>

        <div className="ra-auth-providers">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`ra-btn ra-btn--${p.id}`}
              onClick={() => handleSignIn(p)}
              disabled={pending !== null}
            >
              <p.Logo />
              {pending === p.id ? `Opening ${p.label}…` : `Continue with ${p.label}`}
            </button>
          ))}
        </div>

        {error && <p className="ra-auth-error" role="alert">{error}</p>}

        <p className="ra-auth-fine">
          We use your name, avatar, and email from the account you pick. We never post anything for you.
        </p>
      </section>
    </div>
  );
}

function AppleLogo() {
  return (
    <svg className="ra-btn-logo" viewBox="0 0 814 1000" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M788 341c-6 4-108 62-108 190 0 149 131 202 135 203-1 3-21 72-69 143-43 62-88 124-156 124s-86-40-164-40c-76 0-104 41-166 41s-106-57-156-127C46 793 0 667 0 547 0 355 125 253 248 253c65 0 120 43 161 43 39 0 100-46 174-46 28 0 129 3 205 91zM555 156c31-37 53-88 53-139 0-7-1-14-2-20-50 2-110 34-146 76-28 32-55 83-55 135 0 8 1 16 2 18 3 1 9 2 14 2 45 0 102-30 134-72z"
      />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg className="ra-btn-logo" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function DiscordLogo() {
  return (
    <svg className="ra-btn-logo" viewBox="0 0 127.14 96.36" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"
      />
    </svg>
  );
}
