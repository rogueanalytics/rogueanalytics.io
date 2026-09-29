import { Link } from 'react-router-dom';
import { useAuth } from './AuthProvider';

// Drop into the site nav.
export default function AuthButton() {
  const { session, authLoading, profile } = useAuth();

  if (authLoading) return <span className="ra-nav-auth ra-nav-auth--placeholder" aria-hidden="true" />;

  if (!session) {
    return (
      <Link to="/sign-in" className="ra-nav-auth">
        Sign in
      </Link>
    );
  }

  return (
    <Link to="/account" className="ra-nav-auth ra-nav-auth--signed-in">
      {profile?.avatar_url && <img src={profile.avatar_url} alt="" className="ra-nav-avatar" />}
      Account
    </Link>
  );
}
