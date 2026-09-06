import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Check, Lock } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { t } from '../../lib/i18n'
import { playClickSound } from '../../lib/audio'
import { supabase } from '../../lib/supabase'

export default function Privacy() {
  const { language } = useAppStore()
  const navigate = useNavigate()

  const handleDeleteAccount = async () => {
    playClickSound()
    if (window.confirm(t('Are you sure you want to delete your account? This action cannot be undone.', language))) {
      await supabase.auth.signOut()
      navigate('/login')
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans pb-24">
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-100 dark:border-border bg-white dark:bg-card sticky top-0 z-10 transition-colors">
        <div className="flex items-center gap-4">
          <Link to="/patient/profile" onClick={() => playClickSound()} className="text-gray-500 dark:text-gray-300 hover:text-primary transition-colors p-2 -ml-2 rounded-full hover:bg-gray-50">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold text-primary dark:text-primary-foreground">{t('Privacy & Security', language)}</h1>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-2xl mx-auto w-full">
        <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm mb-6 text-center">
          <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Your Data is Secure</h2>
          <p className="text-gray-500 text-sm">We use enterprise-grade encryption to protect your health data.</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm mb-6 space-y-4">
          <h3 className="font-bold text-gray-800 text-lg mb-2">Data Sharing</h3>
          
          <div className="flex items-start gap-3">
            <div className="mt-1 text-green-600"><Check size={18} /></div>
            <div>
              <p className="font-bold text-gray-800">Caregiver Access</p>
              <p className="text-sm text-gray-500">Only your linked caregiver can view your cognitive scores and activity.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="mt-1 text-green-600"><Lock size={18} /></div>
            <div>
              <p className="font-bold text-gray-800">Strictly Confidential</p>
              <p className="text-sm text-gray-500">We never sell your personal data to third parties.</p>
            </div>
          </div>
        </div>
        
        <button onClick={handleDeleteAccount} className="w-full bg-red-50 text-red-600 font-bold rounded-xl py-4 border border-red-100 hover:bg-red-100 transition-colors">
          Delete Account
        </button>
      </main>
    </div>
  )
}
