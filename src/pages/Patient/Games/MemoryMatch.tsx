import { useState, useEffect } from 'react'
import { Stage, Layer, Rect, Text, Group } from 'react-konva'
import { ArrowLeft, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { playClickSound } from '../../../lib/audio'
import { supabase } from '../../../lib/supabase'
import { useAppStore } from '../../../store/useAppStore'
import { t } from '../../../lib/i18n'
import { playPremiumVoice } from '../../../lib/tts'

const ALL_EMOJIS = ['🪘', '🐘', '🦏', '☕', '🍛', '🎋', '🐅', '🚣', '🌸', '🌞', '🥥', '🥭', '🦚', '🛕', '🪔', '🪁', '🕌', '👳']

interface Card {
  id: number
  emoji: string
  isFlipped: boolean
  isMatched: boolean
}

const MEMORY_MATCH_LEVELS = [
  { level: 1, pairs: 2, cols: 2 },
  { level: 2, pairs: 3, cols: 3 },
  { level: 3, pairs: 4, cols: 4 },
  { level: 4, pairs: 5, cols: 5 },
  { level: 5, pairs: 6, cols: 4 },
  { level: 6, pairs: 6, cols: 4 },
  { level: 7, pairs: 8, cols: 4 },
  { level: 8, pairs: 8, cols: 4 },
  { level: 9, pairs: 10, cols: 5 },
  { level: 10, pairs: 10, cols: 5 },
  { level: 11, pairs: 12, cols: 6 },
  { level: 12, pairs: 12, cols: 6 },
  { level: 13, pairs: 15, cols: 6 },
  { level: 14, pairs: 15, cols: 6 },
  { level: 15, pairs: 18, cols: 6 },
  { level: 16, pairs: 18, cols: 6 },
  { level: 17, pairs: 18, cols: 6 },
  { level: 18, pairs: 18, cols: 6 },
  { level: 19, pairs: 18, cols: 6 },
  { level: 20, pairs: 18, cols: 6 },
  { level: 21, pairs: 18, cols: 6 },
  { level: 22, pairs: 18, cols: 6 },
  { level: 23, pairs: 18, cols: 6 },
  { level: 24, pairs: 18, cols: 6 },
  { level: 25, pairs: 18, cols: 6 },
]

export default function MemoryMatch() {
  const { language } = useAppStore()
  
  const [currentLevel, setCurrentLevel] = useState(0)
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(0)
  const [cards, setCards] = useState<Card[]>([])
  const [flippedIndices, setFlippedIndices] = useState<number[]>([])
  const [matches, setMatches] = useState(0)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [gameSaved, setGameSaved] = useState(false)
  const [levelConfig, setLevelConfig] = useState(MEMORY_MATCH_LEVELS[0])

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('game_progress')
            .select('highest_level')
            .eq('user_id', user.id)
            .eq('game_id', 'memory-match')
            .maybeSingle()
          
          if (data && data.highest_level) {
            const maxLevel = Math.min(data.highest_level - 1, 24)
            setMaxUnlockedLevel(maxLevel)
            setCurrentLevel(maxLevel)
          }
        }
      } catch (err) {
        console.error('Error fetching progress:', err)
      }
    }
    fetchProgress()
    
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setLevelConfig(MEMORY_MATCH_LEVELS[currentLevel])
  }, [currentLevel])

  const initializeGame = () => {
    const config = MEMORY_MATCH_LEVELS[currentLevel]
    
    // Select subset of emojis for this level
    const levelEmojis = ALL_EMOJIS.slice(0, config.pairs)
    
    const deck = [...levelEmojis, ...levelEmojis]
      .sort(() => Math.random() - 0.5)
      .map((emoji, idx) => ({
        id: idx,
        emoji,
        isFlipped: false,
        isMatched: false,
      }))
    
    setCards(deck)
    setFlippedIndices([])
    setMatches(0)
    setStartTime(Date.now())
    setGameSaved(false)
  }

  useEffect(() => {
    if (levelConfig) {
      initializeGame()
    }
  }, [levelConfig]) // Re-initialize when level config changes

  const handleGameComplete = async () => {
    if (!startTime || isSaving || gameSaved) return
    setIsSaving(true)
    
    // Announce completion
    playPremiumVoice(t('Well Done!', language), language)
    
    try {
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000)
      const score = Math.max(0, 100 - (durationSeconds * 0.5))
      
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        let gameId = 'memory-match';

        // 1. Save Session to game_sessions (if it exists)
        const payload = {
          patient_id: userData.user.id,
          game_id: gameId,
          score: score,
          duration_seconds: durationSeconds
        };
          
        if (navigator.onLine) {
          try {
            await supabase.from('game_sessions').insert(payload)
          } catch (e) {
            console.error('game_sessions insert failed', e)
          }
          
          // 2. Update Progress in game_progress
          const nextLevel = Math.min(currentLevel + 1, 24)
          const newMaxLevel = Math.max(maxUnlockedLevel, nextLevel)
          
          try {
            // First fetch existing to calculate totals
            const { data: existingProgress } = await supabase
              .from('game_progress')
              .select('*')
              .eq('user_id', userData.user.id)
              .eq('game_id', gameId)
              .maybeSingle()
              
            const progressPayload = {
              user_id: userData.user.id,
              game_id: gameId,
              highest_level: newMaxLevel + 1,
              total_games_played: (existingProgress?.total_games_played || 0) + 1,
              total_score: (existingProgress?.total_score || 0) + score,
              updated_at: new Date().toISOString()
            }
            
            await supabase.from('game_progress').upsert(progressPayload, { onConflict: 'user_id,game_id' })
            
            if (newMaxLevel > maxUnlockedLevel) {
              setMaxUnlockedLevel(newMaxLevel)
            }
          } catch (e) {
            console.error('game_progress upsert failed', e)
          }
        }
      }
      
      setGameSaved(true)
      
      // Advance level internally
      if (currentLevel < 24) {
        setCurrentLevel(currentLevel + 1)
      }
    } catch (error) {
      console.error("Error saving game session:", error)
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (matches > 0 && matches === levelConfig.pairs && !isSaving && !gameSaved) {
      handleGameComplete()
    }
  }, [matches, isSaving, gameSaved, levelConfig])

  const handleCardClick = (index: number) => {
    playClickSound()
    if (cards[index].isFlipped || cards[index].isMatched || flippedIndices.length === 2) {
      return
    }

    const newFlipped = [...flippedIndices, index]
    setFlippedIndices(newFlipped)

    const newCards = [...cards]
    newCards[index].isFlipped = true
    setCards(newCards)

    if (newFlipped.length === 2) {
      const [firstIdx, secondIdx] = newFlipped
      
      if (newCards[firstIdx].emoji === newCards[secondIdx].emoji) {
        setTimeout(() => {
          const matchedCards = [...newCards]
          matchedCards[firstIdx].isMatched = true
          matchedCards[secondIdx].isMatched = true
          setCards(matchedCards)
          setFlippedIndices([])
          setMatches(m => m + 1)
        }, 500)
      } else {
        setTimeout(() => {
          const resetCards = [...newCards]
          resetCards[firstIdx].isFlipped = false
          resetCards[secondIdx].isFlipped = false
          setCards(resetCards)
          setFlippedIndices([])
        }, 1000)
      }
    }
  }

  const padding = 20
  const maxStageWidth = Math.min(windowWidth - padding * 2, 500)
  const cols = levelConfig.cols
  const rows = Math.ceil((levelConfig.pairs * 2) / cols)
  
  // Calculate card size so it fits horizontally
  const cardSize = (maxStageWidth - (cols - 1) * 10) / cols
  // Calculate required height based on rows
  const stageHeight = (cardSize * rows) + ((rows - 1) * 10) + 10

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
        <Link to="/patient/games" className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors text-primary">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex flex-col items-center">
          <h1 className="text-xl font-bold text-primary">{t('Memory Match', language)}</h1>
          <div className="flex items-center gap-2 mt-1">
            <button 
              disabled={currentLevel === 0}
              onClick={() => setCurrentLevel(l => l - 1)}
              className="p-1 rounded-full text-primary-hover hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-bold bg-accent text-primary-hover px-2 py-0.5 rounded-full min-w-[70px] text-center">
              Level {currentLevel + 1}/25
            </span>
            <button 
              disabled={currentLevel >= maxUnlockedLevel}
              onClick={() => setCurrentLevel(l => l + 1)}
              className="p-1 rounded-full text-primary-hover hover:bg-gray-100 disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <button onClick={initializeGame} className="p-2 text-primary hover:bg-gray-100 rounded-full transition-colors">
          <RefreshCcw size={24} />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {matches > 0 && matches === levelConfig.pairs ? (
          <div className="text-center bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-sm w-full animate-in zoom-in duration-500">
            <h2 className="text-4xl font-bold text-primary mb-4">{t('Well Done!', language)} 🎉</h2>
            <p className="text-lg text-gray-600 mb-2">{t('You found all the matches.', language)}</p>
            {isSaving ? (
              <p className="text-sm text-gray-400 mb-8 italic">{t('Saving progress...', language)}</p>
            ) : gameSaved ? (
              <p className="text-sm text-green-600 font-bold mb-8 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                {t('Progress Saved', language)}
              </p>
            ) : (
              <div className="mb-8"></div>
            )}
            <button 
              onClick={initializeGame}
              className="w-full bg-primary-hover text-white px-8 py-4 rounded-full text-xl font-bold hover:bg-primary-hover transition-colors shadow-md active:scale-[0.98]"
            >
              {currentLevel < 24 ? t('Next Level', language) : t('Play Again', language)}
            </button>
            <Link to="/patient/games" className="block mt-4 text-primary font-bold hover:underline">
              {t('Back to Games', language)}
            </Link>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="text-center mb-6 text-xl font-bold text-primary bg-white px-6 py-2 rounded-full shadow-sm border border-gray-100">
              {t('Matches', language)}: {matches} / {levelConfig.pairs}
            </div>
            
            <div className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm bg-white p-2">
              <Stage width={maxStageWidth} height={stageHeight}>
                <Layer>
                  {cards.map((card, i) => {
                    const col = i % cols
                    const row = Math.floor(i / cols)
                    const x = col * (cardSize + 10) + 5
                    const y = row * (cardSize + 10) + 5

                    return (
                      <Group key={card.id}>
                        {/* Background Rect */}
                        <Rect
                          x={x}
                          y={y}
                          width={cardSize}
                          height={cardSize}
                          fill={card.isMatched ? '#E1F4EA' : card.isFlipped ? '#FDFDF9' : '#144533'}
                          stroke={card.isFlipped || card.isMatched ? '#E2E8F0' : undefined}
                          strokeWidth={2}
                          cornerRadius={8}
                          shadowColor={!card.isMatched ? "rgba(0,0,0,0.15)" : "transparent"}
                          shadowBlur={card.isFlipped ? 8 : 4}
                          shadowOffset={!card.isMatched ? { x: 0, y: 2 } : { x: 0, y: 0 }}
                          onClick={() => handleCardClick(i)}
                          onTap={() => handleCardClick(i)}
                        />
                        {/* Emoji Text */}
                        {(card.isFlipped || card.isMatched) && (
                          <Text
                            x={x}
                            y={y}
                            width={cardSize}
                            height={cardSize}
                            text={card.emoji}
                            fontSize={cardSize * 0.5}
                            align="center"
                            verticalAlign="middle"
                            listening={false}
                            opacity={card.isMatched ? 0.5 : 1}
                          />
                        )}
                      </Group>
                    )
                  })}
                </Layer>
              </Stage>
            </div>
            <p className="mt-8 text-center text-gray-500 dark:text-gray-300 font-medium max-w-xs">
              {t('Tap any two cards to reveal them and find matching pairs.', language)}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
