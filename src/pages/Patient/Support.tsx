import { Link } from 'react-router-dom'
import { ArrowLeft, Phone, Mail, MessageCircle } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { t } from '../../lib/i18n'
import { playClickSound } from '../../lib/audio'

export default function Support() {
  const { language } = useAppStore()

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans pb-24">
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-100 dark:border-border bg-white dark:bg-card sticky top-0 z-10 transition-colors">
        <div className="flex items-center gap-4">
          <Link to="/patient/profile" onClick={() => playClickSound()} className="text-gray-500 dark:text-gray-300 hover:text-primary transition-colors p-2 -ml-2 rounded-full hover:bg-gray-50">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold text-primary">{t('Help & Support', language)}</h1>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-2xl mx-auto w-full space-y-4">
        
        <a href="tel:18001234567" onClick={() => playClickSound()} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors block">
          <div className="bg-blue-50 p-4 rounded-full text-blue-600"><Phone size={24} /></div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Call Us</h3>
            <p className="text-sm text-gray-500">1800-123-4567</p>
          </div>
        </a>

        <a href="mailto:support@memcall.com" onClick={() => playClickSound()} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors block">
          <div className="bg-orange-50 p-4 rounded-full text-orange-600"><Mail size={24} /></div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Email Us</h3>
            <p className="text-sm text-gray-500">support@memcall.com</p>
          </div>
        </a>

        <div onClick={() => { playClickSound(); alert(t('Live chat agents are currently offline. Please leave a message or email us.', language)) }} className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="bg-green-50 p-4 rounded-full text-green-600"><MessageCircle size={24} /></div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Live Chat</h3>
            <p className="text-sm text-gray-500">Available 9 AM - 6 PM</p>
          </div>
        </div>

      </main>
    </div>
  )
}
