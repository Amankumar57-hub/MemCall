import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Bell, LogOut, Settings as SettingsIcon, CheckCircle2, ChevronRight, X, Loader2, RefreshCw, User, Award, Activity, Play, Mail, Clock, Calendar, ArrowLeft, Trash2, ShieldAlert, Heart, FileText, BookOpen, Sparkles } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'
import { t } from '../../lib/i18n'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

import TaskGuideManager from '../../components/TaskGuideManager'
import ObjectLocatorManager from '../../components/ObjectLocatorManager'

// Fix for default marker icon in react-leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface PatientDetails {
  id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  current_cognitive_score: number;
  streak_days: number;
  latitude?: number | null;
  longitude?: number | null;
  location_updated_at?: string | null;
}

interface GameSession {
  id: string;
  score: number;
  duration_seconds: number;
  played_at: string;
  game_id: string;
}

interface Reminder {
  id: string;
  title: string;
  type: string;
  time: string;
  is_active: boolean;
}

interface Journal {
  id: string;
  transcription: string;
  ai_mood: string;
  ai_summary: string | null;
  created_at: string;
}

export default function CaregiverDashboard() {
  const navigate = useNavigate()
  const { language, setLanguage, highContrast, setHighContrast, colorTheme, setColorTheme } = useAppStore()
  const [caregiverId, setCaregiverId] = useState<string | null>(null)
  const [patients, setPatients] = useState<PatientDetails[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
  const [gameSessions, setGameSessions] = useState<GameSession[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [patientMood, setPatientMood] = useState<{ mood: string, created_at: string } | null>(null)
  const [journals, setJournals] = useState<Journal[]>([])
  
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [linkInput, setLinkInput] = useState('')
  const [linkError, setLinkError] = useState('')
  const [isLinking, setIsLinking] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [reminderForm, setReminderForm] = useState({ title: '', type: 'medicine', time: '09:00' })
  const [isAddingReminder, setIsAddingReminder] = useState(false)
  
  const [emergencyAlert, setEmergencyAlert] = useState<{id: string, message: string} | null>(null)
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null)

  const [aiSummary, setAiSummary] = useState<string | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        localStorage.removeItem('demo_mode')
        localStorage.removeItem('demo_role')
      } else {
        if (localStorage.getItem('demo_mode') === 'true') {
          setPatients([{
            id: 'demo-1',
            full_name: 'Demo Patient',
            email: 'demo@example.com',
            avatar_url: null,
            current_cognitive_score: 85,
            streak_days: 5
          }])
          // Intentionally left selectedPatientId as null to show list view first
          setGameSessions([
            { id: '1', score: 90, duration_seconds: 120, played_at: new Date().toISOString(), game_id: 'memory-match' }
          ])
          setReminders([
            { id: '1', title: 'Morning Meds', type: 'medicine', time: '09:00', is_active: true }
          ])
          setLoading(false)
        }
        return
      }
      
      setCaregiverId(user.id)

      // Find all active linked patients
      const { data: links } = await supabase
        .from('caregiver_patient_links')
        .select('patient_id')
        .eq('caregiver_id', user.id)
        .eq('status', 'active')

      if (links && links.length > 0) {
        const pIds = links.map(l => l.patient_id)

        // Fetch patient details (without email since it doesn't exist in users table)
        const { data: userDetails, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .in('id', pIds)

        if (usersError) console.error("users fetch error:", usersError)

        const { data: profileDetails, error: profilesError } = await supabase
          .from('patient_profiles')
          .select('user_id, current_cognitive_score, streak_days, latitude, longitude, location_updated_at')
          .in('user_id', pIds)

        if (profilesError) console.error("profiles fetch error:", profilesError)

        if (userDetails) {
          const mappedPatients = userDetails.map(u => {
            const profile = profileDetails?.find(p => p.user_id === u.id)
            return {
              id: u.id,
              full_name: u.full_name,
              email: null,
              avatar_url: u.avatar_url || null,
              current_cognitive_score: profile?.current_cognitive_score || 0,
              streak_days: profile?.streak_days || 0,
              latitude: profile?.latitude,
              longitude: profile?.longitude,
              location_updated_at: profile?.location_updated_at
            }
          })
          setPatients(mappedPatients)
        }
      } else {
        setPatients([])
        setSelectedPatientId(null)
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

  // Fetch game sessions and reminders when selected patient changes
  useEffect(() => {
    const fetchPatientData = async () => {
      if (!selectedPatientId) {
        setGameSessions([])
        setReminders([])
        setPatientMood(null)
        return
      }
      
      // Fetch game sessions
      const { data: sessions } = await supabase
        .from('game_sessions')
        .select('id, score, duration_seconds, played_at, game_id')
        .eq('patient_id', selectedPatientId)
        .order('played_at', { ascending: false })
        .limit(5)
        
      if (sessions) {
        setGameSessions(sessions as GameSession[])
      } else {
        setGameSessions([])
      }
      
      // Fetch active reminders
      const { data: rems } = await supabase
        .from('reminders')
        .select('id, title, type, time, is_active')
        .eq('patient_id', selectedPatientId)
        .eq('is_active', true)
        .order('time', { ascending: true })
        
      if (rems) {
        setReminders(rems as Reminder[])
      } else {
        setReminders([])
      }
      
      // Fetch latest mood
      const { data: moodData } = await supabase
        .from('mood_history')
        .select('mood, created_at')
        .eq('user_id', selectedPatientId)
        .order('created_at', { ascending: false })
        .limit(1)
        
      if (moodData && moodData.length > 0) {
        setPatientMood(moodData[0] as any)
      } else {
        setPatientMood(null)
      }
      
      // Fetch memory journals
      const { data: jData } = await supabase
        .from('patient_journals')
        .select('*')
        .eq('patient_id', selectedPatientId)
        .order('created_at', { ascending: false })
        .limit(5)
        
      if (jData) {
        setJournals(jData as Journal[])
      } else {
        setJournals([])
      }
    }
    fetchPatientData()

    // Realtime subscription for patient location updates
    const locationChannel = supabase
      .channel(`patient_location:${selectedPatientId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'patient_profiles', filter: `user_id=eq.${selectedPatientId}` },
        (payload) => {
          const newProfile = payload.new as any;
          if (newProfile.latitude && newProfile.longitude) {
            setPatients(current => current.map(p => 
              p.id === selectedPatientId 
                ? { ...p, latitude: newProfile.latitude, longitude: newProfile.longitude, location_updated_at: newProfile.location_updated_at }
                : p
            ));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(locationChannel);
    };
  }, [selectedPatientId])

  const generateAiInsights = async () => {
    if (!selectedPatientId) return;
    setLoadingSummary(true);
    setAiSummary(null);
    try {
      const { data, error } = await supabase.functions.invoke('caregiver-summary', {
        body: { patient_id: selectedPatientId, language }
      });
      if (error) throw error;
      setAiSummary(data.summary);
    } catch (e) {
      console.error(e);
      setAiSummary(language === 'hi' ? "AI रिपोर्ट जनरेट करने में त्रुटि।" : "Failed to generate AI insights.");
    } finally {
      setLoadingSummary(false);
    }
  };

  // Request notification permissions
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Set up Realtime listener for alerts
  useEffect(() => {
    if (!caregiverId) return

    // 1. Fetch any existing unread emergency alerts on mount (and setup fallback polling)
    const fetchUnreadAlerts = async () => {
      try {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .eq('caregiver_id', caregiverId)
          .in('alert_type', ['emergency', 'wandering'])
          .eq('is_read', false)
          .gte('created_at', oneHourAgo)
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          const unreadAlert = data[0];
          setEmergencyAlert(current => {
            // Only play sound if it's a new alert we haven't seen yet
            if (!current || current.id !== unreadAlert.id) {
              if (!alarmAudioRef.current) {
                alarmAudioRef.current = new Audio('/sounds/Alarm.mp3');
                alarmAudioRef.current.loop = true;
              }
              alarmAudioRef.current.play().catch(e => console.log('Audio block:', e));
            }
            return { id: unreadAlert.id, message: unreadAlert.message };
          });
        } else {
          // If no active unread emergency alert exists (e.g. Patient cancelled it), clear state immediately!
          setEmergencyAlert(current => {
            if (current) {
              if (alarmAudioRef.current) {
                alarmAudioRef.current.pause();
                alarmAudioRef.current.currentTime = 0;
              }
              return null;
            }
            return null;
          });
        }
      } catch (err) {
        console.error("Failed to fetch unread alerts", err);
      }
    };

    fetchUnreadAlerts();
    
    // Fallback polling every 4 seconds just in case Realtime drops
    const pollInterval = setInterval(fetchUnreadAlerts, 4000);

    // 2. Set up realtime listener for new alerts
    const channel = supabase.channel(`alerts:caregiver_id=${caregiverId}`);
    
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'alerts', filter: `caregiver_id=eq.${caregiverId}` },
      (payload) => {
        const newAlert = payload.new as any;
        if ((newAlert.alert_type === 'emergency' || newAlert.alert_type === 'wandering') && !newAlert.is_read) {
          // Show OS-level Notification if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('MemCall Alert', { body: newAlert.message, icon: '/icons.svg', requireInteraction: true });
          }
          if (!alarmAudioRef.current) {
            alarmAudioRef.current = new Audio('/sounds/Alarm.mp3');
            alarmAudioRef.current.loop = true;
          }
          alarmAudioRef.current.play().catch(e => console.log('Audio block:', e));
          setEmergencyAlert({ id: newAlert.id, message: newAlert.message });
        }
      }
    );

    channel.on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'alerts', filter: `caregiver_id=eq.${caregiverId}` },
      (payload) => {
        const updatedAlert = payload.new as any;
        if ((updatedAlert.alert_type === 'emergency' || updatedAlert.alert_type === 'wandering') && updatedAlert.is_read) {
          setEmergencyAlert(() => {
            if (alarmAudioRef.current) {
              alarmAudioRef.current.pause();
              alarmAudioRef.current.currentTime = 0;
            }
            return null;
          });
        }
      }
    );

    channel.subscribe();
    
    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    }
  }, [caregiverId])

  const handleLinkPatient = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkInput.trim() || !caregiverId) return
    setIsLinking(true)
    setLinkError('')

    try {
      const { error } = await supabase
        .from('caregiver_patient_links')
        .insert({
          caregiver_id: caregiverId,
          patient_id: linkInput.trim(),
          status: 'active'
        })

      if (error) {
        if (error.code === '23505') throw new Error("Patient is already linked.")
        if (error.code === '23503') throw new Error("Invalid Patient ID. Please check the code again.")
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

  const handleUnlinkPatient = async (patientId: string) => {
    if (!caregiverId) return;
    const confirmMsg = language === 'hi' 
      ? 'क्या आप वाकई इस मरीज को हटाना चाहते हैं?' 
      : 'Are you sure you want to remove this patient?';
    
    if (window.confirm(confirmMsg)) {
        try {
            const { error } = await supabase
                .from('caregiver_patient_links')
                .delete()
                .eq('caregiver_id', caregiverId)
                .eq('patient_id', patientId);
                
            if (error) throw error;
            
            setPatients(patients.filter(p => p.id !== patientId));
            setSelectedPatientId(null);
        } catch (err: any) {
            alert(err.message || "Failed to remove patient.");
        }
    }
  }

  const handleSignOut = () => {
    supabase.auth.signOut()
  }

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatientId || !caregiverId) return
    setIsAddingReminder(true)
    try {
      const { data, error } = await supabase.from('reminders').insert({
        patient_id: selectedPatientId,
        created_by: caregiverId,
        title: reminderForm.title,
        type: reminderForm.type,
        time: reminderForm.time,
        frequency: 'daily',
        is_active: true
      }).select().single()
      
      if (error) throw error
      
      // Update local state
      setReminders([...reminders, data as unknown as Reminder].sort((a, b) => a.time.localeCompare(b.time)))
      
      setShowReminderModal(false)
      setReminderForm({ title: '', type: 'medicine', time: '09:00' })
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to add reminder.")
    } finally {
      setIsAddingReminder(false)
    }
  }

  const formatGameName = (gameId: string) => {
    if (!gameId) return 'Game';
    return gameId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  const getReminderIcon = (type: string) => {
    if (type === 'medicine') return <Activity size={18} className="text-red-500" />;
    if (type === 'hydration') return <Activity size={18} className="text-blue-500" />;
    return <Calendar size={18} className="text-green-500" />;
  }

  const selectedPatient = patients.find(p => p.id === selectedPatientId)

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="animate-spin text-primary-hover" size={48} />
    </div>
  }

  return (
    <div className="min-h-screen bg-background dark:bg-[#121212] font-sans pb-24">
      {/* Top Header */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-100 dark:border-white/10 bg-white dark:bg-[#1E293B] sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-primary">{t('MemCall', language)}</h1>
            <p className="text-primary text-sm font-bold uppercase tracking-widest">{t('Caregiver', language)}</p>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-semibold text-gray-500 ml-8">
            <Link to="/caregiver" className="text-primary border-b-2 border-primary pb-1">{t('Dashboard', language)}</Link>
            <Link to="/caregiver/profile" className="hover:text-primary transition-colors pb-1">{t('Profile', language)}</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-primary">
          <button onClick={() => setShowSettingsModal(true)} className="p-2 hover:bg-gray-100 rounded-full" title={t('Settings', language)}><SettingsIcon size={24} /></button>
          <button onClick={handleSignOut} className="p-2 hover:bg-gray-100 rounded-full" title={t('Sign Out', language)}><LogOut size={24} /></button>
          <button className="hidden md:block bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm hover:bg-red-700 transition-colors">{t('Emergency', language)}</button>
        </div>
      </header>

      <main className="p-6 md:p-10 max-w-5xl mx-auto w-full">
        {!selectedPatientId ? (
          // LIST VIEW
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{t('Your Patients', language)}</h2>
                <p className="text-gray-500 dark:text-gray-300 mt-1">
                  {t('Select a patient below to view their activity and manage reminders.', language)}
                </p>
              </div>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-primary-hover text-white px-6 py-3 rounded-full font-bold hover:bg-primary-hover transition-colors shadow-sm active:scale-[0.98] flex items-center gap-2">
                <Plus size={20} /> {t('Link New Patient', language)}
              </button>
            </div>

            {patients.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {patients.map(patient => (
                  <div 
                    key={patient.id}
                    onClick={() => setSelectedPatientId(patient.id)}
                    className="bg-white dark:bg-[#1E293B] p-6 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm cursor-pointer transition-all hover:border-primary-hover/50 hover:shadow-md hover:-translate-y-1 group"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center font-bold text-xl text-primary overflow-hidden shadow-inner flex-shrink-0">
                        {patient.avatar_url ? (
                          <img src={patient.avatar_url} alt={patient.full_name} className="w-full h-full object-cover" />
                        ) : (
                          patient.full_name.charAt(0)
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xl text-gray-800 dark:text-white truncate group-hover:text-primary transition-colors">{patient.full_name}</h4>
                        {patient.email && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                            <Mail size={14} className="flex-shrink-0" />
                            <span className="truncate">{patient.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-4 border-t border-gray-50 mt-4">
                      <div className="text-sm font-medium text-gray-500">
                        {t('Score:', language)} <span className="text-primary font-bold">{patient.current_cognitive_score}</span>
                      </div>
                      <div className="flex items-center text-primary-hover text-sm font-bold group-hover:translate-x-1 transition-transform">
                        {t('View Details', language)} <ChevronRight size={16} className="ml-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-white/10 border-dashed rounded-3xl p-12 text-center shadow-sm mt-8">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <User size={40} className="text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{t('No Patient Linked', language)}</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-8">
                  {t('Link a patient to start monitoring their cognitive wellness, game scores, and medication adherence.', language)}
                </p>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-primary-hover text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-primary-hover transition-colors shadow-sm inline-flex items-center gap-2">
                  <Plus size={24} /> {t('Link a Patient Now', language)}
                </button>
              </div>
            )}
          </>
        ) : selectedPatient ? (
          // DETAIL VIEW
          <>
            <button 
              onClick={() => setSelectedPatientId(null)}
              className="mb-8 flex items-center gap-2 text-gray-500 hover:text-primary transition-colors font-bold text-sm"
            >
              <ArrowLeft size={16} /> {t('Back to Patients List', language)}
            </button>
            
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center font-bold text-lg text-primary overflow-hidden shadow-inner flex-shrink-0">
                  {selectedPatient.avatar_url ? (
                    <img src={selectedPatient.avatar_url} alt={selectedPatient.full_name} className="w-full h-full object-cover" />
                  ) : (
                    selectedPatient.full_name.charAt(0)
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{selectedPatient.full_name}</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">{t('Detailed Activity & Wellness', language)}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <button 
                  onClick={generateAiInsights}
                  disabled={loadingSummary}
                  className="bg-purple-50 text-purple-600 px-4 py-2 rounded-full font-bold hover:bg-purple-100 transition-colors text-sm flex items-center gap-2 shadow-sm w-full sm:w-auto disabled:opacity-50">
                  {loadingSummary ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {t('AI Insights', language) || 'AI Insights'}
                </button>
                <button 
                  onClick={() => window.open(`/caregiver/report/${selectedPatient.id}`, '_blank')}
                  className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full font-bold hover:bg-indigo-100 transition-colors text-sm flex items-center gap-2 shadow-sm w-full sm:w-auto">
                  <FileText size={16} /> {t('Download Report', language)}
                </button>
                <button 
                  onClick={() => setShowReminderModal(true)}
                  className="bg-accent text-primary-hover px-4 py-2 rounded-full font-bold hover:bg-primary-hover/20 transition-colors text-sm flex items-center gap-2 shadow-sm w-full sm:w-auto">
                  <Bell size={16} /> {t('New Reminder', language)}
                </button>
                <button 
                  onClick={() => handleUnlinkPatient(selectedPatient.id)}
                  className="bg-red-50 text-red-600 px-4 py-2 rounded-full font-bold hover:bg-red-100 transition-colors text-sm flex items-center gap-2 shadow-sm w-full sm:w-auto">
                  <Trash2 size={16} /> {t('Remove', language)}
                </button>
              </div>
            </div>

            {aiSummary && (
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="absolute -right-4 -top-4 text-purple-200/50"><Sparkles size={100} /></div>
                <div className="relative z-10 flex gap-4">
                  <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-purple-900 mb-1">{t('AI Insights', language) || 'AI Insights'}</h3>
                    <p className="text-sm text-purple-800 leading-relaxed font-medium">{aiSummary}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Patient Stats Card */}
              <div className="bg-white dark:bg-[#1E293B] border border-gray-100 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                    <div className="flex items-center gap-3 text-gray-500 font-medium">
                      <Award size={20} className="text-purple-500" /> {t('Cog. Score', language)}
                    </div>
                    <span className="font-bold text-gray-800 dark:text-white text-lg">{selectedPatient.current_cognitive_score}/100</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                    <div className="flex items-center gap-3 text-gray-500 font-medium">
                      <Activity size={20} className="text-orange-500" /> {t('Current Streak', language)}
                    </div>
                    <span className="font-bold text-gray-800 dark:text-white text-lg">{selectedPatient.streak_days} {t('days', language)}</span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                    <div className="flex items-center gap-3 text-gray-500 font-medium">
                      <Play size={20} className="text-blue-500" /> {t('Total Games', language)}
                    </div>
                    <span className="font-bold text-gray-800 dark:text-white text-lg">{gameSessions.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-gray-500 font-medium">
                      <Heart size={20} className="text-pink-500" /> {t('Current Mood', language)}
                    </div>
                    <span className="font-bold text-gray-800 dark:text-white text-lg capitalize">{patientMood ? t(patientMood.mood, language) : '--'}</span>
                  </div>
                </div>
              </div>

              {/* Cognitive Wellness Trend */}
              <div className="md:col-span-2 bg-white dark:bg-[#1E293B] border border-gray-100 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-[#F8FAFC] flex items-center gap-2">
                    <Activity size={20} className="text-primary-hover" />
                    {t('Game Performance History', language)}
                  </h3>
                </div>
                
                {gameSessions.length === 0 ? (
                  <div className="h-48 w-full flex items-center justify-center text-gray-400 font-medium border-2 border-dashed border-gray-100 rounded-xl">
                    {t('No game sessions recorded yet.', language)}
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
                         <div key={session.id} className="w-12 bg-primary-hover/20 rounded-t-lg relative group transition-all hover:bg-primary-hover/40" style={{ height: `${session.score}%` }}>
                            <div className="absolute top-0 left-0 right-0 bg-primary-hover rounded-t-lg" style={{ height: '4px' }}></div>
                            
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                               {session.score} pts ({session.duration_seconds}s)
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Live Location Map */}
            <div className="bg-white dark:bg-[#1E293B] border border-gray-100 dark:border-white/10 rounded-2xl p-6 shadow-sm mb-8 relative z-0">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <MapContainer className="hidden" /> {/* Dummy to ensure CSS is loaded */}
                  <span>📍</span>
                  {t('Live Location', language)}
                </h3>
                {selectedPatient.location_updated_at && (
                  <span className="text-xs text-gray-400 font-medium bg-gray-50 px-3 py-1 rounded-full">
                    Updated: {new Date(selectedPatient.location_updated_at).toLocaleTimeString()}
                  </span>
                )}
              </div>
              
              <div className="h-64 w-full rounded-xl overflow-hidden border-2 border-gray-100 relative z-0">
                {selectedPatient.latitude && selectedPatient.longitude ? (
                  <MapContainer 
                    key={selectedPatient.id}
                    center={[selectedPatient.latitude, selectedPatient.longitude]} 
                    zoom={15} 
                    style={{ height: '100%', width: '100%', zIndex: 0 }}
                    attributionControl={false}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[selectedPatient.latitude, selectedPatient.longitude]}>
                      <Popup>
                        <div className="font-bold text-center">
                          {selectedPatient.full_name}<br/>
                          <span className="text-xs text-gray-500 font-normal">Current Location</span>
                        </div>
                      </Popup>
                    </Marker>
                  </MapContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                    <span className="text-4xl mb-2 grayscale opacity-50">📍</span>
                    <p className="font-medium">{t('Location data not available.', language)}</p>
                    <p className="text-sm mt-1 text-gray-400">{t('Patient must grant location permissions in their app.', language)}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Recent Activity Log */}
              <div className="bg-white dark:bg-[#1E293B] border border-gray-100 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                  <Play size={20} className="text-primary" />
                  {t('Recent Activity Log', language)}
                </h3>
                
                <div className="space-y-4">
                  {gameSessions.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-gray-500 font-medium">{t('No recent activity.', language)}</p>
                    </div>
                  )}
                  
                  {gameSessions.map(session => (
                    <div key={session.id} className="flex items-start gap-4 p-4 rounded-xl border border-gray-50 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <div className="bg-accent p-3 rounded-xl text-primary-hover flex-shrink-0">
                        <CheckCircle2 size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-gray-800 dark:text-white">{t('Played', language)} {formatGameName(session.game_id)}</h4>
                          <span className="text-xs font-medium text-gray-400">
                            {new Date(session.played_at).toLocaleDateString()} {new Date(session.played_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                          {t('Completed in', language)} {session.duration_seconds} {t('seconds with a score of', language)} <span className="font-bold text-gray-700 dark:text-white">{session.score}</span>.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reminders List */}
              <div className="bg-white dark:bg-[#1E293B] border border-gray-100 dark:border-white/10 rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Bell size={20} className="text-primary" />
                    {t('Active Reminders', language)}
                  </h3>
                </div>
                
                <div className="space-y-4">
                  {reminders.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <p className="text-gray-500 font-medium">{t('No reminders set for this patient.', language)}</p>
                      <button 
                        onClick={() => setShowReminderModal(true)}
                        className="text-primary-hover text-sm font-bold mt-2 hover:underline">
                        {t('Create one now', language)}
                      </button>
                    </div>
                  )}
                  
                  {reminders.map(reminder => (
                    <div key={reminder.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-50 dark:border-white/10 bg-white dark:bg-white/5 hover:border-primary/30 transition-colors shadow-sm">
                      <div className="bg-gray-50 p-3 rounded-xl flex-shrink-0">
                        {getReminderIcon(reminder.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 dark:text-white">{reminder.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock size={12} className="text-gray-400" />
                          <span className="text-xs font-bold text-primary">{reminder.time}</span>
                          <span className="text-xs font-medium text-gray-400 capitalize px-1.5 py-0.5 bg-gray-100 rounded">
                            {t(reminder.type, language)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Memory Journals */}
            <div className="bg-white dark:bg-[#1E293B] border border-gray-100 dark:border-white/10 rounded-2xl p-6 shadow-sm mb-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <BookOpen size={20} className="text-purple-500" />
                  {t('Memory Journal Insights', language)}
                </h3>
              </div>
              
              <div className="space-y-4">
                {journals.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-gray-500 font-medium">{t('No journals recorded yet.', language)}</p>
                  </div>
                )}
                
                {journals.map(journal => (
                  <div key={journal.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-gray-50 dark:border-white/10 bg-white dark:bg-white/5 shadow-sm">
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 dark:bg-black/20 w-24 flex-shrink-0">
                      <span className="text-3xl mb-1">
                        {journal.ai_mood === 'happy' ? '😄' : 
                         journal.ai_mood === 'sad' ? '😟' : 
                         journal.ai_mood === 'anxious' ? '😰' : 
                         journal.ai_mood === 'confused' ? '🤔' : '😐'}
                      </span>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{journal.ai_mood}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-400">
                          {new Date(journal.created_at).toLocaleDateString()} {new Date(journal.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-sm italic mb-2">"{journal.transcription}"</p>
                      {journal.ai_summary && journal.ai_summary !== 'No summary available' && (
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium bg-purple-50 dark:bg-purple-900/30 inline-block px-2 py-1 rounded-md">
                          AI Insight: {journal.ai_summary}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Guide Manager */}
            <TaskGuideManager patientId={selectedPatient.id} />
            
            <ObjectLocatorManager patientId={selectedPatient.id} />
          </>
        ) : null}
      </main>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border dark:border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Link New Patient</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-2">
                <X size={20} />
              </button>
            </div>
            
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Ask the patient to share their <span className="font-bold text-gray-700 dark:text-gray-300">Link Code</span> from their Profile page and paste it below.
            </p>
            
            <form onSubmit={handleLinkPatient}>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Patient Link Code</label>
                <input 
                  type="text" 
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] font-mono text-sm bg-white dark:bg-transparent dark:text-white"
                  required
                />
                {linkError && <p className="text-red-500 text-sm mt-2 font-medium">{linkError}</p>}
              </div>
              
              <button 
                type="submit"
                disabled={isLinking || !linkInput.trim()}
                className="w-full bg-primary-hover text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
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
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 border dark:border-white/10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white">New Reminder</h3>
              <button onClick={() => setShowReminderModal(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 dark:bg-black/20 rounded-full p-2">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddReminder}>
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Title</label>
                <input 
                  type="text" 
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm({...reminderForm, title: e.target.value})}
                  placeholder="e.g. Take Blood Pressure Meds"
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] bg-white dark:bg-transparent dark:text-white"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Type</label>
                <select 
                  value={reminderForm.type}
                  onChange={(e) => setReminderForm({...reminderForm, type: e.target.value})}
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] bg-white dark:bg-black/20 dark:text-white"
                >
                  <option value="medicine">Medicine</option>
                  <option value="hydration">Hydration</option>
                  <option value="activity">Activity</option>
                </select>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Time</label>
                <input 
                  type="time" 
                  value={reminderForm.time}
                  onChange={(e) => setReminderForm({...reminderForm, time: e.target.value})}
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] bg-white dark:bg-transparent dark:text-white dark:[color-scheme:dark]"
                  required
                />
              </div>
              
              <button 
                type="submit"
                disabled={isAddingReminder || !reminderForm.title}
                className="w-full bg-primary-hover text-white py-4 rounded-xl font-bold text-lg hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {isAddingReminder ? <Loader2 size={20} className="animate-spin" /> : 'Create Reminder'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl relative border dark:border-white/10">
            <button onClick={() => setShowSettingsModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
              <X size={20} />
            </button>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <SettingsIcon size={24} className="text-primary-hover" />
              Settings
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Language</label>
                <select 
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="en">English</option>
                  <option value="hi">हिन्दी</option>
                  <option value="mr">मराठी</option>
                  <option value="gu">ગુજરાતી</option>
                  <option value="bn">বাংলা</option>
                  <option value="ta">தமிழ்</option>
                  <option value="te">తెలుగు</option>
                  <option value="as">Assamese / অসমীয়া</option>
                  <option value="kha">Khasi</option>
                  <option value="lus">Mizo</option>
                  <option value="nag">Nagamese</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-white">{t('High Contrast Mode', language)}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('Easier to read interface', language)}</p>
                </div>
                <button 
                  onClick={() => setHighContrast(!highContrast)}
                  className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors ${highContrast ? 'bg-primary' : 'bg-gray-300'}`}
                >
                  <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${highContrast ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <hr className="border-gray-100 my-4" />

              <div className="flex flex-col gap-4">
                <div>
                  <h4 className="font-bold text-gray-800">{t('Color Theme', language)}</h4>
                  <p className="text-sm text-gray-500">{t('Choose your preferred app color', language)}</p>
                </div>
                <div className="flex gap-4">
                  <button 
                    onClick={() => setColorTheme('green')}
                    className={`w-12 h-12 rounded-full bg-[#144533] border-4 transition-all ${colorTheme === 'green' ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent hover:scale-110'}`}
                    aria-label="Green Theme"
                  />
                  <button 
                    onClick={() => setColorTheme('blue')}
                    className={`w-12 h-12 rounded-full bg-[#3b82f6] border-4 transition-all ${colorTheme === 'blue' ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent hover:scale-110'}`}
                    aria-label="Blue Theme"
                  />
                  <button 
                    onClick={() => setColorTheme('purple')}
                    className={`w-12 h-12 rounded-full bg-[#8b5cf6] border-4 transition-all ${colorTheme === 'purple' ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent hover:scale-110'}`}
                    aria-label="Purple Theme"
                  />
                </div>
              </div>

              <hr className="border-gray-100 my-4" />
              
              <button 
                onClick={handleSignOut}
                className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 transition-colors flex justify-center items-center gap-2"
              >
                <LogOut size={20} /> {t('Sign Out', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Active Modal */}
      {emergencyAlert && (
        <div className="fixed inset-0 bg-red-600/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-8 w-full max-w-md shadow-2xl text-center animate-in zoom-in-95 duration-200 border dark:border-white/10">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-6xl animate-ping absolute">🚨</span>
              <span className="text-6xl relative z-10">🚨</span>
            </div>
            <h2 className="text-3xl font-black text-red-600 mb-4">EMERGENCY ALERT</h2>
            <p className="text-xl font-bold text-gray-800 dark:text-white mb-8">{emergencyAlert.message}</p>
            <button 
              onClick={async () => {
                if (alarmAudioRef.current) {
                  alarmAudioRef.current.pause();
                  alarmAudioRef.current.currentTime = 0;
                }
                if (emergencyAlert?.id) {
                  try {
                    await supabase.from('alerts').update({ is_read: true }).eq('id', emergencyAlert.id);
                  } catch(e) { console.error('Failed to acknowledge alert', e) }
                }
                setEmergencyAlert(null);
              }}
              className="w-full bg-red-600 text-white py-4 rounded-xl font-black text-xl hover:bg-red-700 shadow-lg active:scale-95 transition-all"
            >
              ACKNOWLEDGE
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1E293B] border-t border-gray-200 dark:border-white/10 px-6 py-4 flex justify-around z-50">
        <Link to="/caregiver" className="flex flex-col items-center text-primary-hover border-t-2 border-primary -mt-4 pt-4">
          <div className="p-1"><Activity size={24} /></div>
          <span className="text-xs font-bold mt-1">{t('Dashboard', language)}</span>
        </Link>
        <Link to="/caregiver/profile" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <div className="p-1"><User size={24} /></div>
          <span className="text-xs font-bold mt-1">{t('Profile', language)}</span>
        </Link>
      </nav>
    </div>
  )
}
