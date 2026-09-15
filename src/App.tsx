import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { useAppStore } from './store/useAppStore'
import { supabase } from './lib/supabase'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import Demo from './pages/Demo'
import PatientDashboard from './pages/Patient/Dashboard'
import PatientLayout from './pages/Patient/PatientLayout'
import GameList from './pages/Patient/Games/GameList'
import MemoryMatch from './pages/Patient/Games/MemoryMatch'
import NERPatternGame from './pages/Patient/Games/NERPatternGame'
import ShapeTracer from './pages/Patient/Games/ShapeTracer'
import SoundRecognition from './pages/Patient/Games/SoundRecognition'
import FamilyQuiz from './pages/Patient/Games/FamilyQuiz'
import MemoryGarden from './pages/Patient/Games/MemoryGarden'
import ReminderList from './pages/Patient/Reminders/ReminderList'
import WaterReminder from './pages/Patient/Reminders/WaterReminder'
import TaskGuideViewer from './pages/Patient/Reminders/TaskGuideViewer'
import Reminiscence from './pages/Patient/Reminiscence'
import MemoryJournal from './pages/Patient/MemoryJournal'
import MyFamily from './pages/Patient/MyFamily'
import FaceScanner from './pages/Patient/FaceScanner'
import ObjectLocator from './pages/Patient/ObjectLocator'
import PatientProfile from './pages/Patient/Profile'
import Settings from './pages/Patient/Settings'
import Privacy from './pages/Patient/Privacy'
import Support from './pages/Patient/Support'
import CaregiverDashboard from './pages/Caregiver/Dashboard'
import CaregiverProfile from './pages/Caregiver/Profile'
import ClinicalReport from './pages/Caregiver/ClinicalReport'
import AdminLayout from './pages/Admin/Layout'
import AdminSetup from './pages/Admin/Setup'
import AdminLogin from './pages/Admin/Login'
import AdminDashboard from './pages/Admin/Dashboard'
import AdminUsers from './pages/Admin/Users'
import AlarmManager from './components/AlarmManager'
import type { Session } from '@supabase/supabase-js'

const queryClient = new QueryClient()

function ProtectedRoute({ children, session }: { children: React.ReactNode, session: Session | null }) {
  const isDemo = localStorage.getItem('demo_mode') === 'true'
  if (isDemo) {
    return <>{children}</>
  }
  
  if (!session) {
    return <Navigate to="/login" replace />
  }
  const isSetup = localStorage.getItem('onboarding_complete') === 'true' || session.user.user_metadata?.onboarding_complete
  if (!isSetup) {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}

function App() {
  const { fontSize, highContrast, theme, colorTheme } = useAppStore()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Check for OAuth errors in URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1))
    const searchParams = new URLSearchParams(window.location.search)
    const errorDescription = hashParams.get('error_description') || searchParams.get('error_description')
    
    if (errorDescription) {
      alert(`Authentication Error: ${errorDescription.replace(/\+/g, ' ')}`)
      window.location.hash = ''
      // Optionally clear search params but this requires history API
    }

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
    // Apply global classes for accessibility and theming
    const root = document.documentElement
    root.className = ''
    if (highContrast || theme === 'dark') root.classList.add('dark')
    
    // Apply color theme
    if (colorTheme) root.classList.add(`theme-${colorTheme}`)
    
    if (fontSize === 'xlarge') root.classList.add('text-2xl')
    else if (fontSize === 'large') root.classList.add('text-xl')
    else root.classList.add('text-base')
  }, [fontSize, highContrast, theme, colorTheme])

  if (loading) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-[100dvh] bg-background text-foreground transition-colors duration-300 font-sans">
          <AlarmManager session={session} />
          <Routes>
            <Route path="/" element={session ? <Navigate to="/patient" replace /> : <Landing />} />
            
            <Route path="/login" element={session ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/signup" element={session ? <Navigate to="/" replace /> : <Signup />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/onboarding" element={session ? <Onboarding /> : <Navigate to="/login" replace />} />
            
            <Route path="/patient" element={<ProtectedRoute session={session}><PatientLayout /></ProtectedRoute>}>
              <Route index element={<PatientDashboard />} />
              <Route path="games" element={<GameList />} />
              <Route path="games/memory" element={<MemoryMatch />} />
              <Route path="games/ner-pattern-match" element={<NERPatternGame />} />
              <Route path="games/shape-tracer" element={<ShapeTracer />} />
              <Route path="games/sound-recognition" element={<SoundRecognition />} />
              <Route path="games/family-quiz" element={<FamilyQuiz />} />
              <Route path="games/memory-garden" element={<MemoryGarden />} />
              <Route path="reminders" element={<ReminderList />} />
              <Route path="reminders/water" element={<WaterReminder />} />
              <Route path="reminders/task/:guideId" element={<TaskGuideViewer />} />
              <Route path="reminiscence" element={<Reminiscence />} />
              <Route path="journal" element={<MemoryJournal />} />
              <Route path="my-family" element={<MyFamily />} />
              <Route path="face-scanner" element={<FaceScanner />} />
              <Route path="object-locator" element={<ObjectLocator />} />
              <Route path="profile" element={<PatientProfile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="support" element={<Support />} />
            </Route>
            
            <Route path="/caregiver" element={<ProtectedRoute session={session}><CaregiverDashboard /></ProtectedRoute>} />
            <Route path="/caregiver/profile" element={<ProtectedRoute session={session}><CaregiverProfile /></ProtectedRoute>} />
            <Route path="/caregiver/report/:patientId" element={<ProtectedRoute session={session}><ClinicalReport /></ProtectedRoute>} />
            
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
