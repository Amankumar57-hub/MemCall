import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, User, ArrowLeft, Droplet, LayoutGrid, CheckCircle2, Activity, Loader2, Plus, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAppStore } from '../../../store/useAppStore'
import { t } from '../../../lib/i18n'

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
  const [patientId, setPatientId] = useState<string | null>(null)
  const { language } = useAppStore()
  
  // Add Reminder state
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTime, setNewTime] = useState('09:00')
  const [newType, setNewType] = useState('medicine')
  const [newFreq, setNewFreq] = useState('daily')
  const [isSaving, setIsSaving] = useState(false)

  const loadReminders = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setPatientId(user.id)

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReminders()
  }, [])

  useEffect(() => {
    if (!patientId) return

    const channel = supabase
      .channel(`reminders:patient_id=${patientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reminders',
          filter: `patient_id=eq.${patientId}`
        },
        () => {
          // If any reminder is inserted, updated, or deleted, reload the list
          loadReminders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [patientId])

  const getIconForType = (type: string) => {
    switch (type) {
      case 'hydration': return { icon: Droplet, color: 'text-blue-500', bg: 'bg-blue-100' }
      case 'medicine': return { icon: LayoutGrid, color: 'text-purple-500', bg: 'bg-purple-100' }
      case 'activity': return { icon: Activity, color: 'text-orange-500', bg: 'bg-orange-100' }
      default: return { icon: Bell, color: 'text-green-500', bg: 'bg-green-100' }
    }
  }

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !newTitle) return
    setIsSaving(true)
    try {
      await supabase.from('reminders').insert({
        patient_id: patientId,
        title: newTitle,
        time: newTime,
        type: newType,
        frequency: newFreq,
        is_active: true
      })
      setShowAddModal(false)
      setNewTitle('')
      setNewTime('09:00')
    } catch (err) {
      console.error(err)
    } finally {
      setIsSaving(false)
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
            <Link to="/patient" className="hover:text-[#144533] transition-colors pb-1">{t('Today', language)}</Link>
            <Link to="/patient/games" className="hover:text-[#144533] transition-colors pb-1">{t('Games', language)}</Link>
            <Link to="/patient/reminders" className="text-[#144533] border-b-2 border-[#144533] pb-1">{t('Reminders', language)}</Link>
            <Link to="/patient/profile" className="hover:text-[#144533] transition-colors pb-1">{t('Profile', language)}</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-2xl mx-auto w-full">
        <Link to="/patient" className="inline-flex items-center gap-2 text-[#144533] font-medium mb-6 hover:underline">
          <ArrowLeft size={20} /> {t('Back to Home', language)}
        </Link>
        
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">{t('Your Reminders', language)}</h2>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-[#1B4D3E] text-white px-4 py-2 rounded-full font-bold shadow-sm hover:bg-[#13382D] transition-colors flex items-center gap-2"
          >
            <Plus size={20} /> {t('Add', language)}
          </button>
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

      {/* Add Reminder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-800 bg-gray-100 rounded-full">
              <X size={20} />
            </button>
            <h3 className="text-2xl font-bold text-gray-800 mb-6">{t('Create Reminder', language)}</h3>
            
            <form onSubmit={handleAddReminder} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t('Title / Medicine Name', language)}</label>
                <input 
                  type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#1B4D3E] focus:outline-none"
                  placeholder="e.g., Blood Pressure Medicine"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t('Time', language)}</label>
                <input 
                  type="time" required value={newTime} onChange={e => setNewTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#1B4D3E] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t('Type', language)}</label>
                  <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#1B4D3E] focus:outline-none bg-white">
                    <option value="medicine">Medicine</option>
                    <option value="hydration">Hydration</option>
                    <option value="activity">Activity</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t('Frequency', language)}</label>
                  <select value={newFreq} onChange={e => setNewFreq(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#1B4D3E] focus:outline-none bg-white">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="once">Once</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit" disabled={isSaving}
                className="w-full bg-[#1B4D3E] text-white py-4 rounded-xl font-bold mt-4 shadow-lg hover:bg-[#13382D] disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : t('Save Reminder', language)}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between z-50">
        <Link to="/patient" className="flex flex-col items-center text-gray-400">
          <div className="p-1"><CheckCircle2 size={24} /></div>
          <span className="text-xs font-medium mt-1">{t('Today', language)}</span>
        </Link>
        <Link to="/patient/games" className="flex flex-col items-center text-gray-400">
          <div className="p-1"><LayoutGrid size={24} /></div>
          <span className="text-xs font-medium mt-1">{t('Games', language)}</span>
        </Link>
        <Link to="/patient/reminders" className="flex flex-col items-center text-[#1B4D3E]">
          <div className="p-1"><Bell size={24} /></div>
          <span className="text-xs font-bold mt-1">{t('Alerts', language)}</span>
        </Link>
        <Link to="/patient/profile" className="flex flex-col items-center text-gray-400">
          <div className="p-1"><User size={24} /></div>
          <span className="text-xs font-medium mt-1">{t('Profile', language)}</span>
        </Link>
      </nav>
    </div>
  )
}
