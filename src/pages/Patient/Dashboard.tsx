import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, User, Mic, CheckCircle2, Circle, Settings, LayoutGrid, Loader2, Globe, Cloud, CloudOff, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useVoiceCommand } from '../../hooks/useVoiceCommand'
import { useAppStore } from '../../store/useAppStore'
import { useSync } from '../../hooks/useSync'

interface Reminder {
  id: string
  title: string
  time: string
  type: string
}

export default function PatientDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [patientName, setPatientName] = useState('Patient')
  const navigate = useNavigate()
  
  const { language, setLanguage } = useAppStore()
  const { isListening, transcript, startListening, resetTranscript, error: voiceError } = useVoiceCommand()
  const { isOnline, isSyncing } = useSync()

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    loadDashboardData()
    return () => clearInterval(timer)
  }, [])

  // Handle voice commands
  useEffect(() => {
    if (transcript) {
      console.log("Voice command received:", transcript)
      
      if (transcript.includes('play') || transcript.includes('game') || transcript.includes('memory match')) {
        readAloud("Opening Memory Match game for you.")
        setTimeout(() => navigate('/patient/games/memory'), 2000)
        resetTranscript()
      } 
      else if (transcript.includes('reminders') || transcript.includes('task') || transcript.includes('what')) {
        if (reminders.length > 0) {
          const uncompleted = reminders.filter(r => !completedTaskIds.has(r.id))
          if (uncompleted.length > 0) {
            const taskList = uncompleted.map(r => r.title).join(", and ")
            readAloud(`You have ${uncompleted.length} tasks left today. Please ${taskList}.`)
          } else {
            readAloud("Great job! You have completed all your tasks for today.")
          }
        } else {
          readAloud("You have no tasks scheduled for today.")
        }
        resetTranscript()
      }
      else if (transcript.includes('home')) {
        navigate('/patient')
        resetTranscript()
      }
    }
  }, [transcript, navigate, reminders, completedTaskIds, resetTranscript])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch Profile
      const { data: profile } = await supabase
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single()
      
      if (profile) setPatientName(profile.full_name.split(' ')[0]) // Get first name

      // Fetch Reminders
      const { data: userReminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('patient_id', user.id)
        .eq('is_active', true)
        .order('time', { ascending: true })

      if (userReminders) {
        setReminders(userReminders)

        // Find today's completed logs
        const today = new Date().toISOString().split('T')[0]
        const { data: logs } = await supabase
          .from('reminder_logs')
          .select('reminder_id')
          .eq('patient_id', user.id)
          .gte('acknowledged_at', `${today}T00:00:00Z`)
        
        if (logs) {
          setCompletedTaskIds(new Set(logs.map(log => log.reminder_id)))
        }
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = currentTime.getHours()
    if (language === 'hi') {
      if (hour < 12) return 'सुप्रभात'
      if (hour < 18) return 'शुभ दोपहर'
      return 'शुभ संध्या'
    } else {
      if (hour < 12) return 'Good Morning'
      if (hour < 18) return 'Good Afternoon'
      return 'Good Evening'
    }
  }

  const toggleTask = async (id: string, time: string) => {
    if (completedTaskIds.has(id)) return // Already completed for today

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Optimistic update
      const newCompleted = new Set(completedTaskIds)
      newCompleted.add(id)
      setCompletedTaskIds(newCompleted)

      // Create a fake triggered timestamp based on today's date and the reminder time
      const today = new Date().toISOString().split('T')[0]
      const triggeredTimestamp = new Date(`${today}T${time}`).toISOString()

      await supabase
        .from('reminder_logs')
        .insert({
          reminder_id: id,
          patient_id: user.id,
          triggered_at: triggeredTimestamp,
          acknowledged_at: new Date().toISOString()
        })
      
    } catch (error) {
      console.error("Error logging reminder completion:", error)
      // Revert if error
      const reverted = new Set(completedTaskIds)
      reverted.delete(id)
      setCompletedTaskIds(reverted)
    }
  }

  const readAloud = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel() // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9; // Slightly slower for elderly
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FDFDF9]">
      <Loader2 className="animate-spin text-[#1B4D3E]" size={48} />
    </div>
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDF9] pb-24 font-sans">
      {/* Top Header */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-[#144533]">MemCall</h1>
          <nav className="hidden md:flex gap-6 text-sm font-semibold text-gray-500">
            <Link to="/patient" className="text-[#144533] border-b-2 border-[#144533] pb-1">Today</Link>
            <Link to="/patient/games" className="hover:text-[#144533] transition-colors pb-1">Games</Link>
            <Link to="/patient/reminders" className="hover:text-[#144533] transition-colors pb-1">Reminders</Link>
            <Link to="/patient/profile" className="hover:text-[#144533] transition-colors pb-1">Profile</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-[#144533]">
          {/* Network / Sync Status */}
          <div className="hidden md:flex items-center gap-2 text-sm font-medium bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
            {!isOnline ? (
              <><CloudOff size={16} className="text-orange-500" /><span className="text-orange-600">Offline Mode</span></>
            ) : isSyncing ? (
              <><RefreshCw size={16} className="text-blue-500 animate-spin" /><span className="text-blue-600">Syncing...</span></>
            ) : (
              <><Cloud size={16} className="text-green-500" /><span className="text-green-600">Synced</span></>
            )}
          </div>
          
          <button 
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="p-2 hover:bg-gray-100 rounded-full flex items-center gap-1 font-bold text-sm"
          >
            <Globe size={20} />
            {language === 'en' ? 'EN' : 'HI'}
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full" onClick={() => readAloud("You have " + (reminders.length - completedTaskIds.size) + " reminders left today.")}><Bell size={24} /></button>
          <button className="p-2 hover:bg-gray-100 rounded-full"><User size={24} /></button>
          <button className="hidden md:block bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm">Emergency</button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
        {/* Greeting */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800">{getGreeting()}, {patientName}</h2>
          <p className="text-gray-500 font-medium mt-1">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} • {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        {/* Big Voice Button */}
        <div className="mb-10">
          <button 
            onClick={() => {
              if (isListening) return;
              readAloud("I am listening.")
              setTimeout(() => startListening(), 1000)
            }}
            className={`w-full text-white rounded-2xl py-6 flex items-center justify-center gap-3 transition-all shadow-lg active:scale-[0.98] ${
              isListening ? 'bg-blue-600 animate-pulse shadow-blue-600/30' : 'bg-[#1B4D3E] hover:bg-[#13382D] shadow-[#1B4D3E]/20'
            }`}
          >
            <Mic size={32} className={isListening ? 'animate-bounce' : ''} />
            <span className="text-2xl font-bold">
              {isListening ? 'Listening...' : 'Tap to Speak'}
            </span>
          </button>
          {voiceError && <p className="text-red-500 text-center mt-2 font-medium">{voiceError}</p>}
          {transcript && <p className="text-gray-600 text-center mt-2 font-medium italic">"{transcript}"</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Today's Tasks */}
          <section>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-[#1B4D3E] rounded-full inline-block"></span>
              Today's Tasks
            </h3>
            
            {reminders.length === 0 ? (
               <div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm text-center">
                  <p className="text-gray-500">You have no tasks scheduled for today.</p>
               </div>
            ) : (
              <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-2">
                {reminders.map(task => {
                  const isCompleted = completedTaskIds.has(task.id)
                  // Format time to 12h
                  const timeString = new Date(`2000-01-01T${task.time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                  
                  return (
                    <button 
                      key={task.id}
                      onClick={() => toggleTask(task.id, task.time)}
                      disabled={isCompleted}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                        isCompleted ? 'border-transparent bg-gray-50 opacity-70 cursor-default' : 'border-gray-100 hover:border-[#1B4D3E]/30 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${isCompleted ? 'bg-gray-200 text-gray-400' : 'bg-[#E1F4EA] text-[#1B4D3E]'}`}>
                          {task.type === 'medicine' ? <LayoutGrid size={24} /> : 
                           task.type === 'hydration' ? <CheckCircle2 size={24} /> : 
                           <Settings size={24} />}
                        </div>
                        <div>
                          <span className={`block text-xl font-semibold ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {task.title}
                          </span>
                          <span className={`text-sm font-bold ${isCompleted ? 'text-gray-400' : 'text-[#1B4D3E]'}`}>{timeString}</span>
                        </div>
                      </div>
                      <div className="text-[#1B4D3E]">
                        {isCompleted ? <CheckCircle2 size={32} className="fill-[#1B4D3E] text-white" /> : <Circle size={32} className="text-gray-300" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* Play & Exercise */}
          <section>
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-2 h-6 bg-[#1B4D3E] rounded-full inline-block"></span>
              Play & Exercise
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/patient/games/memory" className="bg-[#FCEBD7] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] border border-[#F5D8BA]">
                <div className="bg-white/50 p-4 rounded-full mb-4">
                  <LayoutGrid size={36} className="text-[#D97706]" />
                </div>
                <span className="text-xl font-bold text-[#92400E]">Memory Match</span>
              </Link>
              
              <button className="bg-[#FCE4E6] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] border border-[#F5C7CB]">
                <div className="bg-white/50 p-4 rounded-full mb-4">
                  <User size={36} className="text-[#BE123C]" />
                </div>
                <span className="text-xl font-bold text-[#881337]">Pattern Match</span>
              </button>
            </div>
          </section>
        </div>

        {/* Daily Tip Section to make page longer */}
        <section className="mt-8 mb-4">
          <div className="bg-[#E1F4EA] border border-[#C2E8D3] rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <User size={120} className="text-[#1B4D3E]" />
            </div>
            <div className="relative z-10">
              <h3 className="text-[#1B4D3E] font-bold text-lg mb-2 flex items-center gap-2">
                <CheckCircle2 size={20} />
                Health Tip of the Day
              </h3>
              <p className="text-[#1B4D3E]/80 text-lg max-w-lg leading-relaxed">
                Drinking a glass of warm water before bed helps digestion and keeps your body hydrated throughout the night.
              </p>
            </div>
          </div>
        </section>
      </main>
      
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between z-50">
        <Link to="/patient" className="flex flex-col items-center text-[#1B4D3E]">
          <div className="p-1"><CheckCircle2 size={24} /></div>
          <span className="text-xs font-bold mt-1">Today</span>
        </Link>
        <Link to="/patient/games" className="flex flex-col items-center text-gray-400">
          <div className="p-1"><LayoutGrid size={24} /></div>
          <span className="text-xs font-medium mt-1">Games</span>
        </Link>
        <Link to="/patient/reminders" className="flex flex-col items-center text-gray-400">
          <div className="p-1"><Bell size={24} /></div>
          <span className="text-xs font-medium mt-1">Alerts</span>
        </Link>
        <Link to="/patient/profile" className="flex flex-col items-center text-gray-400">
          <div className="p-1"><User size={24} /></div>
          <span className="text-xs font-medium mt-1">Profile</span>
        </Link>
      </nav>
    </div>
  )
}
