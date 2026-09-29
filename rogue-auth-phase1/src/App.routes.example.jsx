// Example wiring — merge into your existing App.jsx / main.jsx.
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import ProtectedRoute from './auth/ProtectedRoute';
import AuthButton from './auth/AuthButton';
import SignIn from './pages/SignIn';
import AuthCallback from './pages/AuthCallback';
import Account from './pages/Account';
// import Home from './pages/Home';  // your existing pages

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <nav>
          {/* ...existing nav links... */}
          <AuthButton />
        </nav>

        <Routes>
          {/* <Route path="/" element={<Home />} /> */}
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />
          {/* Phase 2 example:
          <Route path="/ncaaf/projections" element={
            <ProtectedRoute tier="player_projections"><Projections /></ProtectedRoute>
          } /> */}
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
