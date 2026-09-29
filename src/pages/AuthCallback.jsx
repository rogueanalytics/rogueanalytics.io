import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { safeNext, useAuth } from '../auth/AuthProvider';
import '../styles/account.css';

// Discord -> Supabase -> here. The Supabase client exchanges ?code= for a
// session on its own (detectSessionInUrl); this page waits, then moves on.
export default function AuthCallback() {
  const { session } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const providerError =
    params.get('error_description') || hashParams.get('error_description') || params.get('error');

  useEffect(() => {
    if (session) navigate(safeNext(params.get('next')), { replace: true });
  }, [session, params, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 10000);
    return () => clearTimeout(t);
  }, []);

  if (providerError || timedOut) {
    return (
      <div className="ra-auth">
        <section className="ra-auth-panel">
          <h1>Sign-in didn't finish</h1>
          <p className="ra-auth-error" role="alert">
            {providerError
              ? decodeURIComponent(providerError.replace(/\+/g, ' '))
              : 'Discord sent you back, but no session was created.'}
          </p>
          <Link to="/sign-in" className="ra-btn ra-btn--primary">Try signing in again</Link>
        </section>
      </div>
    );
  }

  return <div className="ra-auth-status">Signing you in…</div>;
}
