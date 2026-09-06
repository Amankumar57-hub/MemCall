import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Calendar, Brain, User, Music, ShieldAlert, Phone, Sun, Pill, CalendarCheck, CheckCircle2, Loader2, X, BookOpen, Camera } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'
import { Geolocation } from '@capacitor/geolocation'
import { Capacitor } from '@capacitor/core'
import { t } from '../../lib/i18n'

export default function PatientDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [linkedCaregiverId, setLinkedCaregiverId] = useState<string | null>(null)
  
  // Emergency State
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState<string | null>(null)
  const [emergencySeconds, setEmergencySeconds] = useState(0)
  const [emergencyAcknowledged, setEmergencyAcknowledged] = useState(false)
  
  // Daily Progress State
  const [todayGameMinutes, setTodayGameMinutes] = useState(0)
  const [dailyTasks, setDailyTasks] = useState<any[]>([])
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([])
  const [showTasksModal, setShowTasksModal] = useState(false)
  
  const navigate = useNavigate()
  const location = useLocation()
  const { language, familyCallNumber, familyCallName } = useAppStore()

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    loadDashboardData()
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (location.state?.triggerEmergency) {
      triggerEmergency()
    }
  }, [location.state, profile?.id])

  useEffect(() => {
    const handleTriggerEvent = () => triggerEmergency()
    const handleCancelEvent = () => cancelEmergency()
    window.addEventListener('trigger-emergency', handleTriggerEvent)
    window.addEventListener('cancel-emergency', handleCancelEvent)
    return () => {
      window.removeEventListener('trigger-emergency', handleTriggerEvent)
      window.removeEventListener('cancel-emergency', handleCancelEvent)
    }
  }, [profile?.id])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      if (localStorage.getItem('demo_mode') === 'true') {
        setProfile({ full_name: 'Demo Patient' })
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userProfile } = await supabase.from('users').select('*').eq('id', user.id).single()
      if (userProfile) {
        setProfile(userProfile)
      }
      
      const { data: linkData } = await supabase.from('caregiver_patient_links').select('caregiver_id').eq('patient_id', user.id).eq('status', 'active').limit(1)
      if (linkData && linkData.length > 0) {
        setLinkedCaregiverId(linkData[0].caregiver_id)
      }
      
      // Fetch Daily Progress (Games)
      const today = new Date();
      today.setHours(0,0,0,0);
      const { data: gameSessions } = await supabase
        .from('game_sessions')
        .select('duration_seconds')
        .eq('patient_id', user.id)
        .gte('played_at', today.toISOString());
        
      if (gameSessions) {
        const totalSecs = gameSessions.reduce((acc, curr) => acc + (curr.duration_seconds || 0), 0);
        setTodayGameMinutes(Math.floor(totalSecs / 60));
      }
      
      // Fetch Daily Tasks (Reminders)
      const { data: remindersData } = await supabase
        .from('reminders')
        .select('*')
        .eq('patient_id', user.id)
        .eq('is_active', true);
        
      if (remindersData) {
        setDailyTasks(remindersData);
      }
      
      // Fetch Completed Tasks for today
      const { data: logsData } = await supabase
        .from('reminder_logs')
        .select('reminder_id')
        .eq('patient_id', user.id)
        .gte('acknowledged_at', today.toISOString());
        
      if (logsData) {
        setCompletedTaskIds(logsData.map(l => l.reminder_id));
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleTask = async (taskId: string) => {
    if (!profile?.id) return;
    const isCompleted = completedTaskIds.includes(taskId);
    
    try {
      if (isCompleted) {
        // Optimistic UI update
        setCompletedTaskIds(prev => prev.filter(id => id !== taskId));
        
        // Remove from DB for today
        const today = new Date();
        today.setHours(0,0,0,0);
        await supabase
          .from('reminder_logs')
          .delete()
          .eq('reminder_id', taskId)
          .eq('patient_id', profile.id)
          .gte('acknowledged_at', today.toISOString());
      } else {
        // Optimistic UI update
        setCompletedTaskIds(prev => [...prev, taskId]);
        
        // Add to DB
        await supabase
          .from('reminder_logs')
          .insert({
            reminder_id: taskId,
            patient_id: profile.id,
            status: 'completed'
          });
      }
    } catch (e) {
      console.error("Failed to toggle task", e);
      // Revert on error
      loadDashboardData();
    }
  };

  // Realtime listener for when caregiver acknowledges the alert
  useEffect(() => {
    if (!profile?.id) return;
    
    // Set up location tracking
    let watchId: string | undefined;
    const startLocationTracking = async () => {
        const handleLocationUpdate = async (coords: { latitude: number, longitude: number }) => {
          if (!profile?.id) return;
          console.log('Location updated:', coords.latitude, coords.longitude);
          const { error: dbError } = await supabase
            .from('patient_profiles')
            .update({ 
              latitude: coords.latitude, 
              longitude: coords.longitude,
              location_updated_at: new Date().toISOString()
            })
            .eq('user_id', profile.id);
            
          if (dbError) {
            console.error('Failed to update location in DB:', dbError);
            if (dbError.message.includes('column') || dbError.code === '42703') {
               alert('Database Error: The location columns are missing in Supabase! Please run the SQL command in the Supabase Dashboard to add latitude and longitude columns.');
            }
          }
        };

        if (!Capacitor.isNativePlatform() && 'geolocation' in navigator) {
          // Web Fallback using HTML5 Geolocation (more reliable on desktop browsers)
          navigator.geolocation.getCurrentPosition(
            (pos) => handleLocationUpdate(pos.coords),
            (err) => console.warn('Web initial location error:', err.message),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
          );
          
          watchId = navigator.geolocation.watchPosition(
            (pos) => handleLocationUpdate(pos.coords),
            (err) => console.warn('Web watch location error:', err.message),
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
          ) as any;
        } else {
          // Native Capacitor Geolocation
          if (Capacitor.isNativePlatform()) {
            const permissions = await Geolocation.checkPermissions();
            if (permissions.location !== 'granted') {
              const request = await Geolocation.requestPermissions();
              if (request.location !== 'granted') return;
            }
          }

          try {
            const initialPos = await Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0
            });
            if (initialPos) {
              await handleLocationUpdate(initialPos.coords);
            }
          } catch (initialErr) {
            console.warn('Could not get initial position natively:', initialErr);
          }

          watchId = await Geolocation.watchPosition(
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
            async (position, err) => {
              if (err) {
                console.error('Geolocation watchPosition error:', err);
                return;
              }
              if (position) {
                await handleLocationUpdate(position.coords);
              }
            }
          );
        }
    };
    startLocationTracking();
    
    const channel = supabase
      .channel(`patient_alerts:${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
          filter: `patient_id=eq.${profile.id}`
        },
        (payload) => {
          const updatedAlert = payload.new as any;
          if (updatedAlert.alert_type === 'emergency' && updatedAlert.is_read === true) {
            if (activeEmergencyAlert === updatedAlert.id) {
               setActiveEmergencyAlert(null);
               setEmergencyAcknowledged(false);
               setEmergencySeconds(0);
            }
          }
        }
      )
      .subscribe()
      
    return () => {
      supabase.removeChannel(channel);
      if (watchId !== undefined) {
        if (!Capacitor.isNativePlatform() && 'geolocation' in navigator) {
          navigator.geolocation.clearWatch(watchId as unknown as number);
        } else {
          Geolocation.clearWatch({ id: watchId as string });
        }
      }
    }
  }, [profile?.id, activeEmergencyAlert])

  // Timer for active emergency
  useEffect(() => {
    let interval: any;
    if (activeEmergencyAlert && !emergencyAcknowledged) {
      interval = setInterval(() => {
        setEmergencySeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeEmergencyAlert, emergencyAcknowledged]);

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  const triggerEmergency = async () => {
    if (!profile?.id) return;
    
    // ALWAYS fetch the latest caregiver link right before sending the alert
    // This prevents sending alerts to old caregivers if the user didn't refresh their page
    let currentCaregiverId = null;
    const { data: linkData } = await supabase
      .from('caregiver_patient_links')
      .select('caregiver_id')
      .eq('patient_id', profile.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (linkData && linkData.length > 0) {
      currentCaregiverId = linkData[0].caregiver_id;
      setLinkedCaregiverId(currentCaregiverId);
    }
    
    if (!currentCaregiverId) {
      setActiveEmergencyAlert('demo-emergency-active');
      setEmergencySeconds(0);
      setEmergencyAcknowledged(false);
      return;
    }
    
    try {
      const { data, error } = await supabase.from('alerts').insert({
        caregiver_id: currentCaregiverId,
        patient_id: profile.id,
        alert_type: 'emergency',
        message: `${profile?.full_name || 'Your patient'} has pressed the Emergency SOS button!`,
        severity: 'critical'
      }).select().single();
      
      if (error) throw error;
      
      setActiveEmergencyAlert(data.id);
      setEmergencySeconds(0);
      setEmergencyAcknowledged(false);
    } catch (e) {
      console.error('Failed to trigger emergency', e);
      setActiveEmergencyAlert('demo-emergency-active');
      setEmergencySeconds(0);
      setEmergencyAcknowledged(false);
    }
  };

  const cancelEmergency = async () => {
    try {
      if (activeEmergencyAlert && activeEmergencyAlert !== 'demo-emergency-active') {
        await supabase.from('alerts').update({ is_read: true }).eq('id', activeEmergencyAlert);
      }
      
      if (profile?.id) {
        await supabase
          .from('alerts')
          .update({ is_read: true })
          .eq('patient_id', profile.id)
          .eq('alert_type', 'emergency')
          .eq('is_read', false);
      }
    } catch (e) {
      console.error('Failed to cancel emergency in DB', e);
    }
    
    // Play cancel sound
    try {
      const audio = new Audio('/sounds/cancel_chime.mp3'); // or any sound
      audio.play().catch(e => console.log('Audio error', e));
    } catch (e) {}

    setActiveEmergencyAlert(null);
    setEmergencySeconds(0);
    setEmergencyAcknowledged(false);
  }

  const triggerWanderingAlert = async () => {
    if (!profile?.id) return;
    
    // Need to find a linked caregiver to send the alert to
    const { data: link } = await supabase
      .from('caregiver_patient_links')
      .select('caregiver_id')
      .eq('patient_id', profile.id)
      .limit(1)
      .single();
      
    if (link?.caregiver_id) {
      await supabase.from('alerts').insert({
        caregiver_id: link.caregiver_id,
        patient_id: profile.id,
        alert_type: 'wandering',
        message: `${profile.full_name || 'Patient'} has left the safe zone!`,
        severity: 'critical'
      });
      alert('Wandering alert triggered successfully! Check Caregiver Dashboard.');
    } else {
      alert('No caregiver linked to trigger alert.');
    }
  };

  const formattedDate = currentTime.toLocaleDateString(
    language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : language === 'gu' ? 'gu-IN' : language === 'bn' ? 'bn-IN' : language === 'ta' ? 'ta-IN' : language === 'te' ? 'te-IN' : 'en-US', 
    { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }
  )
  const firstName = profile?.full_name?.split(' ')[0] || t('Friend', language)

  const [isSavingMood, setIsSavingMood] = useState(false);

  const handleMoodClick = async (moodLabel: string, englishMood: string) => {
    // 1. Speak (Text-to-Speech)
    if ('speechSynthesis' in window) {
      const isPositive = englishMood === 'Great' || englishMood === 'Good';
      const msg = new SpeechSynthesisUtterance();
      
      if (language === 'hi') {
        msg.text = isPositive ? "बढ़िया, आपका दिन शुभ हो!" : "चिंता मत कीजिए, सब ठीक हो जायेगा। हम आपके साथ हैं।";
        msg.lang = 'hi-IN';
      } else {
        msg.text = isPositive ? "That's great, have a wonderful day!" : "Don't worry, things will get better. We are here for you.";
        msg.lang = 'en-US';
      }
      
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(msg);
    }

    // 2. Save to Database
    if (profile?.id && !isSavingMood) {
      setIsSavingMood(true);
      try {
        const { error } = await supabase.from('mood_history').insert({
          user_id: profile.id,
          mood: englishMood
        });
        if (error) throw error;
      } catch (e) {
        console.error('Failed to save mood', e);
      } finally {
        setIsSavingMood(false);
      }
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-[#5A4B81] dark:text-primary-foreground" size={48} /></div>
  }

  return (
    <>
      <main className="flex-1 px-4 md:px-8 max-w-5xl mx-auto w-full flex flex-col gap-6 mt-4">
        
        {/* Hero Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200">{t('Good Morning,', language)}</h2>
            <h1 className="text-5xl font-extrabold text-[#5A4B81] dark:text-white mt-1 mb-3">{firstName} Ji <span className="text-yellow-400">♡</span></h1>
            <p className="text-gray-500 dark:text-gray-400 text-lg max-w-sm">{t("We're here to support you every step of the way.", language)}</p>
          </div>
          
          <div className="relative w-full md:w-auto flex justify-center mt-4 md:mt-0">
            <div className="w-[300px] h-[200px] rounded-[2rem] overflow-hidden shadow-md bg-gray-200 dark:bg-gray-800 border border-transparent dark:border-border">
               <img src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firstName}`} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        {/* Date and Weather Banner */}
        <div className="bg-[#FCF9EE] dark:bg-card rounded-3xl p-5 flex items-center justify-between mt-8 shadow-sm dark:border dark:border-border">
          <div className="flex items-center gap-4">
            <div className="bg-white dark:bg-white/10 p-3 rounded-xl shadow-sm text-[#5A4B81] dark:text-white"><Calendar size={24} /></div>
            <div>
              <p className="font-bold text-gray-800 dark:text-white">{formattedDate}</p>
            </div>
          </div>
          <div className="h-10 w-px bg-gray-200 dark:bg-gray-700 hidden md:block"></div>
          <div className="flex items-center gap-4">
            <div className="text-yellow-500"><Sun size={32} className="fill-yellow-400" /></div>
            <div>
              <p className="font-bold text-gray-800 dark:text-white">{t('Have a wonderful day!', language)}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 hidden md:block">{t("Let's make it a great one.", language)}</p>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
          {/* Brain Games */}
          <Link to="/patient/games" className="bg-[#EFE8FA] dark:bg-[#2E1A47] rounded-3xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer dark:border dark:border-white/10">
            <div className="absolute -right-4 -top-4 opacity-10 dark:opacity-20"><Brain size={120} /></div>
            <div>
               <div className="w-12 h-12 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center text-[#7C3AED] dark:text-[#A855F7] mb-4 shadow-sm"><Brain size={24} /></div>
               <h3 className="font-bold text-gray-800 dark:text-[#FFFFFF] text-lg">{t('Brain Games', language)}</h3>
               <p className="text-xs text-gray-600 dark:text-[#E9D5FF] mt-1 max-w-[120px]">{t('Fun games to keep your mind active', language)}</p>
            </div>
            <div className="mt-4 flex justify-end"><div className="w-6 h-6 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-[#7C3AED] dark:text-[#A855F7] shadow-sm font-bold">&gt;</div></div>
          </Link>

          {/* My Family */}
          <Link to="/patient/my-family" className="bg-[#FDE2E4] dark:bg-[#422006] rounded-3xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer dark:border dark:border-white/10">
            <div className="absolute -right-4 -top-4 opacity-10 dark:opacity-20"><User size={120} /></div>
            <div>
               <div className="w-12 h-12 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center text-[#E11D48] dark:text-[#FB923C] mb-4 shadow-sm"><User size={24} /></div>
               <h3 className="font-bold text-gray-800 dark:text-[#FFFFFF] text-lg">{t('My Family', language)}</h3>
               <p className="text-xs text-gray-600 dark:text-[#FED7AA] mt-1 max-w-[120px]">{t('Photos, names and precious memories', language)}</p>
            </div>
            <div className="mt-4 flex justify-end"><div className="w-6 h-6 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-[#E11D48] dark:text-[#FB923C] shadow-sm font-bold">&gt;</div></div>
          </Link>

          {/* Face Scanner */}
          <Link to="/patient/face-scanner" className="bg-[#ECFCCB] dark:bg-[#3F6212] rounded-3xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer dark:border dark:border-white/10">
            <div className="absolute -right-4 -top-4 opacity-10 dark:opacity-20"><Camera size={120} /></div>
            <div>
               <div className="w-12 h-12 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center text-[#65A30D] dark:text-[#A3E635] mb-4 shadow-sm"><Camera size={24} /></div>
               <h3 className="font-bold text-gray-800 dark:text-[#FFFFFF] text-lg">{t('Who is This?', language)}</h3>
               <p className="text-xs text-gray-600 dark:text-[#D9F99D] mt-1 max-w-[120px]">{t('Point camera to recognize people', language)}</p>
            </div>
            <div className="mt-4 flex justify-end"><div className="w-6 h-6 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-[#65A30D] dark:text-[#A3E635] shadow-sm font-bold">&gt;</div></div>
          </Link>

          {/* Today's Plan */}
          <Link to="/patient/reminders" className="bg-[#E0F2FE] dark:bg-[#1E3A5F] rounded-3xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer dark:border dark:border-white/10">
            <div className="absolute -right-4 -top-4 opacity-10 dark:opacity-20"><CalendarCheck size={120} /></div>
            <div>
               <div className="w-12 h-12 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center text-[#0284C7] dark:text-[#38BDF8] mb-4 shadow-sm"><CalendarCheck size={24} /></div>
               <h3 className="font-bold text-gray-800 dark:text-[#FFFFFF] text-lg">{t("Today's Plan", language)}</h3>
               <p className="text-xs text-gray-600 dark:text-[#BAE6FD] mt-1 max-w-[120px]">{t('See your routine and daily activities', language)}</p>
            </div>
            <div className="mt-4 flex justify-end"><div className="w-6 h-6 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-[#0284C7] dark:text-[#38BDF8] shadow-sm font-bold">&gt;</div></div>
          </Link>



          {/* Reminiscence */}
          <div 
            onClick={() => navigate('/patient/reminiscence')}
            className="bg-[#FEF9C3] dark:bg-[#3F2E1E] rounded-3xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer dark:border dark:border-white/10"
          >
            <div className="absolute -right-4 -top-4 opacity-10 dark:opacity-20"><Music size={120} /></div>
            <div>
               <div className="w-12 h-12 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center text-[#CA8A04] dark:text-[#FBBF24] mb-4 shadow-sm"><Music size={24} /></div>
               <h3 className="font-bold text-gray-800 dark:text-[#FFFFFF] text-lg">{t('Reminiscence', language)}</h3>
               <p className="text-xs text-gray-600 dark:text-[#FDE68A] mt-1 max-w-[120px]">{t('Music, stories and memories from past', language)}</p>
            </div>
            <div className="mt-4 flex justify-end"><div className="w-6 h-6 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-[#CA8A04] dark:text-[#FBBF24] shadow-sm font-bold">&gt;</div></div>
          </div>

          {/* Memory Journal */}
          <Link to="/patient/journal" className="bg-[#E0E7FF] dark:bg-[#1E1B4B] rounded-3xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer dark:border dark:border-white/10">
            <div className="absolute -right-4 -top-4 opacity-10 dark:opacity-20"><BookOpen size={120} /></div>
            <div>
               <div className="w-12 h-12 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center text-[#4F46E5] dark:text-[#818CF8] mb-4 shadow-sm"><BookOpen size={24} /></div>
               <h3 className="font-bold text-gray-800 dark:text-[#FFFFFF] text-lg">{t('Memory Journal', language)}</h3>
               <p className="text-xs text-gray-600 dark:text-[#C7D2FE] mt-1 max-w-[120px]">{t('Record your daily thoughts and feelings', language)}</p>
            </div>
            <div className="mt-4 flex justify-end"><div className="w-6 h-6 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-[#4F46E5] dark:text-[#818CF8] shadow-sm font-bold">&gt;</div></div>
          </Link>

          {/* Emergency */}
          <div 
            onClick={triggerEmergency}
            className="bg-[#FFE4E6] dark:bg-[#7F1D1D] rounded-3xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden border border-red-100 dark:border-white/10 group hover:scale-[1.02] transition-transform cursor-pointer"
          >
            <div className="absolute -right-4 -top-4 opacity-10 dark:opacity-20"><ShieldAlert size={120} /></div>
            <div>
               <div className="w-12 h-12 bg-[#F43F5E] dark:bg-[#EF4444] rounded-2xl flex items-center justify-center text-white mb-4 shadow-sm font-bold">SOS</div>
               <h3 className="font-bold text-gray-800 dark:text-[#FFFFFF] text-lg">{t('Emergency', language)}</h3>
               <p className="text-xs text-gray-600 dark:text-[#FECACA] mt-1 max-w-[120px]">{t('One tap for help whenever needed', language)}</p>
            </div>
            <div className="mt-4 flex justify-end"><div className="w-6 h-6 rounded-full bg-white dark:bg-white/10 flex items-center justify-center text-[#F43F5E] dark:text-[#EF4444] shadow-sm font-bold">&gt;</div></div>
          </div>
        </div>

        {/* Bottom Widgets Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
           {/* Daily Progress */}
           <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/10">
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-800 dark:text-[#F8FAFC]">{t('Daily Progress', language)}</h3>
                <span onClick={() => setShowTasksModal(true)} className="text-xs font-semibold text-[#5A4B81] dark:text-purple-400 cursor-pointer hover:underline transition-colors">{t('See all', language)}</span>
             </div>
             <div className="flex justify-between px-2">
                <div className={`flex flex-col items-center ${completedTaskIds.length > 0 && dailyTasks.filter(t => t.type === 'medicine').every(t => completedTaskIds.includes(t.id)) ? '' : 'opacity-50'}`}>
                   <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-[#10B981] rounded-full flex items-center justify-center mb-2 border-2 border-transparent dark:border-[#10B981]/50"><CheckCircle2 size={24} /></div>
                   <span className="text-xs font-medium text-gray-600 dark:text-[#94A3B8] text-center leading-tight">Medicine<br/>Taken</span>
                </div>
                <div className={`flex flex-col items-center opacity-50`}>
                   <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-[#F59E0B] rounded-full flex items-center justify-center mb-2 border-2 border-transparent dark:border-[#F59E0B]/50"><CalendarCheck size={24} /></div>
                   <span className="text-xs font-medium text-gray-600 dark:text-[#94A3B8] text-center leading-tight">Meals<br/>--</span>
                </div>
                <div onClick={() => setShowTasksModal(true)} className={`flex flex-col items-center cursor-pointer transition-transform hover:scale-105 ${completedTaskIds.length >= dailyTasks.length && dailyTasks.length > 0 ? '' : 'opacity-50'}`}>
                   <div className={`w-12 h-12 ${completedTaskIds.length >= dailyTasks.length && dailyTasks.length > 0 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-[#94A3B8]'} rounded-full flex items-center justify-center mb-2`}><User size={24} /></div>
                   <span className="text-xs font-medium text-gray-600 dark:text-[#94A3B8] text-center leading-tight">Activity<br/>{completedTaskIds.length}/{dailyTasks.length}</span>
                </div>
                <div className={`flex flex-col items-center ${todayGameMinutes >= 15 ? '' : 'opacity-50'}`}>
                   <div className={`w-12 h-12 ${todayGameMinutes >= 15 ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-[#94A3B8]'} rounded-full flex items-center justify-center mb-2`}><Brain size={24} /></div>
                   <span className="text-xs font-medium text-gray-600 dark:text-[#94A3B8] text-center leading-tight">Games<br/>{todayGameMinutes} min</span>
                </div>
             </div>
           </div>

           {/* Tasks Modal */}
           {showTasksModal && (
             <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
               <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md p-6 relative">
                 <button onClick={() => setShowTasksModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-white">
                   <X size={24} />
                 </button>
                 <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">{t("Today's Tasks", language)}</h2>
                 
                 <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                   {dailyTasks.length === 0 ? (
                     <p className="text-gray-500 text-center py-4">{t("No tasks scheduled for today.", language)}</p>
                   ) : (
                     dailyTasks.map(task => {
                       const isDone = completedTaskIds.includes(task.id);
                       return (
                         <div 
                           key={task.id} 
                           onClick={() => handleToggleTask(task.id)}
                           className={`p-4 rounded-2xl flex items-center justify-between cursor-pointer border-2 transition-colors ${isDone ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-gray-50 border-gray-100 dark:bg-gray-800 dark:border-gray-700'}`}
                         >
                           <div className="flex items-center gap-3">
                             <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isDone ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-500'}`}>
                               {isDone && <CheckCircle2 size={16} />}
                             </div>
                             <div>
                               <p className={`font-semibold ${isDone ? 'text-green-800 dark:text-green-300 line-through' : 'text-gray-800 dark:text-gray-200'}`}>{task.title}</p>
                               <p className="text-xs text-gray-500 dark:text-gray-400">{task.time}</p>
                             </div>
                           </div>
                           <div className="text-gray-400 dark:text-gray-500">
                             {task.type === 'medicine' ? <Pill size={20} /> : <BookOpen size={20} />}
                           </div>
                         </div>
                       )
                     })
                   )}
                 </div>
                 
                 <button onClick={() => setShowTasksModal(false)} className="w-full mt-6 bg-[#5A4B81] hover:bg-[#4a3d6a] text-white py-3 rounded-2xl font-bold transition-colors">
                   {t("Done", language)}
                 </button>
               </div>
             </div>
           )}

           {/* How are you feeling? */}
           <div className="bg-white dark:bg-[#1E293B] rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-white/10">
             <div className="mb-4">
                <h3 className="font-bold text-gray-800 dark:text-[#F8FAFC]">{t('How are you feeling?', language)}</h3>
                <p className="text-xs text-gray-500 dark:text-[#94A3B8] mt-1">{t('Let us know how you feel today.', language)}</p>
             </div>
             <div className="flex justify-between gap-2 px-2 overflow-x-auto hide-scrollbar">
                {[
                  { label: t('Great', language), englishMood: 'Great', emoji: '😄', color: 'bg-[#DCFCE7] text-[#16A34A] dark:bg-green-900/50 dark:text-green-400' },
                  { label: t('Good', language), englishMood: 'Good', emoji: '🙂', color: 'bg-[#FEF9C3] text-[#CA8A04] dark:bg-yellow-900/50 dark:text-yellow-400' },
                  { label: t('Okay', language), englishMood: 'Okay', emoji: '😐', color: 'bg-[#E0F2FE] text-[#0284C7] dark:bg-blue-900/50 dark:text-blue-400' },
                  { label: t('Tired', language), englishMood: 'Tired', emoji: '🥱', color: 'bg-[#F3E8FF] text-[#9333EA] dark:bg-purple-900/50 dark:text-purple-400' },
                  { label: t('Worried', language), englishMood: 'Worried', emoji: '😟', color: 'bg-[#FFE4E6] text-[#E11D48] dark:bg-rose-900/50 dark:text-rose-400' }
                ].map((mood, idx) => (
                  <button 
                    key={idx} 
                    onClick={() => handleMoodClick(mood.label, mood.englishMood)}
                    disabled={isSavingMood}
                    className="flex flex-col items-center min-w-[50px] group transition-transform active:scale-95 disabled:opacity-50"
                  >
                     <div className={`w-12 h-12 ${mood.color} rounded-full flex items-center justify-center text-xl mb-2 shadow-sm border-2 border-transparent group-hover:border-current`}>
                       {mood.emoji}
                     </div>
                     <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{mood.label}</span>
                  </button>
                ))}
             </div>
           </div>
        </div>

        {/* Bottom Contact Banner */}
        <div className="bg-[#E0E7FF] dark:bg-indigo-900/40 rounded-3xl p-5 flex items-center justify-between shadow-sm mt-4 mb-8 dark:border dark:border-indigo-800/50">
           <div>
              <h3 className="font-bold text-[#3730A3] dark:text-indigo-300 text-lg">{t('Stay connected with your loved ones', language)}</h3>
              <p className="text-sm text-[#4F46E5] dark:text-indigo-400 mt-1">{t('Call your family or send a message.', language)}</p>
           </div>
           {familyCallNumber ? (
             <a href={`tel:${familyCallNumber}`} className="bg-[#4F46E5] dark:bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-md flex items-center gap-2 hover:bg-[#4338CA] dark:hover:bg-indigo-500 transition-colors">
                <Phone size={18} className="fill-white" /> {familyCallName ? `Call ${familyCallName}` : t('Call Family', language)}
             </a>
           ) : (
             <button 
                onClick={() => navigate('/patient/settings')}
                className="bg-[#4F46E5] dark:bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-md flex items-center gap-2 hover:bg-[#4338CA] dark:hover:bg-indigo-500 transition-colors"
             >
                <Phone size={18} className="fill-white" /> {t('Call Family', language)}
             </button>
           )}
        </div>
        
        {/* Test Tools (Visible for demo/development) */}
        <div className="flex justify-center mb-8">
          <button 
            onClick={triggerWanderingAlert}
            className="text-xs text-gray-400 hover:text-red-500 underline transition-colors"
          >
            Simulate Wandering Alert (Test geofencing)
          </button>
        </div>

      </main>

      {/* Emergency Active Modal */}
      {activeEmergencyAlert && (
        <div className="fixed inset-0 bg-red-600/95 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-card rounded-3xl p-8 w-full max-w-md shadow-2xl text-center flex flex-col items-center">
            {emergencyAcknowledged ? (
              <>
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="text-3xl font-black text-green-600 mb-4">{t('Acknowledged', language)}</h2>
                <p className="text-xl font-bold text-gray-800 dark:text-gray-200">{t('Caregiver has been notified and is responding.', language)}</p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 border-4 border-red-500 rounded-full animate-ping opacity-20"></div>
                  <ShieldAlert size={48} className="text-red-600" />
                </div>
                <h2 className="text-3xl font-black text-red-600 mb-2">{t('SOS Active', language)}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6 font-medium">{t('Alert sent to your caregiver', language)}</p>
                
                <div className="text-5xl font-mono font-black text-[#5A4B81] dark:text-primary-foreground mb-10">
                  {formatTimer(emergencySeconds)}
                </div>

                <button 
                  onClick={cancelEmergency}
                  className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-4 px-8 rounded-full font-bold flex items-center gap-2 transition-colors"
                >
                  <X size={20} /> {t('Cancel Alert', language)}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
