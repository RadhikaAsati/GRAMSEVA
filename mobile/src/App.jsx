
import { useCallback, useEffect, useState } from 'react'
import WelcomeScreen from './components/WelcomeScreen.jsx'
import LoginPage from './pages/LoginPage.jsx'
import CitizenDashboard from './pages/CitizenDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import WorkerDashboard from './pages/WorkerDashboard.jsx'
import { getCurrentUser } from './services/api.js'
import { LanguageProvider } from './i18n/index.jsx'

function AppContent() {
  const [selectedRole, setSelectedRole] = useState(null)
  const [session, setSession] = useState(null)
  const [checkingSession, setCheckingSession] = useState(true)

  const restoreSession = useCallback(async () => {
    const token = localStorage.getItem('gramseva_token')

    if (!token) {
      setCheckingSession(false)
      return
    }

    try {
      const user = await getCurrentUser(token)
      setSession({ token, user })
      localStorage.setItem('gramseva_user', JSON.stringify(user))
    } catch {
      localStorage.removeItem('gramseva_token')
      localStorage.removeItem('gramseva_user')
      setSession(null)
    } finally {
      setCheckingSession(false)
    }
  }, [])

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  function handleAuthenticated(result) {
    setSession({
      token: result.access_token,
      user: result.user,
    })
    setSelectedRole(null)
  }

  function logout() {
    localStorage.removeItem('gramseva_token')
    localStorage.removeItem('gramseva_user')
    setSession(null)
    setSelectedRole(null)
  }

  if (checkingSession) {
    return <main className="app-loading">Opening GramSeva…</main>
  }

  if (session) {
    if (session.user.role === 'citizen') {
      return (
        <CitizenDashboard
          user={session.user}
          token={session.token}
          onLogout={logout}
        />
      )
    }

    if (session.user.role === 'admin') {
      return (
        <AdminDashboard
          user={session.user}
          token={session.token}
          onLogout={logout}
        />
      )
    }

    if (session.user.role === 'worker') {
      return (
        <WorkerDashboard
          user={session.user}
          token={session.token}
          onLogout={logout}
        />
      )
    }

    return (
      <main className="app-loading">
        This account has an unsupported role. Please contact support.
      </main>
    )
  }

  if (selectedRole) {
    return (
      <LoginPage
        role={selectedRole}
        onBack={() => setSelectedRole(null)}
        onAuthenticated={handleAuthenticated}
      />
    )
  }

  return <WelcomeScreen onRoleSelect={setSelectedRole} />
}

export default function App() {
  const token = localStorage.getItem('gramseva_token')
  const [languageUser, setLanguageUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('gramseva_user') || 'null')
    } catch {
      return null
    }
  })

  useEffect(() => {
    function updateLanguageUser() {
      try {
        setLanguageUser(
          JSON.parse(localStorage.getItem('gramseva_user') || 'null')
        )
      } catch {
        setLanguageUser(null)
      }
    }

    window.addEventListener('storage', updateLanguageUser)
    return () => window.removeEventListener('storage', updateLanguageUser)
  }, [])

  return (
    <LanguageProvider user={languageUser} token={token}>
      <AppContent />
    </LanguageProvider>
  )
}
