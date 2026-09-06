import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Play, Trophy, Upload, Plus, Trash2, Loader2, FolderPlus, Folder, ChevronRight, X, Image, RefreshCw } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useAppStore } from '../../../store/useAppStore'
import { playClickSound } from '../../../lib/audio'
import { t } from '../../../lib/i18n'
import { playPremiumVoice } from '../../../lib/tts'

export interface FamilyMember {
  id: string
  name: string
  photoUrl: string
  relation?: string
}

export interface FamilySection {
  id: string
  name: string
  members: FamilyMember[]
}

export default function FamilyQuiz() {
  const { language } = useAppStore()
  
  const [sections, setSections] = useState<FamilySection[]>([])
  const [activeSection, setActiveSection] = useState<FamilySection | null>(null)
  
  const [isSectionSetupMode, setIsSectionSetupMode] = useState(true)
  const [isMemberSetupMode, setIsMemberSetupMode] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const [loading, setLoading] = useState(true)

  // New section state
  const [showAddSectionModal, setShowAddSectionModal] = useState(false)
  const [newSectionName, setNewSectionName] = useState('')

  // New member state
  const [newName, setNewName] = useState('')
  const [newRelation, setNewRelation] = useState('')
  const [newPhotoUrl, setNewPhotoUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  
  const [showLibraryModal, setShowLibraryModal] = useState(false)
  const [libraryPhotos, setLibraryPhotos] = useState<{url: string, name: string}[]>([])
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false)

  const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Game state
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [gameFinished, setGameFinished] = useState(false)
  const [feedback, setFeedback] = useState<'correct'|'incorrect'|null>(null)
  const [isSavingGame, setIsSavingGame] = useState(false)
  const [gameStartTime, setGameStartTime] = useState(0)
  
  const [options, setOptions] = useState<string[]>([])
  const [correctAnswer, setCorrectAnswer] = useState<FamilyMember | null>(null)

  const loadSections = async (activeSectionId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('family_sections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
      
      if (sectionsError) throw sectionsError

      const { data: membersData, error: membersError } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        
      if (membersError) throw membersError

      const parsedSections: FamilySection[] = (sectionsData || []).map(sec => ({
        id: sec.id,
        name: sec.name,
        members: (membersData || [])
          .filter(m => m.section_id === sec.id)
          .map(m => ({
            id: m.id,
            name: m.name,
            photoUrl: m.avatar_url,
            relation: m.relation
          }))
      }))

      setSections(parsedSections)
      
      if (activeSectionId) {
        const found = parsedSections.find(s => s.id === activeSectionId)
        if (found) setActiveSection(found)
      } else if (activeSection) {
        const found = parsedSections.find(s => s.id === activeSection.id)
        if (found) setActiveSection(found)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSections()
  }, [])

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSectionName.trim()) return
    playClickSound()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { error } = await supabase.from('family_sections').insert({
      user_id: user.id,
      name: newSectionName.trim()
    })
    
    if (error) {
      console.error(error)
      alert(t(`Failed to create section: ${error.message}. Please ensure you ran the database update SQL.`, language))
      return
    }

    setShowAddSectionModal(false)
    setNewSectionName('')
    loadSections()
  }

  const handleDeleteSection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    playClickSound()
    
    const { error } = await supabase.from('family_sections').delete().eq('id', id)
    if (error) {
      alert(t(`Failed to delete section: ${error.message}`, language))
      return
    }
    
    // Optimistic UI update
    setSections(s => s.filter(sec => sec.id !== id))
    loadSections()
  }

  const openSection = (section: FamilySection) => {
    playClickSound()
    setActiveSection(section)
    setIsSectionSetupMode(false)
    setIsMemberSetupMode(true)
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      alert(t('File size exceeds 50MB limit.', language))
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setIsUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not logged in")

      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${user.id}/${Math.random()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('family_photos')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from('family_photos')
        .getPublicUrl(fileName)

      setNewPhotoUrl(data.publicUrl)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert(t('Failed to upload image. Please try again.', language))
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const openLibraryModal = async () => {
    playClickSound()
    setShowLibraryModal(true)
    setIsLoadingLibrary(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.storage
        .from('family_photos')
        .list(user.id, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })
      
      if (error) throw error
      
      const photos = data
        .filter(f => f.name !== '.emptyFolderPlaceholder' && !f.name.match(/\.(mp4|webm|mov|ogg)$/i))
        .map(f => {
          const { data: publicUrlData } = supabase.storage
            .from('family_photos')
            .getPublicUrl(`${user.id}/${f.name}`)
          return { name: f.name, url: publicUrlData.publicUrl }
        })
      
      setLibraryPhotos(photos)
    } catch (error) {
      console.error('Error fetching library:', error)
    } finally {
      setIsLoadingLibrary(false)
    }
  }

  const addMember = async () => {
    if (newName.trim() && newPhotoUrl && activeSection) {
      playClickSound()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from('family_members').insert({
        user_id: user.id,
        section_id: activeSection.id,
        name: newName.trim(),
        relation: newRelation.trim() || null,
        avatar_url: newPhotoUrl
      })

      if (error) {
        console.error(error)
        return
      }
      
      setNewName('')
      setNewRelation('')
      setNewPhotoUrl('')
      
      loadSections(activeSection.id)
    }
  }

  const removeMember = async (memberId: string) => {
    if (activeSection) {
      playClickSound()
      await supabase.from('family_members').delete().eq('id', memberId)
      loadSections(activeSection.id)
    }
  }

  const generateQuestion = (memberList: FamilyMember[], currentIndex: number) => {
    const correct = memberList[currentIndex % memberList.length]
    setCorrectAnswer(correct)
    
    const dummyNames = ["Rahul", "Amit", "Priya", "Neha", "Rohan", "Sneha", "Karan", "Anjali", "Vikas", "Pooja", "John", "Sarah", "Michael", "Emma"]
    const allNames = new Set<string>()
    allNames.add(correct.name)
    
    memberList.forEach(m => {
      if (m.name !== correct.name && allNames.size < 4) {
        allNames.add(m.name)
      }
    })
    
    let dummyIndex = 0
    while (allNames.size < 4 && dummyIndex < dummyNames.length) {
      if (!Array.from(allNames).includes(dummyNames[dummyIndex])) {
        allNames.add(dummyNames[dummyIndex])
      }
      dummyIndex++
    }
    
    const shuffled = Array.from(allNames).sort(() => Math.random() - 0.5)
    setOptions(shuffled)
  }

  const startGame = () => {
    if (!activeSection || activeSection.members.length === 0) return
    playClickSound()
    setIsMemberSetupMode(false)
    setIsPlaying(true)
    setCurrentQuestion(0)
    setScore(0)
    setGameFinished(false)
    setFeedback(null)
    setGameStartTime(Date.now())
    
    // Shuffle members for a random game order each time
    const shuffledMembers = [...activeSection.members].sort(() => Math.random() - 0.5)
    
    // Temporarily update active section with shuffled array for the game session
    setActiveSection({ ...activeSection, members: shuffledMembers })
    
    generateQuestion(shuffledMembers, 0)
  }

  const handleAnswer = (selectedName: string) => {
    if (feedback) return // prevent double clicking
    playClickSound()
    
    const isCorrect = selectedName === correctAnswer?.name
    
    if (isCorrect) {
      setScore(s => s + 10)
      setFeedback('correct')
      playPremiumVoice(t('Congratulations, great job!', language), language)
    } else {
      setFeedback('incorrect')
    }

    setTimeout(() => {
      setFeedback(null)
      if (currentQuestion < (activeSection?.members.length || 0) - 1) {
        setCurrentQuestion(c => c + 1)
        generateQuestion(activeSection!.members, currentQuestion + 1)
      } else {
        handleGameComplete()
      }
    }, 2500)
  }

  const handleGameComplete = async () => {
    setGameFinished(true)
    setIsSavingGame(true)
    try {
      const durationSeconds = Math.floor((Date.now() - gameStartTime) / 1000)
      const { data: { user } } = await supabase.auth.getUser()
      if (user && navigator.onLine) {
        await supabase.from('game_sessions').insert({
          patient_id: user.id,
          game_id: 'family-quiz',
          score: score,
          duration_seconds: durationSeconds
        })
      }
    } catch (e) {
      console.error('Error saving game:', e)
    } finally {
      setIsSavingGame(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary-hover" size={48} /></div>
  }

  return (
    <div className="flex flex-col min-h-screen bg-background font-sans">
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-100 bg-white">
        <Link to={isPlaying || isMemberSetupMode ? "#" : "/patient/games"} 
              onClick={(e) => {
                if (isPlaying) {
                  e.preventDefault(); setIsPlaying(false); setIsMemberSetupMode(true)
                } else if (isMemberSetupMode) {
                  e.preventDefault(); setIsMemberSetupMode(false); setIsSectionSetupMode(true); setActiveSection(null); loadSections()
                }
              }} 
              className="text-gray-500 dark:text-gray-300 hover:text-primary-hover transition-colors p-2 -ml-2 rounded-full hover:bg-gray-50">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">
          {t('Family Photo Quiz', language)}
        </h1>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 p-6 flex flex-col max-w-md mx-auto w-full">
        {/* SECTION SETUP MODE */}
        {isSectionSetupMode && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-right-8 duration-300">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder size={40} className="text-rose-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('Select an Album', language)}</h2>
              <p className="text-gray-500 dark:text-gray-300">{t('Choose a section to play', language)}</p>
            </div>

            <div className="space-y-4 flex-1">
              {sections.map(section => (
                <div key={section.id} onClick={() => openSection(section)} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:border-[#1B4D3E] hover:shadow-md transition-all active:scale-[0.98]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-300">
                      <Folder size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{section.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-300">{section.members.length} {t('photos', language)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => handleDeleteSection(section.id, e)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                      <Trash2 size={20} />
                    </button>
                    <ChevronRight size={24} className="text-gray-400" />
                  </div>
                </div>
              ))}
              
              <button onClick={() => { playClickSound(); setShowAddSectionModal(true); }} className="w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-4 flex flex-col items-center justify-center text-gray-500 dark:text-gray-300 hover:bg-[#F3F9F6] hover:border-[#1B4D3E] hover:text-primary-hover transition-all gap-2 active:scale-[0.98]">
                <FolderPlus size={32} />
                <span className="font-bold">{t('Add New Section', language)}</span>
              </button>
            </div>
          </div>
        )}

        {/* ADD SECTION MODAL */}
        {showAddSectionModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200">
              <button onClick={() => setShowAddSectionModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"><X size={20}/></button>
              <h3 className="text-xl font-bold mb-4">{t('Section Name', language)}</h3>
              <form onSubmit={handleAddSection}>
                <input 
                  autoFocus
                  required
                  type="text"
                  placeholder={t('e.g., Family, Friends', language)}
                  value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-4 mb-4 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] transition-all shadow-sm"
                />
                <button type="submit" className="w-full bg-primary-hover text-white py-4 rounded-xl font-bold hover:bg-primary-hover transition-colors shadow-md active:scale-[0.98]">
                  {t('Create', language)}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MEMBER SETUP MODE */}
        {isMemberSetupMode && activeSection && (
          <div className="flex-1 flex flex-col animate-in slide-in-from-right-8 duration-300">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{activeSection.name}</h2>
              <p className="text-gray-500 dark:text-gray-300">{t('Add members to this section', language)}</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm mb-6 relative">
              {isUploading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center z-10">
                  <Loader2 size={32} className="animate-spin text-primary-hover mb-2" />
                  <span className="font-bold text-primary-hover">{t('Uploading...', language)}</span>
                </div>
              )}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  {newPhotoUrl ? (
                    <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center relative overflow-hidden group">
                      <img src={newPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex gap-4 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { playClickSound(); fileInputRef.current?.click(); }} className="bg-white/20 p-2 rounded-full hover:bg-white/40 transition-colors">
                          <Upload size={24} className="text-white" />
                        </button>
                        <button onClick={openLibraryModal} className="bg-white/20 p-2 rounded-full hover:bg-white/40 transition-colors">
                          <Image size={24} className="text-white" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { if(!isUploading) { playClickSound(); fileInputRef.current?.click(); } }}
                        className="w-full h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                      >
                        <Upload size={24} className="mb-1" />
                        <span className="text-xs font-medium">{t('Upload Photo', language)}</span>
                      </button>
                      <button
                        onClick={openLibraryModal}
                        className="w-full h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Image size={24} className="mb-1" />
                        <span className="text-xs font-medium">{t('Choose from Library', language)}</span>
                      </button>
                    </div>
                  )}
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
                </div>
                
                <input 
                  type="text"
                  placeholder={t("Person's Name", language)}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] transition-all"
                />
                
                <input 
                  type="text"
                  placeholder={t("Relation (Optional)", language)}
                  value={newRelation}
                  onChange={(e) => setNewRelation(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] transition-all"
                />
                
                <button 
                  onClick={addMember}
                  disabled={!newName.trim() || !newPhotoUrl || isUploading}
                  className="w-full bg-primary-hover text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-hover transition-all active:scale-[0.98] shadow-md"
                >
                  <Plus size={20} /> {t('Add Member', language)}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-6 space-y-3">
              {activeSection.members.map(member => (
                <div key={member.id} className="flex items-center gap-4 bg-white border border-gray-100 p-3 rounded-2xl shadow-sm animate-in fade-in duration-300">
                  <img src={member.photoUrl} alt={member.name} className="w-14 h-14 rounded-xl object-cover" />
                  <div className="flex-1">
                    <div className="font-bold text-gray-800">{member.name}</div>
                    {member.relation && <div className="text-xs text-gray-500 dark:text-gray-300 font-medium">{member.relation}</div>}
                  </div>
                  <button onClick={() => removeMember(member.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
              {activeSection.members.length === 0 && (
                <div className="text-center text-gray-400 py-8 border-2 border-dashed border-gray-100 rounded-2xl">
                  {t('No photos added yet', language)}
                </div>
              )}
            </div>

            <button 
              onClick={startGame}
              disabled={activeSection.members.length < 2}
              className="w-full bg-rose-500 text-white py-4 rounded-full font-bold text-lg shadow-lg hover:bg-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Play size={24} fill="currentColor" />
              {activeSection.members.length < 2 ? t('Need 2+ photos to play', language) : t('Start Quiz', language)}
            </button>
          </div>
        )}

        {/* GAME MODE */}
        {isPlaying && correctAnswer && !gameFinished && (
          <div className="flex-1 flex flex-col animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <div className="bg-gray-100 px-4 py-2 rounded-full font-bold text-gray-600">
                {currentQuestion + 1} / {activeSection?.members.length}
              </div>
              <div className="bg-orange-100 text-orange-600 px-4 py-2 rounded-full font-bold flex items-center gap-2">
                <Trophy size={18} /> {score}
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center">
              <h2 className="text-3xl font-bold text-gray-800 mb-8 text-center">{t('Who is this?', language)}</h2>
              
              <div className={`relative w-64 h-64 mx-auto mb-10 transition-transform duration-500 ${feedback ? 'scale-105' : ''}`}>
                <div className="absolute inset-0 bg-primary-hover rounded-[2rem] rotate-6 opacity-20"></div>
                <div className="absolute inset-0 bg-white rounded-[2rem] shadow-xl overflow-hidden border-4 border-white">
                  <img src={correctAnswer.photoUrl} alt="Family Member" className="w-full h-full object-cover" />
                </div>
                
                {feedback === 'correct' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-green-500/80 rounded-[2rem] backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                    <span className="text-white font-bold text-4xl">✓</span>
                  </div>
                )}
                {feedback === 'incorrect' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-500/80 rounded-[2rem] backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                    <span className="text-white font-bold text-4xl">✕</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 w-full">
                {options.map((opt, i) => {
                  let btnColor = "bg-white text-gray-800 border-gray-200"
                  if (feedback) {
                    if (opt === correctAnswer.name) btnColor = "bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/30"
                    else btnColor = "bg-gray-100 text-gray-400 border-gray-100 opacity-50"
                  }

                  return (
                    <button 
                      key={i}
                      disabled={feedback !== null}
                      onClick={() => handleAnswer(opt)}
                      className={`${btnColor} border-2 py-4 px-6 rounded-2xl font-bold text-xl transition-all shadow-sm active:scale-[0.98] hover:border-[#1B4D3E]`}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* FINISHED MODE */}
        {gameFinished && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
            <div className="w-32 h-32 bg-orange-100 rounded-full flex items-center justify-center mb-6 relative">
              <Trophy size={64} className="text-orange-500" />
            </div>
            <h2 className="text-4xl font-black text-gray-900 mb-4">{t('Great Job!', language)}</h2>
            <p className="text-xl text-gray-500 dark:text-gray-300 mb-2">{t('You scored', language)}</p>
            <div className="text-6xl font-black text-primary-hover mb-12">{score}</div>
            
            <button 
              onClick={() => { playClickSound(); setIsPlaying(false); setIsMemberSetupMode(true); }}
              className="w-full bg-primary-hover text-white py-4 rounded-full font-bold text-lg shadow-xl shadow-[#1B4D3E]/30 hover:bg-primary-hover transition-all active:scale-[0.98]"
            >
              {t('Play Again', language)}
            </button>
            
            {isSavingGame && <p className="text-sm text-gray-400 mt-4 flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> {t('Saving...', language)}</p>}
          </div>
        )}
        
        {/* Library Modal */}
        {showLibraryModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex flex-col animate-in fade-in duration-200">
            <div className="bg-white dark:bg-[#1E293B] mt-auto rounded-t-3xl h-[80vh] flex flex-col">
              <div className="p-4 border-b border-gray-100 dark:border-white/10 flex items-center justify-between">
                <h3 className="font-bold text-lg text-gray-800 dark:text-white">{t('Choose from Library', language)}</h3>
                <button onClick={() => setShowLibraryModal(false)} className="p-2 bg-gray-100 dark:bg-white/10 rounded-full text-gray-500 dark:text-gray-300">
                  <X size={20} />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto">
                {isLoadingLibrary ? (
                  <div className="flex items-center justify-center h-48">
                    <Loader2 size={32} className="animate-spin text-primary" />
                  </div>
                ) : libraryPhotos.length === 0 ? (
                  <div className="text-center py-12">
                    <Image size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">{t('No photos found in library.', language)}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {libraryPhotos.map((photo, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => {
                          setNewPhotoUrl(photo.url)
                          setShowLibraryModal(false)
                          playClickSound()
                        }}
                        className="aspect-square rounded-xl overflow-hidden cursor-pointer active:scale-95 transition-transform"
                      >
                        <img src={photo.url} alt="Library" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
