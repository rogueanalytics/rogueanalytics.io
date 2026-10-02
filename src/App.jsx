import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import NCAAF from './pages/NCAAF.jsx'
import Projections from './pages/Projections.jsx'
import Teams from './pages/Teams.jsx'
import Gamebooks from './pages/Gamebooks.jsx'
import Analytics from './pages/Analytics.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import NotFound from './pages/NotFound.jsx'
import { MEMBERS_ENABLED } from './config.js'
import { AuthProvider } from './auth/AuthProvider.jsx'
import ProtectedRoute from './auth/ProtectedRoute.jsx'
import SignIn from './pages/SignIn.jsx'
import AuthCallback from './pages/AuthCallback.jsx'
import Account from './pages/Account.jsx'

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])
  return null
}

// While the members area is switched off, its URLs fall back to the NCAAF overview.
const membersOnly = (el) => (MEMBERS_ENABLED ? el : <Navigate to="/sports/ncaaf" replace />)

export default function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="sports/ncaaf" element={<NCAAF />} />
          <Route path="sports/ncaaf/projections" element={membersOnly(<Projections />)} />
          <Route path="sports/ncaaf/gamebooks" element={membersOnly(<Gamebooks />)} />
          <Route path="college-football/projections" element={<Projections />} />
          <Route path="college-football/teams" element={<Teams />} />
          {[
            ['college-football', 'College Football'],
            ['college-basketball', 'College Basketball'],
          ].flatMap(([slug, sport]) =>
            ['Teams', 'Players', 'Projections']
              .filter((page) => !(slug === 'college-football' && (page === 'Projections' || page === 'Teams')))
              .map((page) => (
                <Route
                  key={`${slug}/${page}`}
                  path={`${slug}/${page.toLowerCase()}`}
                  element={<ComingSoon sport={sport} title={page} />}
                />
              )),
          )}
          <Route path="analytics" element={<Analytics />} />

          {/* Accounts */}
          <Route path="sign-in" element={<SignIn />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route
            path="account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
