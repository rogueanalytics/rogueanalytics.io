import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Home from './pages/Home.jsx'
import Sports from './pages/Sports.jsx'
import NCAAF from './pages/NCAAF.jsx'
import Projections from './pages/Projections.jsx'
import Gamebooks from './pages/Gamebooks.jsx'
import NCAAB from './pages/NCAAB.jsx'
import Analytics from './pages/Analytics.jsx'
import NotFound from './pages/NotFound.jsx'
import { MEMBERS_ENABLED } from './config.js'

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
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="sports" element={<Sports />} />
          <Route path="sports/ncaaf" element={<NCAAF />} />
          <Route path="sports/ncaaf/projections" element={membersOnly(<Projections />)} />
          <Route path="sports/ncaaf/gamebooks" element={membersOnly(<Gamebooks />)} />
          <Route path="sports/ncaab" element={<NCAAB />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </>
  )
}
