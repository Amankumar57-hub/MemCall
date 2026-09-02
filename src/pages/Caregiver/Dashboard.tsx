import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { User, Loader2, LogOut, Plus, Award, Activity, Play, CheckCircle2, X, Bell } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface PatientDetails {
  id: string;
  full_name: string;
  current_cognitive_score: number;
  streak_days: number;
}

interface GameSession {
  id: string;
  score: number;
  duration_seconds: number;
  played_at: string;
  games: { name: string };
}

export default function CaregiverDashboard() {
  const [caregiverId, setCaregiverId] = useState<string | null>(null)
  const [patient, setPatient] = useState<PatientDetails | null>(null)
  const [gameSessions, setGameSessions] = useState<GameSession[]>([])
  
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [linkInput, setLinkInput] = useState('')
  const [linkError, setLinkError] = useState('')
  const [isLinking, setIsLinking] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [reminderForm, setReminderForm] = useState({ title: '', type: 'medicine', time: '09:00' })
  const [isAddingReminder, setIsAddingReminder] = useState(false)

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      if (localStorage.getItem('demo_mode') === 'true') {
        setPatient({
          id: 'demo-1',
          full_name: 'Demo Patient',
          current_cognitive_score: 85,
          streak_days: 5
        })
        setGameSessions([
          { id: '1', score: 90, duration_seconds: 120, played_at: new Date().toISOString(), games: { name: 'Memory Match' } }
        ])
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCaregiverId(user.id)

      // Find active linked patient
      const { data: links } = await supabase
        .from('caregiver_patient_links')
        .select('patient_id')
        .eq('caregiver_id', user.id)
        .eq('status', 'active')
        .limit(1)

      if (links && links.length > 0) {
        const pId = links[0].patient_id

        // Fetch patient details
        const { data: userDetails } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', pId)
          .single()

        const { data: profileDetails } = await supabase
          .from('patient_profiles')
          .select('current_cognitive_score, streak_days')
          .eq('user_id', pId)
          .single()

        if (userDetails) {
          setPatient({
            id: pId,
            full_name: userDetails.full_name,
            current_cognitive_score: profileDetails?.current_cognitive_score || 0,
            streak_days: profileDetails?.streak_days || 0
          })
        }

        // Fetch recent game sessions
        const { data: sessions } = await supabase
          .from('game_sessions')
          .select('id, score, duration_seconds, played_at, games(name)')
          .eq('patient_id', pId)
          .order('played_at', { ascending: false })
          .limit(5)
          
        if (sessions) {
          setGameSessions(sessions as unknown as GameSession[])
        }
      }
    } catch (error) {
      console.error("Error loading dashboard:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboardData()
  }, [])

  // Set up Realtime listener for alerts
  useEffect(() => {
    if (!caregiverId) return

    const channel = supabase
      .channel(`alerts:caregiver_id=${caregiverId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `caregiver_id=eq.${caregiverId}`
        },
        () => {
          // In a real app we might also show a toast notification here
          alert(`New Alert`)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [caregiverId])

  const handleLinkPatient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkInput.trim() || !caregiverId) return
    setIsLinking(true)
    setLinkError('')

    try {
      // Very basic validation - check if user exists
      const { data: targetUser } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', linkInput.trim())
        .single()

      if (!targetUser || targetUser.role !== 'patient') {
        throw new Error("Invalid Patient ID.")
      }

      const { error } = await supabase
        .from('caregiver_patient_links')
        .insert({
          caregiver_id: caregiverId,
          patient_id: targetUser.id,
          status: 'active' // Auto-approve for MVP
        })

      if (error) {
        if (error.code === '23505') throw new Error("Patient is already linked.")
        throw error
      }

      setShowAddModal(false)
      setLinkInput('')
      await loadDashboardData()
    } catch (err: unknown) {
      setLinkError((err as Error).message || "Failed to link patient.")
    } finally {
      setIsLinking(false)
    }
  }

  const handleSignOut = () => {
    supabase.auth.signOut()
  }

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patient || !caregiverId) return
    setIsAddingReminder(true)
    try {
      const { error } = await supabase.from('reminders').insert({
        patient_id: patient.id,
        created_by: caregiverId,
        title: reminderForm.title,
        type: reminderForm.type,
        time: reminderForm.time,
        frequency: 'daily',
        is_active: true
      })
      if (error) throw error
      setShowReminderModal(false)
      setReminderForm({ title: '', type: 'medicine', time: '09:00' })
      alert("Reminder added successfully!")
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to add reminder.")
    } finally {
      setIsAddingReminder(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FDFDF9]">
      <Loader2 className="animate-spin text-[#1B4D3E]" size={48} />
    </div>
  }

  return (
    <div className="min-h-screen bg-[#FDFDF9] font-sans pb-24">
      {/* Top Header */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-[#144533]">Sahayak</h1>
            <p className="text-[#144533] text-sm font-bold uppercase tracking-widest">Caregiver</p>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-semibold text-gray-500 ml-8">
            <Link to="/caregiver" className="text-[#144533] border-b-2 border-[#144533] pb-1">Dashboard</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-[#144533]">
          <button onClick={handleSignOut} className="p-2 hover:bg-gray-100 rounded-full" title="Sign Out"><LogOut size={24} /></button>
          <button className="hidden md:block bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-red-700 transition-colors">Emergency</button>
        </div>
      </header>

      <main className="p-6 md:p-10 max-w-5xl mx-auto w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Caregiver Dashboard</h2>
            <p className="text-gray-500 mt-1">
              {patient ? `Monitoring ${patient.full_name}'s daily activity and wellness.` : "Welcome to Sahayak."}
            </p>
          </div>
          {!patient ? (
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-[#1B4D3E] text-white px-6 py-3 rounded-full font-bold hover:bg-[#13382D] transition-colors shadow-sm active:scale-[0.98] flex items-center gap-2">
              <Plus size={20} /> Add Patient
            </button>
          ) : (
            <button 
              onClick={() => setShowReminderModal(true)}
              className="bg-[#1B4D3E] text-white px-6 py-3 rounded-full font-bold hover:bg-[#13382D] transition-colors shadow-sm active:scale-[0.98] flex items-center gap-2">
              <Bell size={20} /> Add Reminder
            </button>
          )}
        </div>

        {!patient ? (
          <div className="bg-white border border-gray-200 border-dashed rounded-3xl p-12 text-center shadow-sm">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <User size={40} className="text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No Patient Linked</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-8">
              Link a patient to start monitoring their cognitive wellness, game scores, and medication adherence.
            </p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-[#1B4D3E] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-[#13382D] transition-colors shadow-sm inline-flex items-center gap-2">
              <Plus size={24} /> Link a Patient Now
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Patient Info Card */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-[#1B4D3E] text-white rounded-full flex items-center justify-center font-bold text-2xl shadow-inner">
                    {patient.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{patient.full_name}</h3>
                    <p className="text-green-600 font-medium flex items-center gap-1 text-sm"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Active Now</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                    <div className="flex items-center gap-3 text-gray-500">
                      <Award size={20} className="text-purple-500" /> Cog. Score
                    </div>
                    <span className="font-bold text-gray-800">{patient.current_cognitive_score}/100</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                    <div className="flex items-center gap-3 text-gray-500">
                      <Activity size={20} className="text-orange-500" /> Current Streak
                    </div>
                    <span className="font-bold text-gray-800">{patient.streak_days} days</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-gray-500">
                      <Play size={20} className="text-blue-500" /> Total Games
                    </div>
                    <span className="font-bold text-gray-800">{gameSessions.length}</span>
                  </div>
                </div>
              </div>

              {/* Cognitive Wellness Trend */}
              <div className="md:col-span-2 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Activity size={24} className="text-[#1B4D3E]" />
                    Game Performance History
                  </h3>
                </div>
                
                {gameSessions.length === 0 ? (
                  <div className="h-48 w-full flex items-center justify-center text-gray-400 font-medium border-2 border-dashed border-gray-100 rounded-xl">
                    No game sessions recorded yet.
                  </div>
                ) : (
                  <div className="h-48 w-full flex items-end justify-between relative px-2">
                    {/* Background Grid */}
                    <div className="absolute inset-0 flex flex-col justify-between py-2 z-0">
                      {[100, 75, 50, 25, 0].map(val => (
                        <div key={val} className="w-full border-b border-dashed border-gray-100 relative">
                           <span className="absolute -left-6 -top-3 text-xs text-gray-300 font-bold">{val}</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Render actual bars for scores */}
                    <div className="absolute inset-0 z-10 flex items-end justify-around px-8 pb-2 pt-2">
                       {gameSessions.slice().reverse().map((session) => (
                         <div key={session.id} className="w-12 bg-[#1B4D3E]/20 rounded-t-lg relative group transition-all hover:bg-[#1B4D3E]/40" style={{ height: `${session.score}%` }}>
                            <div className="absolute top-0 left-0 right-0 bg-[#1B4D3E] rounded-t-lg" style={{ height: '4px' }}></div>
                            
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                               {session.score} pts ({session.duration_seconds}s)
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-center mt-4">
                   <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Recent Sessions</p>
                </div>
              </div>
            </div>

            {/* Recent Activity Log */}
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-6">
              <h3 className="text-xl font-bold text-gray-800 mb-6">Recent Activity Log</h3>
              
              <div className="space-y-4">
                {gameSessions.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No recent activity.</p>
                )}
                
                {gameSessions.map(session => (
                  <div key={session.id} className="flex items-start gap-4 p-4 rounded-xl border border-gray-50 hover:bg-gray-50 transition-colors">
                    <div className="bg-[#E1F4EA] p-3 rounded-xl text-[#1B4D3E] flex-shrink-0">
                      <CheckCircle2 size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-800">Played {session.games.name}</h4>
                        <span className="text-xs font-medium text-gray-400">
                          {new Date(session.played_at).toLocaleDateString()} {new Date(session.played_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Completed in {session.duration_seconds} seconds with a score of {session.score}.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">Link Patient</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-2">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-gray-500 mb-6">
              Ask your patient to share their <span className="font-bold text-gray-700">Link Code</span> from their Profile page and paste it below.
            </p>
            
            <form onSubmit={handleLinkPatient}>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Patient Link Code</label>
                <input 
                  type="text" 
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  className="w-full border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] font-mono text-sm"
                  required
                />
                {linkError && <p className="text-red-500 text-sm mt-2 font-medium">{linkError}</p>}
              </div>
              
              <button 
                type="submit"
                disabled={isLinking || !linkInput.trim()}
                className="w-full bg-[#1B4D3E] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#13382D] transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isLinking ? <><Loader2 size={20} className="animate-spin" /> Linking...</> : 'Link Patient'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800">New Reminder</h3>
              <button onClick={() => setShowReminderModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-2">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddReminder}>
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Title</label>
                <input 
                  type="text" 
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm({...reminderForm, title: e.target.value})}
                  placeholder="e.g. Take Blood Pressure Meds"
                  className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
                <select 
                  value={reminderForm.type}
                  onChange={(e) => setReminderForm({...reminderForm, type: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] bg-white"
                >
                  <option value="medicine">Medicine</option>
                  <option value="hydration">Hydration</option>
                  <option value="activity">Activity</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Time</label>
                <input 
                  type="time" 
                  value={reminderForm.time}
                  onChange={(e) => setReminderForm({...reminderForm, time: e.target.value})}
                  className="w-full border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
                  required
                />
              </div>
              
              <button 
                type="submit"
                disabled={isAddingReminder || !reminderForm.title}
                className="w-full bg-[#1B4D3E] text-white py-4 rounded-xl font-bold text-lg hover:bg-[#13382D] transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isAddingReminder ? <Loader2 size={20} className="animate-spin" /> : 'Create Reminder'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-center z-50">
        <Link to="/caregiver" className="flex flex-col items-center text-[#1B4D3E]">
          <div className="p-1"><Activity size={24} /></div>
          <span className="text-xs font-bold mt-1">Dashboard</span>
        </Link>
      </nav>
    </div>
  )
}
