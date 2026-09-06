import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Trophy, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { playClickSound } from '../../../lib/audio'
import { useAppStore } from '../../../store/useAppStore'
import { t } from '../../../lib/i18n'
import { playPremiumVoice } from '../../../lib/tts'

// Generate 25 levels dynamically
const generateLevels = () => {
  const levels = [];
  for (let i = 0; i < 25; i++) {
    const isStar = i % 2 !== 0;
    const pointsCount = isStar ? Math.floor(i / 2) + 5 : Math.floor(i / 2) + 3;
    const points = [];
    const centerX = 50;
    const centerY = 50;
    const outerRadius = 40;
    const innerRadius = 20;

    for (let p = 0; p < (isStar ? pointsCount * 2 : pointsCount); p++) {
      const angle = (p * Math.PI * 2) / (isStar ? pointsCount * 2 : pointsCount) - Math.PI / 2;
      const radius = (isStar && p % 2 !== 0) ? innerRadius : outerRadius;
      points.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      });
    }

    let name = '';
    if (!isStar) {
      if (pointsCount === 3) name = 'Triangle';
      else if (pointsCount === 4) name = 'Square';
      else if (pointsCount === 5) name = 'Pentagon';
      else if (pointsCount === 6) name = 'Hexagon';
      else name = `Polygon (${pointsCount})`;
    } else {
      name = `Star (${pointsCount})`;
    }

    levels.push({
      id: i + 1,
      name,
      points
    });
  }
  return levels;
};

const LEVELS = generateLevels();

