import { NavLink } from 'react-router-dom';
import { useAuth } from './AuthProvider';

// Sign in / Account link for the site nav. Uses the nav's own .nav-a styling.
export default function AuthButton() {
  const { session, authLoading, profile } = useAuth();

  if (authLoading) return <span className="ra-nav-auth--placeholder" aria-hidden="true" />;

  if (!session) {
    return (
      <NavLink to="/sign-in" className="nav-a">
        Sign in
      </NavLink>
    );
  }

  return (
    <NavLink to="/account" className="nav-a ra-nav-auth">
      {profile?.avatar_url && <img src={profile.avatar_url} alt="" className="ra-nav-avatar" />}
      Account
    </NavLink>
  );
}
