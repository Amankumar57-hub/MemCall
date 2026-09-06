import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { playPremiumVoice } from '../lib/tts';

export default function AlarmManager({ session }: { session: any }) {
  const { language } = useAppStore();
  const [reminders, setReminders] = useState<any[]>([]);
  const lastTriggeredRef = useRef<{ [key: string]: string }>({});

  useEffect(() => {
    if (!session?.user) return;

    // Load active reminders for the current user
    const loadReminders = async () => {
      const { data } = await supabase
        .from('reminders')
        .select('*')
        .eq('patient_id', session.user.id)
        .eq('is_active', true);
      
      if (data) setReminders(data);
    };

    loadReminders();

    // Subscribe to changes so alarms are always up-to-date
    const channel = supabase
      .channel(`alarms:patient_id=${session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reminders', filter: `patient_id=eq.${session.user.id}` },
        loadReminders
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const [activeAlarm, setActiveAlarm] = useState<any | null>(null);
  const [alarmText, setAlarmText] = useState('');
  const stopSignalRef = useRef(false);
  const alarmTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (reminders.length === 0) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeString = `${currentHours}:${currentMinutes}`;
      const todayDateString = now.toDateString(); // To prevent firing multiple times in same minute

      reminders.forEach(reminder => {
        // If time matches and hasn't been triggered this exact minute today
        const triggerKey = `${reminder.id}-${todayDateString}-${currentTimeString}`;
        
        if (reminder.time.startsWith(currentTimeString) && lastTriggeredRef.current[reminder.id] !== triggerKey) {
          lastTriggeredRef.current[reminder.id] = triggerKey;
          triggerAlarm(reminder);
        }
      });
    }, 10000); // check every 10 seconds

    return () => clearInterval(interval);
  }, [reminders, language]);

  const loopVoice = async (text: string) => {
    while (!stopSignalRef.current) {
      await playPremiumVoice(text, language);
      // Wait a second between loops, check stop signal
      if (stopSignalRef.current) break;
      await new Promise(res => setTimeout(res, 2000));
    }
  };

  const triggerAlarm = (reminder: any) => {
    const title = reminder.title.toLowerCase();
    
    let textToSpeak = '';
    
    if (language === 'hi') {
      if (title.includes('water') || title.includes('pani')) {
        textToSpeak = "aapke paani peene ka samay ho gaya hai, kripya paani pee lijiye.";
      } else if (title.includes('medicine') || title.includes('dawa')) {
        textToSpeak = `aapki ${reminder.title} dawa lene ka samay ho gaya hai, kripya dawa le lijiye.`;
      } else {
        textToSpeak = `aapka reminder hai: ${reminder.title}. kripya dhyaan dein.`;
      }
    } else if (language === 'mr') {
      if (title.includes('water') || title.includes('pani')) {
        textToSpeak = "tumchi pani pinyachi vel zali aahe, krupaya pani pyun ghya.";
      } else if (title.includes('medicine') || title.includes('dawa')) {
        textToSpeak = `tumchi ${reminder.title} aushadh ghenyachi vel zali aahe, krupaya aushadh ghya.`;
      } else {
        textToSpeak = `tumchi reminder aahe: ${reminder.title}. krupaya laksha dya.`;
      }
    } else {
      if (title.includes('water')) {
        textToSpeak = "It is time to drink water, please have some water.";
      } else if (title.includes('medicine') || title.includes('pill')) {
        textToSpeak = `It is time to take your medicine: ${reminder.title}. Please take it now.`;
      } else {
        textToSpeak = `You have a reminder for: ${reminder.title}.`;
      }
    }

    setAlarmText(textToSpeak);
    setActiveAlarm(reminder);
    stopSignalRef.current = false;
    
    loopVoice(textToSpeak);

    // Force stop after 30 seconds
    if (alarmTimeoutRef.current) clearTimeout(alarmTimeoutRef.current);
    alarmTimeoutRef.current = setTimeout(() => {
      handleStop();
    }, 30000);
    
    // Create an alert or notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('MemCall Reminder', { body: textToSpeak });
    }
  };

  const handleStop = () => {
    stopSignalRef.current = true;
    setActiveAlarm(null);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  if (!activeAlarm) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-white p-8 rounded-[2rem] w-full max-w-md text-center shadow-2xl relative overflow-hidden">
        {/* Pulsing background circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-green-100 rounded-full animate-ping opacity-50 pointer-events-none"></div>
        
        <div className="relative z-10">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">⏰</span>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Reminder</h2>
          <p className="text-xl font-medium text-primary-hover mb-8">{activeAlarm.title}</p>
          
          <div className="space-y-4">
            <button 
              onClick={handleStop}
              className="w-full bg-primary-hover text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-primary-hover active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="text-2xl">✅</span> Done
            </button>
            <button 
              onClick={handleStop}
              className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold text-lg hover:bg-gray-200 active:scale-95 transition-all"
            >
              Stop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
