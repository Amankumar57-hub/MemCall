import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Image as ImageIcon, Video, Upload, Trash2, X, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAppStore } from '../../store/useAppStore'
import { t } from '../../lib/i18n'

interface FamilyMember {
  id: string
  name: string
  relation: string | null
  avatar_url: string
  created_at: string
}

export default function MyFamily() {
  const navigate = useNavigate()
  const { language } = useAppStore()
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  
  // Upload State
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [memberName, setMemberName] = useState('')
  const [memberRelation, setMemberRelation] = useState('')
  
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setMembers(data || [])
    } catch (error) {
      console.error('Error fetching members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      alert(t('File size exceeds 50MB limit.', language))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setShowUploadModal(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || !memberName.trim()) return

    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not logged in")

      // 1. Get or Create Section
      let { data: sections } = await supabase
        .from('family_sections')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', 'Main Family')
      
      let sectionId = sections?.[0]?.id

      if (!sectionId) {
        const { data: newSection } = await supabase
          .from('family_sections')
          .insert({ user_id: user.id, name: 'Main Family' })
          .select()
          .single()
        sectionId = newSection?.id
      }

      // 2. Upload Image to Bucket
      const fileExt = selectedFile.name.split('.').pop() || 'jpg'
      const fileName = `${user.id}/${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('family_photos')
        .upload(fileName, selectedFile)

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('family_photos')
        .getPublicUrl(fileName)

      // 3. Insert into family_members
      const { error: insertError } = await supabase.from('family_members').insert({
        user_id: user.id,
        section_id: sectionId,
        name: memberName.trim(),
        relation: memberRelation.trim() || null,
        avatar_url: publicUrlData.publicUrl
      })

      if (insertError) throw insertError

      // Close modal & refresh
      setShowUploadModal(false)
      setSelectedFile(null)
      setPreviewUrl(null)
      setMemberName('')
      setMemberRelation('')
      
      await fetchMembers()
      
      // Trigger background sync
      import('../../lib/syncFamilyMembers').then(module => {
        module.syncFamilyMembers(user.id).catch(err => console.error('Face sync error:', err));
      });
      
    } catch (error) {
      console.error('Error uploading file:', error)
      alert(t('Failed to upload file. Please try again.', language))
    } finally {
      setUploading(false)
    }
  }

  const deleteMember = async (id: string, avatarUrl: string) => {
    if (!confirm(t('Are you sure you want to delete this file?', language))) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Delete from DB
      await supabase.from('family_members').delete().eq('id', id)
      
      // Optionally try to delete from bucket if possible
      try {
        const fileName = avatarUrl.split('/').pop()
        if (fileName) {
          await supabase.storage.from('family_photos').remove([`${user.id}/${fileName}`])
        }
      } catch (e) {
        console.error('Storage deletion skipped', e)
      }

      setMembers(prev => prev.filter(m => m.id !== id))
      setSelectedMember(null)
    } catch (error) {
      console.error('Error deleting member:', error)
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
            accept="image/*"
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-primary-hover active:scale-95 transition-all shadow-sm flex items-center gap-2 text-sm"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">
              {t('Add Member', language) || 'Add Member'}
            </span>
          </button>
        </div>
      </header>

      <main className="p-4 md:p-8 max-w-5xl mx-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : members.length === 0 ? (
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
            {members.map((member) => (
              <div 
                key={member.id} 
                className="aspect-square bg-gray-100 dark:bg-white/5 rounded-2xl overflow-hidden relative group cursor-pointer border border-gray-200 dark:border-white/10 shadow-sm"
                onClick={() => setSelectedMember(member)}
              >
                <img src={member.avatar_url} alt={member.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex flex-col justify-end pointer-events-none">
                   <span className="text-white font-bold text-lg">{member.name}</span>
                   {member.relation && <span className="text-white/80 text-sm">{member.relation}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {showUploadModal && previewUrl && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
           <div className="bg-white dark:bg-[#1E293B] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
             <div className="p-4 border-b border-gray-100 dark:border-white/10 flex justify-between items-center">
               <h3 className="font-bold text-lg dark:text-white">{t('Add Family Member', language) || 'Add Family Member'}</h3>
               <button onClick={() => setShowUploadModal(false)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full">
                 <X size={20} className="dark:text-white" />
               </button>
             </div>
             
             <form onSubmit={handleUploadSubmit} className="p-6">
               <div className="w-full h-48 bg-gray-100 dark:bg-black/20 rounded-2xl mb-6 overflow-hidden flex items-center justify-center border border-gray-200 dark:border-white/10">
                 <img src={previewUrl} className="w-full h-full object-cover" />
               </div>
               
               <div className="space-y-4 mb-8">
                 <div>
                   <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                     {t('Name', language) || 'Name'} *
                   </label>
                   <input
                     type="text"
                     required
                     value={memberName}
                     onChange={e => setMemberName(e.target.value)}
                     className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary outline-none dark:text-white"
                     placeholder={t('E.g. Rahul', language) || 'E.g. Rahul'}
                   />
                 </div>
                 
                 <div>
                   <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                     {t('Relation', language) || 'Relation'}
                   </label>
                   <input
                     type="text"
                     value={memberRelation}
                     onChange={e => setMemberRelation(e.target.value)}
                     className="w-full px-4 py-3 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary outline-none dark:text-white"
                     placeholder={t('E.g. Son, Daughter', language) || 'E.g. Son, Daughter'}
                   />
                 </div>
               </div>
               
               <button
                 type="submit"
                 disabled={uploading || !memberName.trim()}
                 className="w-full py-4 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-hover active:scale-95 transition-all disabled:opacity-50"
               >
                 {uploading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                 ) : (
                    <>{t('Save Member', language) || 'Save Member'}</>
                 )}
               </button>
             </form>
           </div>
         </div>
      )}

      {/* Full Screen Viewer Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center animate-in fade-in duration-200">
          <button 
            onClick={() => setSelectedMember(null)}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-50"
          >
            <X size={24} />
          </button>
          
          <button 
            onClick={() => deleteMember(selectedMember.id, selectedMember.avatar_url)}
            className="absolute top-6 left-6 p-3 bg-red-500/20 hover:bg-red-500/40 text-red-500 rounded-full transition-colors z-50 flex items-center gap-2"
          >
            <Trash2 size={24} />
            <span className="hidden sm:inline font-bold">Delete</span>
          </button>

          <div className="w-full max-w-4xl max-h-[85vh] p-4 flex flex-col items-center justify-center relative">
            <img src={selectedMember.avatar_url} alt={selectedMember.name} className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl mb-6" />
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">{selectedMember.name}</h2>
              {selectedMember.relation && <p className="text-xl text-gray-300">{selectedMember.relation}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
