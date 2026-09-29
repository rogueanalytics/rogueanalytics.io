import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

// Wrap any route that needs a signed-in user.
// Pass `tier` to also require an active plan (used from phase 2 on).
export default function ProtectedRoute({ children, tier }) {
  const { session, authLoading, accountLoading, hasTier } = useAuth();
  const location = useLocation();

  if (authLoading) return <div className="ra-auth-status">Checking your session…</div>;

  if (!session) {
    const next = location.pathname + location.search;
    return <Navigate to={`/sign-in?next=${encodeURIComponent(next)}`} replace />;
  }

  if (tier) {
    if (accountLoading) return <div className="ra-auth-status">Loading your plan…</div>;
    if (!hasTier(tier)) return <Navigate to="/account" replace state={{ needsTier: tier }} />;
  }

  return children;
}
