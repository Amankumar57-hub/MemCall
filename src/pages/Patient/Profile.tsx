import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bell, User, ArrowLeft, Settings, LayoutGrid, CheckCircle2, Shield, Phone, Copy, Globe } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'
import { t } from '../../lib/i18n'

export default function PatientProfile() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('Patient')
  const [copied, setCopied] = useState(false)
  
  const { language, setLanguage } = useAppStore()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('users').select('id, full_name').eq('auth_id', user.id).single().then(({ data }) => {
          if (data) {
            setUserId(data.id)
            setUserName(data.full_name)
          }
        })
      }
    })
  }, [])

  const copyId = () => {
    if (userId) {
      navigator.clipboard.writeText(userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
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
            <Link to="/patient/reminders" className="hover:text-[#144533] transition-colors pb-1">{t('Reminders', language)}</Link>
            <Link to="/patient/profile" className="text-[#144533] border-b-2 border-[#144533] pb-1">{t('Profile', language)}</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-2xl mx-auto w-full">
        <Link to="/patient" className="inline-flex items-center gap-2 text-[#144533] font-medium mb-6 hover:underline">
          <ArrowLeft size={20} /> {t('Back to Home', language)}
        </Link>
        
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm text-center mb-8 relative">
          <div className="w-24 h-24 bg-[#E1F4EA] rounded-full mx-auto mb-4 overflow-hidden border-4 border-white shadow-lg flex items-center justify-center">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} alt="Profile Avatar" className="w-full h-full object-cover" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">{userName}</h2>
          <p className="text-gray-500 font-medium mt-1">{t('Patient Account', language)}</p>
          
          {userId && (
            <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-4 flex flex-col items-center">
              <p className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">{t('Share Link Code with Caregiver', language)}</p>
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 w-full max-w-sm">
                <span className="font-mono text-gray-500 text-xs truncate flex-1">{userId}</span>
                <button 
                  onClick={copyId}
                  className="text-[#144533] hover:bg-[#E1F4EA] p-2 rounded-lg transition-colors flex items-center gap-1"
                  title="Copy ID"
                >
                  {copied ? <CheckCircle2 size={18} className="text-green-600" /> : <Copy size={18} />}
                  <span className="text-sm font-bold">{copied ? t('Copied!', language) : t('Copy', language)}</span>
                </button>
              </div>
            </div>
          )}
          
          <div className="flex justify-center gap-4 mt-6">
            <button 
              onClick={() => supabase.auth.signOut()}
              className="bg-red-100 text-red-600 px-6 py-2 rounded-full font-bold shadow-sm hover:bg-red-200 active:scale-95 transition-all w-full max-w-xs">
              {t('Sign Out', language)}
            </button>
          </div>
        </div>
        
        <div className="space-y-4">
          {/* Language Selector */}
          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="bg-purple-50 p-3 rounded-full text-purple-600"><Globe size={24} /></div>
              <span className="text-lg font-bold text-gray-800">{t('Language', language)}</span>
            </div>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-800 font-bold rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#144533]"
            >
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="mr">मराठी</option>
              <option value="gu">ગુજરાતી</option>
              <option value="bn">বাংলা</option>
              <option value="ta">தமிழ்</option>
              <option value="te">తెలుగు</option>
            </select>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="bg-gray-100 p-3 rounded-full text-gray-600"><Settings size={24} /></div>
              <span className="text-lg font-bold text-gray-800">{t('App Settings', language)}</span>
            </div>
            <ArrowLeft size={20} className="text-gray-400 rotate-180" />
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="bg-green-50 p-3 rounded-full text-green-600"><Shield size={24} /></div>
              <span className="text-lg font-bold text-gray-800">{t('Privacy & Security', language)}</span>
            </div>
            <ArrowLeft size={20} className="text-gray-400 rotate-180" />
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="bg-blue-50 p-3 rounded-full text-blue-600"><Phone size={24} /></div>
              <span className="text-lg font-bold text-gray-800">{t('Help & Support', language)}</span>
            </div>
            <ArrowLeft size={20} className="text-gray-400 rotate-180" />
          </div>
        </div>
      </main>

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
        <Link to="/patient/reminders" className="flex flex-col items-center text-gray-400">
          <div className="p-1"><Bell size={24} /></div>
          <span className="text-xs font-medium mt-1">{t('Alerts', language)}</span>
        </Link>
        <Link to="/patient/profile" className="flex flex-col items-center text-[#1B4D3E]">
          <div className="p-1"><User size={24} /></div>
          <span className="text-xs font-bold mt-1">{t('Profile', language)}</span>
        </Link>
      </nav>
    </div>
  )
}
