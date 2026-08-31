import { useState, useEffect } from 'react'
import { Stage, Layer, Rect, Text, Group } from 'react-konva'
import { ArrowLeft, RefreshCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'

const EMOJIS = ['🪘', '🐘', '🦏', '☕', '🍛', '🎋', '🐅', '🚣']

interface Card {
  id: number
  emoji: string
  isFlipped: boolean
  isMatched: boolean
}

export default function MemoryMatch() {
  const [cards, setCards] = useState<Card[]>([])
  const [flippedIndices, setFlippedIndices] = useState<number[]>([])
  const [matches, setMatches] = useState(0)
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [gameSaved, setGameSaved] = useState(false)

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const initializeGame = () => {
    // Basic 4x4 grid (8 pairs)
    const deck = [...EMOJIS, ...EMOJIS]
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
    initializeGame()
  }, [])

  const handleGameComplete = async () => {
    if (!startTime || isSaving || gameSaved) return
    setIsSaving(true)
    
    try {
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000)
      const score = Math.max(0, 100 - (durationSeconds * 0.5)) // Simple score calculation
      
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error("Not logged in")
      
      // Get Game ID (assume known for offline, or fetch if online)
      let gameId = 'memory-match-uuid-placeholder';
      if (navigator.onLine) {
        const { data: gameData } = await supabase
          .from('games')
          .select('id')
          .eq('slug', 'memory-match')
          .single()
        if (gameData) gameId = gameData.id;
      }

      const payload = {
        patient_id: userData.user.id,
        game_id: gameId,
        difficulty_level: 2,
        score: score,
        questions_attempted: 8,
        questions_correct: 8,
        hints_used: 0,
        duration_seconds: durationSeconds,
        completed: true
      };
        
      if (navigator.onLine) {
        await supabase.from('game_sessions').insert(payload)
      } else {
        // Save to offline sync queue
        const { db } = await import('../../../lib/db');
        await db.sync_queue.add({
          table_name: 'game_sessions',
          operation: 'INSERT',
          payload: payload,
          created_at: new Date().toISOString(),
          status: 'pending'
        });
        console.log("Saved offline to sync queue");
      }
      
      setGameSaved(true)
    } catch (error) {
      console.error("Error saving game session:", error)
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (matches === EMOJIS.length && !isSaving && !gameSaved) {
      handleGameComplete()
    }
  }, [matches, isSaving, gameSaved])

  const handleCardClick = (index: number) => {
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
        // Match!
        setTimeout(() => {
          const matchedCards = [...newCards]
          matchedCards[firstIdx].isMatched = true
          matchedCards[secondIdx].isMatched = true
          setCards(matchedCards)
          setFlippedIndices([])
          setMatches(m => m + 1)
        }, 500)
      } else {
        // No match
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

  // Calculate canvas size
  const padding = 20
  const maxStageWidth = Math.min(windowWidth - padding * 2, 500)
  const cols = 4
  const cardSize = (maxStageWidth - (cols - 1) * 10) / cols

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDF9]">
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
        <Link to="/patient/games" className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors text-[#144533]">
          <ArrowLeft size={24} />
        </Link>
        <h1 className="text-2xl font-bold text-[#144533]">Memory Match</h1>
        <button onClick={initializeGame} className="p-2 text-[#144533] hover:bg-gray-100 rounded-full transition-colors">
          <RefreshCcw size={24} />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {matches === EMOJIS.length ? (
          <div className="text-center bg-white p-8 rounded-3xl shadow-sm border border-gray-100 max-w-sm w-full animate-in zoom-in duration-500">
            <h2 className="text-4xl font-bold text-[#144533] mb-4">Well Done! 🎉</h2>
            <p className="text-lg text-gray-600 mb-2">You found all the matches.</p>
            {isSaving ? (
              <p className="text-sm text-gray-400 mb-8 italic">Saving progress...</p>
            ) : gameSaved ? (
              <p className="text-sm text-green-600 font-bold mb-8 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
                Progress Saved
              </p>
            ) : (
              <div className="mb-8"></div>
            )}
            <button 
              onClick={initializeGame}
              className="w-full bg-[#1B4D3E] text-white px-8 py-4 rounded-full text-xl font-bold hover:bg-[#13382D] transition-colors shadow-md active:scale-[0.98]"
            >
              Play Again
            </button>
            <Link to="/patient/games" className="block mt-4 text-[#144533] font-bold hover:underline">
              Back to Games
            </Link>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="text-center mb-6 text-xl font-bold text-[#144533] bg-white px-6 py-2 rounded-full shadow-sm border border-gray-100">
              Matches: {matches} / {EMOJIS.length}
            </div>
            
            <div className="border border-gray-100 rounded-3xl overflow-hidden shadow-sm bg-white p-2">
              <Stage width={maxStageWidth} height={maxStageWidth + 10}>
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
                          cornerRadius={16}
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
            <p className="mt-8 text-center text-gray-500 font-medium max-w-xs">
              Tap any two cards to reveal them and find matching pairs.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
