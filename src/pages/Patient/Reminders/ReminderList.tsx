import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, User, ArrowLeft, Droplet, LayoutGrid, CheckCircle2, Activity, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

interface Reminder {
  id: string
  title: string
  time: string
  type: string
  frequency: string
}

export default function ReminderList() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReminders()
  }, [])

  const loadReminders = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('reminders')
        .select('*')
        .eq('patient_id', user.id)
        .eq('is_active', true)
        .order('time', { ascending: true })

      if (data) setReminders(data)
    } catch (error) {
      console.error("Error fetching reminders", error)
    } finally {
      setLoading(false)
    }
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'hydration': return { icon: Droplet, color: 'text-blue-500', bg: 'bg-blue-100' }
      case 'medicine': return { icon: LayoutGrid, color: 'text-purple-500', bg: 'bg-purple-100' }
      case 'activity': return { icon: Activity, color: 'text-orange-500', bg: 'bg-orange-100' }
      default: return { icon: Bell, color: 'text-green-500', bg: 'bg-green-100' }
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FDFDF9]">
      <Loader2 className="animate-spin text-[#1B4D3E]" size={48} />
    </div>
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDF9] font-sans pb-24">
      {/* Top Header */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-[#144533]">MemCall</h1>
          <nav className="hidden md:flex gap-6 text-sm font-semibold text-gray-500">
            <Link to="/patient" className="hover:text-[#144533] transition-colors pb-1">Today</Link>
            <Link to="/patient/games" className="hover:text-[#144533] transition-colors pb-1">Games</Link>
            <Link to="/patient/reminders" className="text-[#144533] border-b-2 border-[#144533] pb-1">Reminders</Link>
            <Link to="/patient/profile" className="hover:text-[#144533] transition-colors pb-1">Profile</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-2xl mx-auto w-full">
        <Link to="/patient" className="inline-flex items-center gap-2 text-[#144533] font-medium mb-6 hover:underline">
          <ArrowLeft size={20} /> Back to Home
        </Link>
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Your Reminders</h2>
        </div>
        
        <div className="space-y-4">
          {reminders.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <Bell size={32} />
              </div>
              <p className="text-gray-500 text-lg">You have no active reminders.</p>
            </div>
          ) : (
            reminders.map(rem => {
              const { icon: Icon, color, bg } = getIconForType(rem.type)
              const timeString = new Date(`2000-01-01T${rem.time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})

              return (
                <div key={rem.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-4">
                    <div className={`${bg} ${color} p-4 rounded-xl`}>
                      <Icon size={28} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{rem.title}</h3>
                      <p className="text-gray-500 font-medium">{timeString} • {rem.frequency}</p>
                    </div>
                  </div>
                  {/* Keep the test alert link for the water demo flow if needed, or remove. Let's remove for real dynamic data */}
                </div>
              )
            })
          )}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between z-50">
        <Link to="/patient" className="flex flex-col items-center text-gray-400">
          <div className="p-1"><CheckCircle2 size={24} /></div>
          <span className="text-xs font-medium mt-1">Today</span>
        </Link>
        <Link to="/patient/games" className="flex flex-col items-center text-gray-400">
          <div className="p-1"><LayoutGrid size={24} /></div>
          <span className="text-xs font-medium mt-1">Games</span>
        </Link>
        <Link to="/patient/reminders" className="flex flex-col items-center text-[#1B4D3E]">
          <div className="p-1"><Bell size={24} /></div>
          <span className="text-xs font-bold mt-1">Alerts</span>
        </Link>
        <Link to="/patient/profile" className="flex flex-col items-center text-gray-400">
          <div className="p-1"><User size={24} /></div>
          <span className="text-xs font-medium mt-1">Profile</span>
        </Link>
      </nav>
    </div>
  )
}
