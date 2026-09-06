import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Bell, Droplet, LayoutGrid, CheckCircle2, Activity, Loader2, Plus, X, Trash2, CalendarCheck, Pencil, ArrowLeft } from 'lucide-react'
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

interface TaskGuide {
  id: string;
  title: string;
  description: string;
}

export default function ReminderList() {
  const location = useLocation()
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [taskGuides, setTaskGuides] = useState<TaskGuide[]>([])
  const [loading, setLoading] = useState(true)
  const [patientId, setPatientId] = useState<string | null>(null)
  const { language } = useAppStore()
  
  // Add/Edit Reminder state
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    if (location.state?.openAddModal) {
      setShowAddModal(true)
    }
  }, [location.state])
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newTime, setNewTime] = useState('09:00')
  const [newType, setNewType] = useState('medicine')
  const [newFreq, setNewFreq] = useState('daily')
  const [isSaving, setIsSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('')

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
      
      const { data: guidesData } = await supabase
        .from('task_guides')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: false })
        
      if (guidesData) setTaskGuides(guidesData)
      
    } catch (error) {
      console.error("Error fetching reminders", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
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
        () => loadReminders()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [patientId])

  const getIconForType = (type: string) => {
    switch (type) {
      case 'hydration': return { icon: Droplet, color: 'text-[#0284C7]', bg: 'bg-[#E0F2FE]' }
      case 'medicine': return { icon: LayoutGrid, color: 'text-[#16A34A]', bg: 'bg-[#DCFCE7]' }
      case 'activity': return { icon: Activity, color: 'text-[#CA8A04]', bg: 'bg-[#FEF9C3]' }
      default: return { icon: Bell, color: 'text-[#7C3AED]', bg: 'bg-[#EFE8FA]' }
    }
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingReminderId(null)
    setNewTitle('')
    setNewTime('09:00')
    setNewType('medicine')
    setNewFreq('daily')
  }

  const openEditModal = (rem: Reminder) => {
    setEditingReminderId(rem.id)
    setNewTitle(rem.title)
    setNewTime(rem.time)
    setNewType(rem.type)
    setNewFreq(rem.frequency)
    setShowAddModal(true)
  }

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patientId || !newTitle) return
    setIsSaving(true)
    try {
      const payload = {
        patient_id: patientId,
        title: newTitle,
        time: newTime,
        type: newType,
        frequency: newFreq,
        is_active: true
      }
      
      if (editingReminderId) {
        setReminders(prev => prev.map(r => r.id === editingReminderId ? { ...r, ...payload } : r).sort((a, b) => a.time.localeCompare(b.time)))
        await supabase.from('reminders').update(payload).eq('id', editingReminderId)
        setToastMsg('Reminder updated successfully!')
      } else {
        setReminders(prev => [...prev, { id: 'temp-' + Date.now(), ...payload }].sort((a, b) => a.time.localeCompare(b.time)))
        await supabase.from('reminders').insert(payload)
        setToastMsg('Reminder saved successfully!')
      }
      
      closeModal()
      
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (err) {
      console.error(err)
      loadReminders()
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#5A4B81]" size={48} /></div>
  }

  return (
    <main className="flex-1 p-6 md:p-10 max-w-2xl mx-auto w-full relative pb-12">
      {showToast && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-4 bg-gray-800 text-white px-6 py-3 rounded-full font-medium shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4 z-50">
          <CheckCircle2 size={20} className="text-green-400" />
          {t(toastMsg, language)}
        </div>
      )}
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
           <Link to="/patient" className="p-2 -ml-2 text-gray-500 dark:text-gray-300 hover:text-primary transition-colors rounded-full hover:bg-gray-50 dark:hover:bg-gray-800">
             <ArrowLeft size={28} />
           </Link>
           <div className="w-14 h-14 bg-[#E0F2FE] rounded-2xl flex items-center justify-center text-[#0284C7] shadow-sm">
             <CalendarCheck size={32} />
           </div>
           <div>
              <h2 className="text-3xl font-bold text-[#5A4B81] dark:text-white">{t('Your Reminders', language)}</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mt-1">{t('Keep track of your daily tasks.', language)}</p>
           </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-[#5A4B81] text-white px-4 py-2 rounded-full font-bold shadow-sm hover:bg-[#3B2D60] transition-colors flex items-center gap-2"
        >
          <Plus size={20} /> {t('Add', language)}
        </button>
      </div>
      
      <div className="space-y-4">
        {reminders.length === 0 ? (
          <div className="bg-white dark:bg-card border border-gray-100 dark:border-border rounded-3xl p-8 text-center shadow-sm">
            <div className="bg-[#FAFAFA] dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-[#5A4B81] dark:text-primary-foreground">
              <Bell size={32} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg">{t('You have no active reminders.', language)}</p>
          </div>
        ) : (
          reminders.map(rem => {
            const { icon: Icon, color, bg } = getIconForType(rem.type)
            const timeString = new Date(`2000-01-01T${rem.time}`).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})

            return (
              <div key={rem.id} className="bg-white dark:bg-card border border-gray-100 dark:border-border rounded-3xl p-6 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow group">
                <div className="flex items-center gap-4">
                  <div className={`${bg} ${color} p-4 rounded-2xl`}>
                    <Icon size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{rem.title}</h3>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">{timeString} • {rem.frequency}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openEditModal(rem)}
                    className="p-3 text-gray-400 hover:text-[#5A4B81] hover:bg-[#EFE8FA] rounded-full transition-colors"
                  >
                    <Pencil size={20} />
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        setReminders(prev => prev.filter(r => r.id !== rem.id));
                        await supabase.from('reminders').delete().eq('id', rem.id);
                      } catch (e) {
                        console.error(e);
                        loadReminders();
                      }
                    }}
                    className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
      
      {taskGuides.length > 0 && (
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-[#5A4B81] dark:text-white mb-6 flex items-center gap-2">
            <LayoutGrid size={24} className="text-purple-500" />
            {t('Task Guides', language)}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {taskGuides.map(guide => (
              <Link key={guide.id} to={`/patient/reminders/task/${guide.id}`} className="bg-white dark:bg-card border border-gray-100 dark:border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group hover:scale-[1.02]">
                <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center text-purple-500 mb-4 shadow-sm">
                  <LayoutGrid size={24} />
                </div>
                <h4 className="text-xl font-bold text-gray-800 dark:text-white">{guide.title}</h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{guide.description}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Reminder Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-md shadow-2xl relative">
            <button onClick={closeModal} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-800 bg-gray-100 rounded-full">
              <X size={20} />
            </button>
            <h3 className="text-2xl font-bold text-[#5A4B81] mb-6">{editingReminderId ? t('Edit Reminder', language) : t('Create Reminder', language)}</h3>
            
            <form onSubmit={handleAddReminder} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t('Title / Medicine Name', language)}</label>
                <input 
                  type="text" required value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-[#5A4B81] focus:outline-none"
                  placeholder="e.g., Blood Pressure Medicine"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t('Time', language)}</label>
                <input 
                  type="time" required value={newTime} onChange={e => setNewTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-[#5A4B81] focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t('Type', language)}</label>
                  <select value={newType} onChange={e => setNewType(e.target.value)} className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-[#5A4B81] focus:outline-none bg-white">
                    <option value="medicine">Medicine</option>
                    <option value="hydration">Hydration</option>
                    <option value="activity">Activity</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{t('Frequency', language)}</label>
                  <select value={newFreq} onChange={e => setNewFreq(e.target.value)} className="w-full border border-gray-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-[#5A4B81] focus:outline-none bg-white">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="once">Once</option>
                  </select>
                </div>
              </div>
              <button 
                type="submit" disabled={isSaving}
                className="w-full bg-[#5A4B81] text-white py-4 rounded-2xl font-bold mt-4 shadow-lg hover:bg-[#3B2D60] disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : editingReminderId ? t('Update Reminder', language) : t('Save Reminder', language)}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
