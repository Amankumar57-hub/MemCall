import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { useAppStore } from './store/useAppStore'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Signup from './pages/Signup'
import PatientDashboard from './pages/Patient/Dashboard'
import GameList from './pages/Patient/Games/GameList'
import MemoryMatch from './pages/Patient/Games/MemoryMatch'
import ReminderList from './pages/Patient/Reminders/ReminderList'
import WaterReminder from './pages/Patient/Reminders/WaterReminder'
import PatientProfile from './pages/Patient/Profile'
import CaregiverDashboard from './pages/Caregiver/Dashboard'
import AdminLayout from './pages/Admin/Layout'
import AdminSetup from './pages/Admin/Setup'
import AdminLogin from './pages/Admin/Login'
import AdminDashboard from './pages/Admin/Dashboard'
import AdminUsers from './pages/Admin/Users'
import type { Session } from '@supabase/supabase-js'

const queryClient = new QueryClient()

function ProtectedRoute({ children, session }: { children: React.ReactNode, session: Session | null }) {
  if (!session) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  const { fontSize, highContrast } = useAppStore()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // Setup native platform specifics
    if (Capacitor.isNativePlatform()) {
      const setupNative = async () => {
        try {
          await StatusBar.setStyle({ style: Style.Default })
          await StatusBar.setBackgroundColor({ color: '#FFFFFF' })
          await StatusBar.setOverlaysWebView({ overlay: false })
        } catch (error) {
          console.error('Error configuring StatusBar:', error)
        }
      }
      setupNative()
    }

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    // Apply global classes for accessibility
    const root = document.documentElement
    root.className = ''
    if (highContrast) root.classList.add('dark')
    if (fontSize === 'xlarge') root.classList.add('text-2xl')
    else if (fontSize === 'large') root.classList.add('text-xl')
    else root.classList.add('text-base')
  }, [fontSize, highContrast])

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FDFDF9]">
      <div className="w-8 h-8 border-4 border-[#144533] border-t-transparent rounded-full animate-spin"></div>
    </div>
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans">
          <Routes>
            <Route path="/" element={session ? <Navigate to="/patient" replace /> : <Navigate to="/login" replace />} />
            
            <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/signup" element={session ? <Navigate to="/" replace /> : <Signup />} />
            
            <Route path="/patient" element={<ProtectedRoute session={session}><PatientDashboard /></ProtectedRoute>} />
            <Route path="/patient/games" element={<ProtectedRoute session={session}><GameList /></ProtectedRoute>} />
            <Route path="/patient/games/memory" element={<ProtectedRoute session={session}><MemoryMatch /></ProtectedRoute>} />
            <Route path="/patient/reminders" element={<ProtectedRoute session={session}><ReminderList /></ProtectedRoute>} />
            <Route path="/patient/reminders/water" element={<ProtectedRoute session={session}><WaterReminder /></ProtectedRoute>} />
            <Route path="/patient/profile" element={<ProtectedRoute session={session}><PatientProfile /></ProtectedRoute>} />
            
            <Route path="/caregiver" element={<ProtectedRoute session={session}><CaregiverDashboard /></ProtectedRoute>} />
            
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="setup" element={<AdminSetup />} />
              <Route path="login" element={<AdminLogin />} />
            </Route>
          </Routes>
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
