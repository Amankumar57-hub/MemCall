import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Image as ImageIcon, Video, Upload, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'
import { t } from '../../lib/i18n'

interface MediaFile {
  name: string
  url: string
  type: 'image' | 'video'
  created_at: string | null
}

export default function MyFamily() {
  const navigate = useNavigate()
  const { language } = useAppStore()
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<MediaFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

  useEffect(() => {
    fetchMedia()
  }, [])

  const fetchMedia = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.storage
        .from('family_photos')
        .list(user.id, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        })

      if (error) throw error

      const files: MediaFile[] = data
        .filter(file => file.name !== '.emptyFolderPlaceholder')
        .map(file => {
          const { data: publicUrlData } = supabase.storage
            .from('family_photos')
            .getPublicUrl(`${user.id}/${file.name}`)
            
          const isVideo = file.name.match(/\.(mp4|webm|mov|ogg)$/i)
          
          return {
            name: file.name,
            url: publicUrlData.publicUrl,
            type: isVideo ? 'video' : 'image',
            created_at: file.created_at
          }
        })

      setMediaFiles(files)
    } catch (error) {
      console.error('Error fetching media:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      alert(t('File size exceeds 50MB limit.', language))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not logged in")

      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${user.id}/${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('family_photos')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      await fetchMedia()
    } catch (error) {
      console.error('Error uploading file:', error)
      alert(t('Failed to upload file. Please try again.', language))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const deleteFile = async (fileName: string) => {
    if (!confirm(t('Are you sure you want to delete this file?', language))) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.storage
        .from('family_photos')
        .remove([`${user.id}/${fileName}`])

      if (error) throw error

      setMediaFiles(prev => prev.filter(f => f.name !== fileName))
      setSelectedMedia(null)
    } catch (error) {
      console.error('Error deleting file:', error)
      alert(t('Failed to delete file.', language))
    }
  }

  return (
    <div className="min-h-screen bg-background dark:bg-[#121212] font-sans pb-24">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/10 bg-white dark:bg-[#1E293B] sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/patient')} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft size={24} className="text-gray-700 dark:text-white" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 dark:text-white">
              {t('My Family', language)}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('Photos, names and precious memories', language)}
            </p>
          </div>
        </div>
        
        {/* Upload Button */}
        <div>
          <input
            type="file"
            accept="image/*,video/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="bg-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-primary-hover active:scale-95 transition-all shadow-sm flex items-center gap-2 text-sm disabled:opacity-50"
          >
            {uploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload size={18} />
            )}
            <span className="hidden sm:inline">
              {uploading ? t('Uploading...', language) : t('Upload Media', language)}
            </span>
          </button>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-5xl mx-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : mediaFiles.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-[#1E293B] rounded-3xl shadow-sm border border-gray-100 dark:border-white/10">
            <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <ImageIcon size={48} className="text-orange-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{t('No Memories Yet', language)}</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-8">
              {t('Upload photos and videos of your loved ones here. Max size 50MB.', language)}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-hover active:scale-95 transition-all shadow-md inline-flex items-center gap-2"
            >
              <Upload size={20} />
              {t('Upload First Memory', language)}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mediaFiles.map((file, idx) => (
              <div 
                key={idx} 
                className="aspect-square bg-gray-100 dark:bg-white/5 rounded-2xl overflow-hidden relative group cursor-pointer border border-gray-200 dark:border-white/10 shadow-sm"
                onClick={() => setSelectedMedia(file)}
              >
                {file.type === 'image' ? (
                  <img src={file.url} alt="Family" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                ) : (
                  <div className="w-full h-full relative">
                    <video src={file.url} className="w-full h-full object-cover" preload="metadata" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                      <div className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Video size={24} className="text-white" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Full Screen Viewer Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center animate-in fade-in duration-200">
          <button 
            onClick={() => setSelectedMedia(null)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
          >
            <X size={24} />
          </button>
          
          <button 
            onClick={() => deleteFile(selectedMedia.name)}
            className="absolute top-6 left-6 p-3 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-full transition-colors z-50 flex items-center gap-2"
          >
            <Trash2 size={24} />
            <span className="hidden sm:inline font-bold">Delete</span>
          </button>

          <div className="w-full max-w-4xl max-h-[85vh] p-4 flex items-center justify-center relative">
            {selectedMedia.type === 'image' ? (
              <img src={selectedMedia.url} alt="Family memory" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
            ) : (
              <video src={selectedMedia.url} controls autoPlay className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
