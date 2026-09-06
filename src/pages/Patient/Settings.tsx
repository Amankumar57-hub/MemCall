import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Bell, Volume2, Moon } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { t } from '../../lib/i18n'
import { playClickSound } from '../../lib/audio'
import { supabase } from '../../lib/supabase'

export default function Settings() {
  const { 
    language, 
    notifications, setNotifications, 
    sound, setSound, 
    highContrast, setHighContrast, 
    theme, setTheme,
    colorTheme, setColorTheme,
    familyCallNumber, setFamilyCallNumber,
    familyCallName, setFamilyCallName
  } = useAppStore()

  const [localFamilyName, setLocalFamilyName] = useState(familyCallName || '')
  const [localFamilyNumber, setLocalFamilyNumber] = useState(familyCallNumber || '')
  const [saveMessage, setSaveMessage] = useState('')

  const [switching, setSwitching] = useState(false)
  const [switchError, setSwitchError] = useState<string | null>(null)

  const toggleSound = () => {
    setSound(!sound)
    if (!sound) { // it will be true
      playClickSound()
    }
  }

  const toggleDarkMode = () => {
    setHighContrast(!highContrast)
    setTheme(highContrast ? 'light' : 'dark')
    playClickSound()
  }

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans pb-24">
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-100 dark:border-border bg-white dark:bg-card sticky top-0 z-10 transition-colors">
        <div className="flex items-center gap-4">
          <Link to="/patient/profile" onClick={() => playClickSound()} className="text-gray-500 dark:text-gray-300 hover:text-primary transition-colors p-2 rounded-full hover:bg-gray-50 dark:hover:bg-primary/20 -ml-2">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold text-primary dark:text-white">{t('App Settings', language)}</h1>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-2xl mx-auto w-full">
        <div className="bg-white dark:bg-card border border-gray-100 dark:border-border rounded-3xl p-6 shadow-sm mb-6">
          <div className="space-y-6">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-full text-blue-600 dark:text-blue-400"><Bell size={24} /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Notifications</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive game reminders and updates</p>
                </div>
              </div>
              <button 
                onClick={() => { setNotifications(!notifications); playClickSound() }}
                className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors ${notifications ? 'bg-primary' : 'bg-gray-300'}`}
              >
                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${notifications ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <hr className="border-gray-100 dark:border-border" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-full text-green-600 dark:text-green-400"><Volume2 size={24} /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Sound Effects</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Play sounds during games</p>
                </div>
              </div>
              <button 
                onClick={toggleSound}
                className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors ${sound ? 'bg-primary' : 'bg-gray-300'}`}
              >
                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${sound ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <hr className="border-gray-100 dark:border-border" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded-full text-purple-600 dark:text-purple-400"><Moon size={24} /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Dark Mode</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Easier on the eyes in low light</p>
                </div>
              </div>
              <button 
                onClick={toggleDarkMode}
                className={`w-14 h-8 flex items-center rounded-full p-1 transition-colors ${highContrast ? 'bg-primary' : 'bg-gray-300'}`}
              >
                <div className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-transform ${highContrast ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <hr className="border-gray-100 dark:border-border" />


            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">Emergency Contact</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Name and number to dial when 'Call Family' is tapped</p>
              </div>
              <div className="flex flex-col gap-3">
                <input 
                  type="text"
                  placeholder="Name (e.g. Son, Daughter, John)"
                  value={localFamilyName}
                  onChange={(e) => setLocalFamilyName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-card border border-gray-200 dark:border-border text-gray-800 dark:text-gray-100 font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input 
                  type="tel"
                  placeholder="Phone Number (e.g. +91 9876543210)"
                  value={localFamilyNumber}
                  onChange={(e) => setLocalFamilyNumber(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-card border border-gray-200 dark:border-border text-gray-800 dark:text-gray-100 font-bold rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex items-center gap-4 mt-2">
                  <button 
                    onClick={() => {
                      setFamilyCallName(localFamilyName);
                      setFamilyCallNumber(localFamilyNumber);
                      setSaveMessage('Saved Successfully!');
                      setTimeout(() => setSaveMessage(''), 3000);
                      playClickSound();
                    }}
                    className="bg-primary hover:bg-primary-hover text-white font-bold py-2 px-6 rounded-xl transition-colors shadow-sm"
                  >
                    Save
                  </button>
                  {saveMessage && <span className="text-green-600 font-medium text-sm">{saveMessage}</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-8 border-t border-gray-100 pt-6">
              {switchError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium text-center">
                  {switchError}
                </div>
              )}
              <button 
                disabled={switching}
                onClick={async () => {
                  setSwitchError(null);
                  setSwitching(true);
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;
                    const { error } = await supabase.from('users').update({ role: 'caregiver' }).eq('id', user.id);
                    if (error) throw error;
                    window.location.href = '/caregiver';
                  } catch (err: any) {
                    console.error(err);
                    setSwitchError(`Error: ${err.message || 'Failed to switch role.'}`);
                  } finally {
                    setSwitching(false);
                  }
                }}
                className="text-gray-500 hover:text-primary font-bold text-sm underline text-center transition-colors disabled:opacity-50">
                {switching ? "Switching..." : "Switch to Caregiver Account"}
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}