export default function ShapeTracer() {
  const { language } = useAppStore()
  const navigate = useNavigate()
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(0)
  const [pointsClicked, setPointsClicked] = useState<number[]>([])
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [gameFinished, setGameFinished] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(0)

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('game_progress')
            .select('highest_level')
            .eq('user_id', user.id)
            .eq('game_id', 'shape-tracer')
            .maybeSingle()
          
          if (data && data.highest_level) {
            const maxLevel = Math.min(data.highest_level - 1, LEVELS.length - 1)
            setMaxUnlockedLevel(maxLevel)
            setCurrentLevel(maxLevel)
          }
        }
      } catch (err) {
        console.error('Error fetching progress:', err)
      }
    }
    fetchProgress()
  }, [])

  const startGame = () => {
    setIsPlaying(true)
    setPointsClicked([])
    setGameFinished(false)
    setStartTime(Date.now())
  }

  const handlePointClick = (index: number) => {
    if (index === pointsClicked.length) {
      playClickSound()
      const newClicked = [...pointsClicked, index]
      setPointsClicked(newClicked)
      
      // If we clicked all points
      if (newClicked.length === LEVELS[currentLevel].points.length) {
        handleLevelComplete()
      }
    }
  }

  const handleLevelComplete = async () => {
    if (!startTime || isSaving) return
    setIsSaving(true)
    
    try {
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000)
      const levelScore = Math.max(0, 100 - durationSeconds)
      setScore(s => s + levelScore)
      
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        let gameId = 'shape-tracer'

        // 1. Save Session
        const payload = {
          patient_id: userData.user.id,
          game_id: gameId,
          score: levelScore,
          duration_seconds: durationSeconds
        }

        if (navigator.onLine) {
          try {
            await supabase.from('game_sessions').insert(payload)
          } catch (e) {
            console.error('game_sessions insert failed', e)
          }

          // 2. Update Progress
          const nextLevel = Math.min(currentLevel + 1, LEVELS.length - 1)
          const newMaxLevel = Math.max(maxUnlockedLevel, nextLevel)
          
          try {
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
              total_score: (existingProgress?.total_score || 0) + levelScore,
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
      
      setTimeout(() => {
        if (currentLevel < LEVELS.length - 1) {
          setCurrentLevel(currentLevel + 1)
          setPointsClicked([])
          setStartTime(Date.now()) // Reset timer for next level
          setIsSaving(false)
        } else {
          handleGameComplete()
        }
      }, 1000)
    } catch (error) {
      console.error('Error saving session:', error)
      setIsSaving(false)
    }
  }

  const handleGameComplete = () => {
    setGameFinished(true)
    setIsPlaying(false)
    setIsSaving(false)
    playPremiumVoice(t('Great Job!', language), language)
  }

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setMousePos({ x, y })
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/patient/games" className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors text-primary">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold text-primary">{t('Shape Tracer', language)}</h1>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-2xl mx-auto w-full flex flex-col">
        {!isPlaying && !gameFinished ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm text-center flex-1 flex flex-col justify-center items-center">
            <div className="w-24 h-24 bg-accent text-primary-hover rounded-full flex items-center justify-center mb-6">
              <Play size={48} className="ml-2" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">{t('Shape Tracer', language)}</h2>
            <p className="text-gray-500 dark:text-gray-300 max-w-md mx-auto mb-8 text-lg leading-relaxed">
              {t('Connect the dots in order to trace the hidden shape. Improves motor skills and spatial memory.', language)}
            </p>
            <button 
              onClick={startGame}
              className="bg-primary-hover text-white px-10 py-4 rounded-full font-bold text-xl hover:bg-primary-hover transition-transform active:scale-95 shadow-md">
              {currentLevel > 0 ? t('Continue Game', language) : t('Start Game', language)}
            </button>
          </div>
        ) : gameFinished ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm text-center flex-1 flex flex-col justify-center items-center">
            <div className="w-24 h-24 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center mb-6">
              <Trophy size={48} />
            </div>
            <h2 className="text-4xl font-bold text-gray-800 mb-2">{t('Great Job!', language)}</h2>
            <p className="text-gray-500 dark:text-gray-300 text-lg mb-8">{t('You traced all shapes perfectly.', language)}</p>
            
            <div className="bg-background rounded-2xl p-6 mb-8 w-full max-w-xs border border-gray-100 shadow-inner">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">{t('Your Score', language)}</p>
              <p className="text-5xl font-black text-primary-hover">{score}</p>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={startGame}
                className="bg-primary-hover text-white px-8 py-3 rounded-full font-bold hover:bg-primary-hover transition-transform active:scale-95 shadow-sm">
                {t('Play Again', language)}
              </button>
              <button 
                onClick={() => navigate('/patient/games')}
                className="bg-gray-100 text-gray-700 px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-transform active:scale-95 shadow-sm">
                {t('Done', language)}
              </button>
            </div>
            {isSaving && <p className="text-sm text-gray-400 mt-4 flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> {t('Saving score...', language)}</p>}
          </div>
        ) : (
          <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col flex-1 relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-2">
                <button 
                  disabled={currentLevel === 0}
                  onClick={() => { setCurrentLevel(l => l - 1); setPointsClicked([]); setStartTime(Date.now()); }}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="bg-gray-100 px-4 py-2 rounded-full font-bold text-gray-600 text-sm min-w-[100px] text-center">
                  Level {currentLevel + 1} of {LEVELS.length}
                </span>
                <button 
                  disabled={currentLevel >= maxUnlockedLevel}
                  onClick={() => { setCurrentLevel(l => l + 1); setPointsClicked([]); setStartTime(Date.now()); }}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <span className="font-bold text-primary-hover">
                {LEVELS[currentLevel].name}
              </span>
            </div>
            
            <div className="flex-1 w-full bg-background rounded-2xl border-2 border-dashed border-gray-200 relative p-4 flex items-center justify-center">
              <svg 
                viewBox="0 0 100 100" 
                className="w-full h-full max-h-[60vh] touch-none"
                onMouseMove={handleMouseMove}
                onTouchMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  const touch = e.touches[0]
                  const x = ((touch.clientX - rect.left) / rect.width) * 100
                  const y = ((touch.clientY - rect.top) / rect.height) * 100
                  setMousePos({ x, y })
                }}
              >
                {/* Lines between clicked points */}
                {pointsClicked.map((pointIndex, i) => {
                  if (i === 0) return null
                  const prev = LEVELS[currentLevel].points[pointsClicked[i-1]]
                  const curr = LEVELS[currentLevel].points[pointIndex]
                  return (
                    <line 
                      key={`line-${i}`}
                      x1={prev.x} y1={prev.y} 
                      x2={curr.x} y2={curr.y} 
                      stroke="#1B4D3E" 
                      strokeWidth="2" 
                      strokeLinecap="round"
                      className="animate-in fade-in duration-300"
                    />
                  )
                })}
                
                {/* Line from last clicked point to mouse/touch (for visual feedback) */}
                {pointsClicked.length > 0 && pointsClicked.length < LEVELS[currentLevel].points.length && (
                  <line 
                    x1={LEVELS[currentLevel].points[pointsClicked[pointsClicked.length-1]].x} 
                    y1={LEVELS[currentLevel].points[pointsClicked[pointsClicked.length-1]].y} 
                    x2={mousePos.x} y2={mousePos.y} 
                    stroke="#1B4D3E" 
                    strokeWidth="1" 
                    strokeDasharray="2 2"
                    opacity="0.5"
                  />
                )}
                
                {/* Closing line when completed */}
                {pointsClicked.length === LEVELS[currentLevel].points.length && (
                  <line 
                    x1={LEVELS[currentLevel].points[pointsClicked[pointsClicked.length-1]].x} 
                    y1={LEVELS[currentLevel].points[pointsClicked[pointsClicked.length-1]].y} 
                    x2={LEVELS[currentLevel].points[0].x} 
                    y2={LEVELS[currentLevel].points[0].y} 
                    stroke="#1B4D3E" 
                    strokeWidth="2" 
                    strokeLinecap="round"
                    className="animate-in fade-in duration-300"
                  />
                )}

                {/* The Points */}
                {LEVELS[currentLevel].points.map((point, i) => {
                  const isClicked = pointsClicked.includes(i)
                  const isNext = pointsClicked.length === i
                  
                  return (
                    <g 
                      key={i} 
                      transform={`translate(${point.x}, ${point.y})`}
                      onClick={() => handlePointClick(i)}
                      onTouchStart={() => handlePointClick(i)}
                      className="cursor-pointer"
                    >
                      {/* Outer target area (invisible but larger for easy tapping) */}
                      <circle r="8" fill="transparent" />
                      
                      {/* Visible point */}
                      <circle 
                        r="3" 
                        fill={isClicked ? '#1B4D3E' : isNext ? '#34D399' : '#D1D5DB'} 
                        className="transition-colors duration-300"
                      />
                      
                      {/* Numbers */}
                      <text 
                        y="-5" 
                        textAnchor="middle" 
                        className={`text-[4px] font-bold ${isClicked ? 'fill-[#1B4D3E]' : 'fill-gray-400'}`}
                      >
                        {i + 1}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
            
            <div className="mt-6 text-center text-gray-500 dark:text-gray-300 font-medium">
              Tap the dots in numerical order.
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
