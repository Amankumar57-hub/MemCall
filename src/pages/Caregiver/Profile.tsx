import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Camera, Loader2, Activity, LogOut, Pencil, Check, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'
import { t } from '../../lib/i18n'

export default function CaregiverProfile() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('Caregiver')
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [switchError, setSwitchError] = useState<string | null>(null)
  const { language } = useAppStore()
  
  const handleSaveName = async () => {
    if (!userId || !newName.trim() || newName === userName) {
      setIsEditingName(false)
      return
    }
    setUploading(true)
    try {
      const { error } = await supabase.from('users').update({ full_name: newName.trim() }).eq('id', userId)
      if (error) throw error
      setUserName(newName.trim())
      setIsEditingName(false)
    } catch (error) {
      console.error('Error saving name:', error)
      alert('Failed to save name')
    } finally {
      setUploading(false)
    }
  }
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
            setUserName(data.full_name !== 'User' && data.full_name ? data.full_name : (metadataName || 'Caregiver'))
            if (data.avatar_url) setAvatarUrl(data.avatar_url)
          } else {
            setUserId(user.id)
            if (metadataName) setUserName(metadataName)
          }
        })
      }
    })
  }, [])

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

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans pb-24">
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-2xl font-bold text-primary">{t('MemCall', language)}</h1>
            <p className="text-primary text-sm font-bold uppercase tracking-widest">{t('Caregiver', language)}</p>
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-semibold text-gray-500 ml-8">
            <Link to="/caregiver" className="hover:text-primary transition-colors pb-1">{t('Dashboard', language)}</Link>
            <Link to="/caregiver/profile" className="text-primary border-b-2 border-primary pb-1">{t('Profile', language)}</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-2xl mx-auto w-full">
        <Link to="/caregiver" className="inline-flex items-center gap-2 text-primary font-medium mb-6 hover:underline">
          <ArrowLeft size={20} /> {t('Back to Dashboard', language)}
        </Link>
        
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
              className="group w-28 h-28 bg-accent rounded-full mb-3 overflow-hidden border-4 border-white shadow-lg flex items-center justify-center cursor-pointer relative"
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <>
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Profile Avatar" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <span className="text-5xl font-bold text-primary">{userName.charAt(0)}</span>
                  )}
                  <div className="absolute inset-0 bg-black/40 hidden group-hover:flex items-center justify-center transition-all">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </>
              )}
            </div>
            <button 
              onClick={() => !uploading && fileInputRef.current?.click()}
              className="text-primary font-bold text-sm bg-accent px-4 py-1.5 rounded-full mb-4 flex items-center gap-1 hover:bg-primary/20 transition-colors"
            >
              <Camera size={16} /> {t('Add / Change Photo', language)}
            </button>
          </div>
          
          <div className="flex justify-center items-center gap-2 mt-4">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="text-2xl font-bold text-gray-800 text-center border-b-2 border-primary focus:outline-none bg-transparent w-48"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <button onClick={handleSaveName} disabled={uploading} className="p-1.5 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors">
                  <Check size={18} />
                </button>
                <button onClick={() => setIsEditingName(false)} disabled={uploading} className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors">
                  <X size={18} />
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-gray-800">{userName}</h2>
                <button onClick={() => { setNewName(userName); setIsEditingName(true); }} className="p-1.5 text-gray-400 hover:text-primary transition-colors">
                  <Pencil size={18} />
                </button>
              </>
            )}
          </div>
          
          <p className="text-gray-500 font-medium mt-1">{t('Caregiver Account', language)}</p>
          {userEmail && <p className="text-sm font-semibold text-gray-400 mt-1">{userEmail}</p>}
          
          <div className="flex justify-center gap-4 mt-8">
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                navigate('/login');
              }}
              className="bg-red-50 text-red-600 px-6 py-3 rounded-full font-bold hover:bg-red-100 active:scale-95 transition-all w-full max-w-xs flex items-center justify-center gap-2">
              <LogOut size={20} /> {t('Sign Out', language)}
            </button>
          </div>

          <div className="mt-8 border-t border-gray-100 pt-6">
            {switchError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium">
                {switchError}
              </div>
            )}
            <button 
              disabled={uploading}
              onClick={async () => {
                setSwitchError(null);
                setUploading(true);
                try {
                  const { error } = await supabase.from('users').update({ role: 'patient' }).eq('id', userId);
                  if (error) throw error;
                  await supabase.from('patient_profiles').upsert({ user_id: userId });
                  window.location.href = '/patient';
                } catch (err: any) {
                  console.error(err);
                  setSwitchError(`Error: ${err.message || 'Failed to switch role. Please ensure you have added the SQL policy.'}`);
                } finally {
                  setUploading(false);
                }
              }}
              className="text-gray-500 hover:text-primary font-bold text-sm underline transition-colors disabled:opacity-50">
              {uploading ? t('Switching...', language) : t('Switch to Patient Account', language)}
            </button>
          </div>
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-around z-50">
        <Link to="/caregiver" className="flex flex-col items-center text-gray-400 hover:text-primary transition-colors">
          <div className="p-1"><Activity size={24} /></div>
          <span className="text-xs font-bold mt-1">{t('Dashboard', language)}</span>
        </Link>
        <Link to="/caregiver/profile" className="flex flex-col items-center text-primary border-t-2 border-primary -mt-4 pt-4">
          <div className="p-1"><User size={24} /></div>
          <span className="text-xs font-bold mt-1">{t('Profile', language)}</span>
        </Link>
      </nav>
    </div>
  )
}
