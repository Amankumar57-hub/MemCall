import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useAppStore } from '../../../store/useAppStore'
import { t } from '../../../lib/i18n'
import { playPremiumVoice } from '../../../lib/tts'

// Pool of possible items
const ALL_ITEMS = [
  { id: 'apple', label: 'Apple', icon: '🍎' },
  { id: 'mango', label: 'Mango', icon: '🥭' },
  { id: 'milk', label: 'Milk', icon: '🥛' },
  { id: 'lamp', label: 'Lamp', icon: '💡' },
  { id: 'house', label: 'House', icon: '🏠' },
  { id: 'tree', label: 'Tree', icon: '🌲' },
  { id: 'cat', label: 'Cat', icon: '🐱' },
  { id: 'dog', label: 'Dog', icon: '🐶' }
]

export default function MemoryGarden() {
  const { language } = useAppStore()
  
  // Game states
  // 'intro' -> 'memorize' -> 'recall' -> 'success'
  const [gameState, setGameState] = useState<'intro' | 'memorize' | 'recall' | 'success'>('intro')
  const [targetItems, setTargetItems] = useState<typeof ALL_ITEMS>([])
  const [options, setOptions] = useState<typeof ALL_ITEMS>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [timeLeft, setTimeLeft] = useState(10)

  // Setup game
  const startGame = () => {
    // Pick 4 random items to memorize
    const shuffled = [...ALL_ITEMS].sort(() => 0.5 - Math.random())
    const targets = shuffled.slice(0, 4)
    setTargetItems(targets)
    
    // Pick options for recall (4 targets + 2 distractors = 6)
    const distractors = shuffled.slice(4, 6)
    const allOptions = [...targets, ...distractors].sort(() => 0.5 - Math.random())
    setOptions(allOptions)
    
    setSelectedIds(new Set())
    setTimeLeft(10)
    setGameState('memorize')

    const instruction = t('Remember these objects', language)
    playPremiumVoice(instruction, language)
  }

  // Timer effect for memorize phase
  useEffect(() => {
    if (gameState === 'memorize' && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (gameState === 'memorize' && timeLeft === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGameState('recall')
      const instruction = t('Which objects did you see?', language)
      playPremiumVoice(instruction, language)
    }
  }, [gameState, timeLeft, language])

  const handleSelect = (id: string) => {
    if (gameState !== 'recall') return

    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)

    // Check if they found all 4 targets
    const selectedTargetsCount = targetItems.filter(t => newSelected.has(t.id)).length
    // if selected only targets and selected all targets
    const isSuccess = selectedTargetsCount === 4 && newSelected.size === 4

    if (isSuccess) {
      setGameState('success')
      const msg = t('Very good! Your memory garden is growing.', language)
      playPremiumVoice(msg, language)
      
      // Update cognitive score here if connected to backend (placeholder)
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFDF9] font-sans pb-24 flex flex-col">
      <header className="px-6 py-4 flex items-center gap-4 bg-white border-b border-gray-100 shadow-sm sticky top-0 z-10">
        <Link to="/patient/games" className="p-2 hover:bg-gray-100 rounded-full text-[#144533] transition-colors">
          <ArrowLeft size={28} />
        </Link>
        <h1 className="text-2xl font-bold text-[#144533]">
          {t('Memory Garden', language)}
        </h1>
      </header>

      <main className="flex-1 p-6 flex flex-col items-center justify-center max-w-2xl mx-auto w-full">
        {gameState === 'intro' && (
          <div className="text-center animate-in fade-in duration-500">
            <div className="text-8xl mb-6">🌱</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
              {t('Plant seeds in your garden', language)}
            </h2>
            <p className="text-xl text-gray-600 mb-10 max-w-md mx-auto">
              {t('You will be shown some items. Memorize them carefully!', language)}
            </p>
            <button 
              onClick={startGame}
              className="bg-[#1B4D3E] text-white text-2xl font-bold py-4 px-12 rounded-full shadow-lg hover:bg-[#13382D] transition-transform active:scale-95"
            >
              {t('Start', language)}
            </button>
          </div>
        )}

        {gameState === 'memorize' && (
          <div className="w-full text-center animate-in slide-in-from-bottom-10 fade-in duration-500">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">
              {t('Remember these objects', language)}
            </h2>
            
            <div className="grid grid-cols-2 gap-6 mb-12">
              {targetItems.map(item => (
                <div key={item.id} className="bg-white border-4 border-[#1B4D3E]/10 rounded-[32px] p-8 shadow-sm flex flex-col items-center justify-center aspect-square">
                  <span className="text-6xl mb-4">{item.icon}</span>
                  <span className="text-2xl font-bold text-gray-700">{t(item.label, language)}</span>
                </div>
              ))}
            </div>

            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-[#1B4D3E] h-full transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / 10) * 100}%` }}
              ></div>
            </div>
            <p className="text-[#1B4D3E] font-bold text-xl mt-4">{timeLeft}s</p>
          </div>
        )}

        {gameState === 'recall' && (
          <div className="w-full text-center animate-in slide-in-from-bottom-10 fade-in duration-500">
            <h2 className="text-3xl font-bold text-gray-800 mb-8">
              {t('Which objects did you see?', language)}
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {options.map(item => {
                const isSelected = selectedIds.has(item.id)
                return (
                  <button 
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`border-4 rounded-[24px] p-6 flex flex-col items-center justify-center aspect-square transition-all duration-300 ${
                      isSelected 
                        ? 'bg-[#E1F4EA] border-[#1B4D3E] shadow-md scale-[1.02]' 
                        : 'bg-white border-transparent shadow-sm hover:shadow-md hover:border-gray-200'
                    }`}
                  >
                    <span className="text-5xl mb-2">{item.icon}</span>
                    <span className={`text-xl font-bold ${isSelected ? 'text-[#1B4D3E]' : 'text-gray-700'}`}>
                      {t(item.label, language)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {gameState === 'success' && (
          <div className="text-center animate-in zoom-in fade-in duration-500">
            <div className="w-32 h-32 bg-[#E1F4EA] rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <span className="text-6xl">🌱</span>
            </div>
            <h2 className="text-3xl font-bold text-[#1B4D3E] mb-4">
              {t('Very good!', language)}
            </h2>
            <p className="text-xl text-gray-600 mb-10 max-w-md mx-auto">
              {t('Your memory garden is growing.', language)}
            </p>
            
            <div className="flex gap-4 justify-center">
              <button 
                onClick={startGame}
                className="bg-[#1B4D3E] text-white text-xl font-bold py-4 px-8 rounded-full shadow-lg hover:bg-[#13382D] transition-transform active:scale-95 flex items-center gap-2"
              >
                <RefreshCw size={24} />
                {t('Play Again', language)}
              </button>
              <Link 
                to="/patient/games"
                className="bg-gray-100 text-gray-800 text-xl font-bold py-4 px-8 rounded-full shadow-sm hover:bg-gray-200 transition-transform active:scale-95"
              >
                {t('Go Back', language)}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
