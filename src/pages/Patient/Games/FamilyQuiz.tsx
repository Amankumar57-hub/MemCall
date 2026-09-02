import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Play, Trophy, Upload, Plus, Trash2, Loader2, FolderPlus, Folder, ChevronRight, X } from 'lucide-react'
import { getSections, saveSection, deleteSection, type FamilySection, type FamilyMember } from '../../../lib/indexedDB'
import { useAppStore } from '../../../store/useAppStore'
import { playClickSound } from '../../../lib/audio'
import { t } from '../../../lib/i18n'
import { playPremiumVoice } from '../../../lib/tts'

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
  const [newPhotoUrl, setNewPhotoUrl] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Game state
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [score, setScore] = useState(0)
  const [gameFinished, setGameFinished] = useState(false)
  const [feedback, setFeedback] = useState<'correct'|'incorrect'|null>(null)
  
  const [options, setOptions] = useState<string[]>([])
  const [correctAnswer, setCorrectAnswer] = useState<FamilyMember | null>(null)

  const loadSections = async () => {
    try {
      const data = await getSections()
      setSections(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSections()
  }, [])

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSectionName.trim()) return
    playClickSound()
    const newSection: FamilySection = {
      id: Math.random().toString(36).substring(7),
      name: newSectionName.trim(),
      members: []
    }
    await saveSection(newSection)
    setShowAddSectionModal(false)
    setNewSectionName('')
    loadSections()
  }

  const handleDeleteSection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    playClickSound()
    await deleteSection(id)
    loadSections()
  }

  const openSection = (section: FamilySection) => {
    playClickSound()
    setActiveSection(section)
    setIsSectionSetupMode(false)
    setIsMemberSetupMode(true)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      setNewPhotoUrl(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const addMember = async () => {
    if (newName.trim() && newPhotoUrl && activeSection) {
      playClickSound()
      const newMember = {
        id: Math.random().toString(36).substring(7),
        name: newName.trim(),
        photoUrl: newPhotoUrl
      }
      
      const updatedSection = {
        ...activeSection,
        members: [...activeSection.members, newMember]
      }
      
      await saveSection(updatedSection)
      setActiveSection(updatedSection)
      setNewName('')
      setNewPhotoUrl('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      loadSections()
    }
  }

  const removeMember = async (memberId: string) => {
    if (activeSection) {
      playClickSound()
      const updatedSection = {
        ...activeSection,
        members: activeSection.members.filter(m => m.id !== memberId)
      }
      await saveSection(updatedSection)
      setActiveSection(updatedSection)
      loadSections()
    }
  }

  const generateQuestion = (memberList: FamilyMember[], currentIndex: number) => {
    const correct = memberList[currentIndex % memberList.length]
    setCorrectAnswer(correct)
    
    const dummyNames = ["Rahul", "Amit", "Priya", "Neha", "Rohan", "Sneha", "Karan", "Anjali", "Vikas", "Pooja"]
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
    
    generateQuestion(activeSection.members, 0)
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
        setGameFinished(true)
      }
    }, 2500)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#FDFDF9]"><Loader2 className="animate-spin text-[#1B4D3E]" size={48} /></div>
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDF9] font-sans">
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-100 bg-white">
        <Link to={isPlaying || isMemberSetupMode ? "#" : "/patient/games"} 
              onClick={(e) => {
                if (isPlaying) {
                  e.preventDefault(); setIsPlaying(false); setIsMemberSetupMode(true)
                } else if (isMemberSetupMode) {
                  e.preventDefault(); setIsMemberSetupMode(false); setIsSectionSetupMode(true); setActiveSection(null)
                }
              }} 
              className="text-gray-500 hover:text-[#1B4D3E] transition-colors p-2 -ml-2 rounded-full hover:bg-gray-50">
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
          <div className="flex-1 flex flex-col">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Folder size={40} className="text-rose-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('Select an Album', language)}</h2>
              <p className="text-gray-500">{t('Choose a section to play', language)}</p>
            </div>

            <div className="space-y-4 flex-1">
              {sections.map(section => (
                <div key={section.id} onClick={() => openSection(section)} className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:border-[#1B4D3E] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500">
                      <Folder size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{section.name}</h3>
                      <p className="text-sm text-gray-500">{section.members.length} {t('photos', language)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => handleDeleteSection(section.id, e)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full">
                      <Trash2 size={20} />
                    </button>
                    <ChevronRight size={24} className="text-gray-400" />
                  </div>
                </div>
              ))}
              
              <button onClick={() => { playClickSound(); setShowAddSectionModal(true); }} className="w-full bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-4 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors gap-2">
                <FolderPlus size={32} />
                <span className="font-bold">{t('Add New Section', language)}</span>
              </button>
            </div>
          </div>
        )}

        {/* ADD SECTION MODAL */}
        {showAddSectionModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl relative">
              <button onClick={() => setShowAddSectionModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full"><X size={20}/></button>
              <h3 className="text-xl font-bold mb-4">{t('Section Name', language)}</h3>
              <form onSubmit={handleAddSection}>
                <input 
                  autoFocus
                  required
                  type="text"
                  placeholder={t('e.g., Family, Friends', language)}
                  value={newSectionName}
                  onChange={e => setNewSectionName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-4 mb-4 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
                />
                <button type="submit" className="w-full bg-[#1B4D3E] text-white py-4 rounded-xl font-bold">
                  {t('Create', language)}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MEMBER SETUP MODE */}
        {isMemberSetupMode && activeSection && (
          <div className="flex-1 flex flex-col">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{activeSection.name}</h2>
              <p className="text-gray-500">{t('Upload photos', language)}</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm mb-6">
              <div className="flex flex-col gap-4">
                <div 
                  onClick={() => { playClickSound(); fileInputRef.current?.click(); }}
                  className="w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-50 transition-colors relative overflow-hidden"
                >
                  {newPhotoUrl ? (
                    <img src={newPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload size={32} className="mb-2" />
                      <span className="font-medium">{t('Upload Photo', language)}</span>
                    </>
                  )}
                  <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} className="hidden" />
                </div>
                
                <input 
                  type="text"
                  placeholder={t("Person's Name", language)}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#1B4D3E]"
                />
                
                <button 
                  onClick={addMember}
                  disabled={!newName.trim() || !newPhotoUrl}
                  className="w-full bg-[#1B4D3E] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus size={20} /> {t('Add', language)}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto mb-6 space-y-3">
              {activeSection.members.map(member => (
                <div key={member.id} className="flex items-center gap-4 bg-white border border-gray-100 p-3 rounded-2xl shadow-sm">
                  <img src={member.photoUrl} alt={member.name} className="w-14 h-14 rounded-xl object-cover" />
                  <span className="flex-1 font-bold text-gray-800">{member.name}</span>
                  <button onClick={() => removeMember(member.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full">
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
              disabled={activeSection.members.length === 0}
              className="w-full bg-rose-500 text-white py-4 rounded-full font-bold text-lg shadow-lg hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Play size={24} fill="currentColor" />
              {t('Start Quiz', language)}
            </button>
          </div>
        )}

        {/* GAME MODE */}
        {isPlaying && correctAnswer && !gameFinished && (
          <div className="flex-1 flex flex-col">
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
                <div className="absolute inset-0 bg-[#1B4D3E] rounded-[2rem] rotate-6 opacity-20"></div>
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
                    else btnColor = "bg-gray-100 text-gray-400 border-gray-100"
                  }

                  return (
                    <button 
                      key={i}
                      disabled={feedback !== null}
                      onClick={() => handleAnswer(opt)}
                      className={`${btnColor} border-2 py-4 px-6 rounded-2xl font-bold text-xl transition-all shadow-sm active:scale-95`}
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
            <div className="w-32 h-32 bg-orange-100 rounded-full flex items-center justify-center mb-6">
              <Trophy size={64} className="text-orange-500" />
            </div>
            <h2 className="text-4xl font-black text-gray-900 mb-4">{t('Great Job!', language)}</h2>
            <p className="text-xl text-gray-500 mb-2">{t('You scored', language)}</p>
            <div className="text-6xl font-black text-[#1B4D3E] mb-12">{score}</div>
            
            <button 
              onClick={() => { playClickSound(); setIsPlaying(false); setIsMemberSetupMode(true); }}
              className="w-full bg-[#1B4D3E] text-white py-4 rounded-full font-bold text-lg shadow-xl shadow-[#1B4D3E]/30"
            >
              {t('Play Again', language)}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
