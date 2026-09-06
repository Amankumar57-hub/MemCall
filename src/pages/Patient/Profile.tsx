import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Settings, Shield, Phone, Copy, Globe, Camera, Loader2, CheckCircle2, Pencil, Check, X, ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'
import { t } from '../../lib/i18n'
import { playClickSound } from '../../lib/audio'

function StatsValue({ table, column, max = false }: { table: string, column: string, max?: boolean }) {
  const [val, setVal] = useState<number>(0)
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        if (max) {
          const localMax = localStorage.getItem(`max_level_${user.id}`)
          if (localMax) {
            setVal(parseInt(localMax, 10))
          }
        } else {
          const startOfToday = new Date()
          startOfToday.setHours(0, 0, 0, 0)
          
          supabase
            .from('game_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('patient_id', user.id)
            .gte('played_at', startOfToday.toISOString())
            .then(({ count }) => {
              if (count !== null) setVal(count)
            })
        }
      }
    })
  }, [max])

  return <>{val}</>
}

export default function PatientProfile() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('Patient')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  const [isEditingName, setIsEditingName] = useState(false)
  const [editNameValue, setEditNameValue] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)
  
  const { language, setLanguage, colorTheme, setColorTheme } = useAppStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email || null)
        const metadataName = user.user_metadata?.full_name || user.user_metadata?.name
        
        supabase.from('users').select('id, full_name, avatar_url').eq('id', user.id).single().then(({ data }) => {
          if (data) {
            setUserId(data.id)
            setUserName(data.full_name !== 'User' && data.full_name ? data.full_name : (metadataName || 'Patient'))
            if (data.avatar_url) setAvatarUrl(data.avatar_url)
          } else {
            setUserId(user.id)
            if (metadataName) setUserName(metadataName)
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setUploading(true)
    try {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      
      reader.onload = (event) => {
        const img = new Image()
        img.src = event.target?.result as string
        img.onload = async () => {
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 300
          const MAX_HEIGHT = 300
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height
              height = MAX_HEIGHT
            }
          }
          canvas.width = width
          canvas.height = height
          
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8)
          
          const { error } = await supabase
            .from('users')
            .update({ avatar_url: compressedBase64 })
            .eq('id', userId)
            
          if (error) throw error
          
          setAvatarUrl(compressedBase64)
          setUploading(false)
        }
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
      setUploading(false)
    }
  }

  const handleSaveName = async () => {
    if (!userId || !editNameValue.trim()) {
      setIsEditingName(false)
      return
    }
    setIsSavingName(true)
    try {
      const newName = editNameValue.trim()
      const { error } = await supabase.from('users').update({ full_name: newName }).eq('id', userId)
      if (error) throw error
      setUserName(newName)
      setIsEditingName(false)
    } catch (err) {
      console.error('Error updating name:', err)
    } finally {
      setIsSavingName(false)
    }
  }

  return (
    <main className="flex-1 p-6 md:p-10 max-w-2xl mx-auto w-full pb-12">
      <div className="mb-4">
        <Link to="/patient" className="inline-flex items-center gap-2 text-gray-500 hover:text-primary transition-colors">
          <ArrowLeft size={24} />
        </Link>
      </div>
      <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm text-center mb-8 relative">
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
        />
        
        <div className="flex flex-col items-center">
          <div 
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="group w-28 h-28 bg-[#EFE8FA] rounded-full mb-3 overflow-hidden border-4 border-white shadow-lg flex items-center justify-center cursor-pointer relative"
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 text-[#5A4B81] animate-spin" />
            ) : (
              <>
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Profile Avatar" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <span className="text-5xl font-bold text-[#5A4B81]">{userName.charAt(0)}</span>
                )}
                <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </>
            )}
          </div>
          <button 
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="text-[#5A4B81] font-bold text-sm bg-[#EFE8FA] px-4 py-1.5 rounded-full mb-4 flex items-center gap-1 hover:bg-[#F0EBF9] transition-colors shadow-sm"
          >
            <Camera size={16} /> {t('Add / Change Photo', language)}
          </button>
        </div>
        
        {isEditingName ? (
          <div className="flex items-center justify-center gap-2 mb-1">
            <input 
              type="text" 
              value={editNameValue} 
              onChange={e => setEditNameValue(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-1.5 text-2xl font-bold text-gray-800 text-center focus:outline-none focus:ring-2 focus:ring-[#5A4B81] w-48 shadow-sm"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName() }}
            />
            <button 
              onClick={handleSaveName} 
              disabled={isSavingName}
              className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
            >
              {isSavingName ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
            </button>
            <button 
              onClick={() => setIsEditingName(false)} 
              disabled={isSavingName}
              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 group mb-1">
            <h2 className="text-3xl font-bold text-gray-800">{userName}</h2>
            <button 
              onClick={() => { setEditNameValue(userName); setIsEditingName(true); }}
              className="opacity-100 md:opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-[#5A4B81] hover:bg-[#EFE8FA] rounded-full transition-all"
            >
              <Pencil size={18} />
            </button>
          </div>
        )}
        
        <p className="text-gray-500 font-medium mt-1">{t('Patient Account', language)}</p>
        {userEmail && <p className="text-sm font-semibold text-gray-400 mt-1">{userEmail}</p>}
        
        {userId && (
          <div className="mt-6 bg-[#FAFAFA] border border-gray-100 rounded-2xl p-4 flex flex-col items-center">
            <p className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-2">{t('Share Link Code with Caregiver', language)}</p>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-200 w-full max-w-sm">
              <span className="font-mono text-gray-500 text-xs truncate flex-1">{userId}</span>
              <button 
                onClick={copyId}
                className="text-[#5A4B81] hover:bg-[#EFE8FA] p-2 rounded-lg transition-colors flex items-center gap-1"
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
            onClick={async () => {
              await supabase.auth.signOut();
              navigate('/login');
            }}
            className="bg-red-50 text-red-600 px-6 py-2 rounded-full font-bold shadow-sm hover:bg-red-100 active:scale-95 transition-all w-full max-w-xs">
            {t('Sign Out', language)}
          </button>
        </div>
      </div>

      {/* Cognitive Progress Section */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm mb-8">
        <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-2 h-6 bg-[#5A4B81] rounded-full inline-block"></span>
          {t('Cognitive Progress', language)}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#EFE8FA] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <div className="text-3xl font-black text-[#5A4B81] mb-1">
              <StatsValue table="game_sessions" column="count" />
            </div>
            <span className="text-sm font-bold text-[#3B2D60]">{t("Played Today", language)}</span>
          </div>
          <div className="bg-[#FFE4E6] rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <div className="text-3xl font-black text-[#E11D48] mb-1">
              <StatsValue table="game_progress" column="highest_level" max={true} />
            </div>
            <span className="text-sm font-bold text-[#E11D48]">{t('Highest Level', language)}</span>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Language Selector */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="bg-[#EFE8FA] p-3 rounded-2xl text-[#7C3AED]"><Globe size={24} /></div>
            <span className="text-lg font-bold text-gray-800">{t('Language', language)}</span>
          </div>
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-[#FAFAFA] border border-gray-200 text-gray-800 font-bold rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#5A4B81]"
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

        <Link to="/patient/settings" className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="bg-gray-100 p-3 rounded-2xl text-gray-600"><Settings size={24} /></div>
            <span className="text-lg font-bold text-gray-800">{t('App Settings', language)}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 font-bold">&gt;</div>
        </Link>
        
        <Link to="/patient/privacy" className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="bg-[#DCFCE7] p-3 rounded-2xl text-[#16A34A]"><Shield size={24} /></div>
            <span className="text-lg font-bold text-gray-800">{t('Privacy & Security', language)}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 font-bold">&gt;</div>
        </Link>
        
        <Link to="/patient/support" className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="bg-[#E0F2FE] p-3 rounded-2xl text-[#0284C7]"><Phone size={24} /></div>
            <span className="text-lg font-bold text-gray-800">{t('Help & Support', language)}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 font-bold">&gt;</div>
        </Link>
        
        {/* Color Theme Selector */}
        <div className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col gap-4 shadow-sm">
          <div>
            <span className="text-lg font-bold text-gray-800">Color Theme</span>
            <p className="text-sm text-gray-500">Choose your preferred app color</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => { setColorTheme('green'); playClickSound(); }}
              className={`w-12 h-12 rounded-full bg-[#144533] border-4 transition-all ${colorTheme === 'green' ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent hover:scale-110'}`}
              aria-label="Green Theme"
            />
            <button 
              onClick={() => { setColorTheme('blue'); playClickSound(); }}
              className={`w-12 h-12 rounded-full bg-[#3b82f6] border-4 transition-all ${colorTheme === 'blue' ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent hover:scale-110'}`}
              aria-label="Blue Theme"
            />
            <button 
              onClick={() => { setColorTheme('purple'); playClickSound(); }}
              className={`w-12 h-12 rounded-full bg-[#8b5cf6] border-4 transition-all ${colorTheme === 'purple' ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-transparent hover:scale-110'}`}
              aria-label="Purple Theme"
            />
          </div>
        </div>
      </div>
    </main>
  )
}
