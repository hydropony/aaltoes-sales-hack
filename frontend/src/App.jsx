import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useNavigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Accounts from './pages/Accounts'
import AccountDetail from './pages/AccountDetail'
import Deals from './pages/Deals'
import Cases from './pages/Cases'
import CaseDetail from './pages/CaseDetail'
import Catalog from './pages/Catalog'
import TAMDashboard from './pages/TAMDashboard'
import Offers from './pages/Offers'
import RepDashboard from './features/deals/RepDashboard'
import DealDetail from './features/deals/DealDetail'
import Pipeline from './features/deals/Pipeline'
import OfferBuilder from './features/offers/OfferBuilder'
import OfferDetail from './features/offers/OfferDetail'
import { api } from './lib/api'
import { clearStoredUserId, getStoredUserId, setStoredUserId } from './lib/auth'
import { UserContext } from './lib/UserContext'

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

function defaultPathForRole(role) {
  if (role === 'rep')     return '/rep'
  if (role === 'tam')     return '/tam'
  if (role === 'sm')      return '/pipeline'
  if (role === 'finance') return '/offers'
  return '/'
}

function AppShell() {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [selectedUserId, setSelectedUserId] = useState(getStoredUserId() ?? '')
  const [currentUser, setCurrentUser] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    let active = true
    api.getAuthUsers()
      .then((data) => {
        if (!active) return
        setUsers(data)
      })
      .catch((err) => {
        if (!active) return
        setError(err.message)
      })
      .finally(() => {
        if (!active) return
        setLoadingUsers(false)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const storedUserId = getStoredUserId()
    if (!storedUserId) {
      setCurrentUser(null)
      return
    }

    api.getMe()
      .then((user) => {
        setCurrentUser(user)
        navigate(defaultPathForRole(user.role), { replace: true })
      })
      .catch(() => {
        clearStoredUserId()
        setCurrentUser(null)
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSelectUser(event) {
    const userId = event.target.value
    if (!userId) return

    setSelectedUserId(userId)
    setStoredUserId(userId)
    setError('')

    try {
      const session = await api.getMe()
      setCurrentUser(session)
      navigate(defaultPathForRole(session.role), { replace: true })
    } catch (err) {
      clearStoredUserId()
      setCurrentUser(null)
      setError(err.message)
    }
  }

  function handleSignOut() {
    clearStoredUserId()
    setCurrentUser(null)
    setSelectedUserId('')
    navigate('/', { replace: true })
  }

  return currentUser ? (
    <UserContext.Provider value={currentUser}>
    <Routes>
      <Route
        path="/"
        element={<Layout currentUser={currentUser} onSignOut={handleSignOut} />}
      >
        <Route index element={<Dashboard />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="accounts/:id" element={<AccountDetail />} />
        <Route path="deals" element={<Deals />} />
        <Route path="deals/:id" element={<DealDetail />} />
        <Route path="cases" element={<Cases />} />
        <Route path="cases/:id" element={<CaseDetail />} />
        <Route path="tam" element={<TAMDashboard />} />
        <Route path="rep" element={<RepDashboard />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="offers" element={<Offers />} />
        <Route path="offers/new" element={<OfferBuilder />} />
        <Route path="offers/:id" element={<OfferDetail />} />
        <Route
          path="catalog"
          element={currentUser?.role === 'finance' ? <Catalog /> : <Navigate to={defaultPathForRole(currentUser?.role)} replace />}
        />
        <Route path="*" element={<Navigate to={defaultPathForRole(currentUser?.role)} replace />} />
      </Route>
    </Routes>
    </UserContext.Provider>
  ) : (
    <AuthGate
      users={users}
      loadingUsers={loadingUsers}
      selectedUserId={selectedUserId}
      onSelectUser={handleSelectUser}
      error={error}
    />
  )
}

function AuthGate({ users, loadingUsers, selectedUserId, onSelectUser, error }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-2">Select a user</h1>
        <p className="text-sm text-muted-foreground mb-6">Pick a seeded CRM user to continue.</p>
        <label className="text-xs text-muted-foreground mb-2 block" htmlFor="user-picker">User</label>
        <select
          id="user-picker"
          className="w-full border rounded-md px-3 py-2 text-sm bg-background"
          value={selectedUserId}
          onChange={onSelectUser}
          disabled={loadingUsers}
        >
          <option value="">Select user...</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.full_name} · {user.role}
            </option>
          ))}
        </select>
        {error && <p className="text-destructive text-sm mt-4">{error}</p>}
        {loadingUsers && <p className="text-muted-foreground text-sm mt-4">Loading users...</p>}
      </div>
    </main>
  )
}
