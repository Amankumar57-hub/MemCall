import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Trophy, Volume2, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { playClickSound } from '../../../lib/audio'
import { useAppStore } from '../../../store/useAppStore'
import { t } from '../../../lib/i18n'
import { playPremiumVoice } from '../../../lib/tts'

const SOUNDS = [
  { url: '/sounds/Dog.mp3', trueAnswer: 'Dog' },
  { url: '/sounds/Alarm.mp3', trueAnswer: 'Alarm' },
  { url: '/sounds/Rain.mp3', trueAnswer: 'Rain' },
  { url: '/sounds/Cat.mp3', trueAnswer: 'Cat' },
  { url: '/sounds/Bird.mp3', trueAnswer: 'Bird' },
  { url: '/sounds/Train.mp3', trueAnswer: 'Train' },
  { url: '/sounds/Car_Horn.mp3', trueAnswer: 'Car Horn' },
  { url: '/sounds/Water_Drop.mp3', trueAnswer: 'Water Drop' },
  { url: '/sounds/Keyboard.mp3', trueAnswer: 'Keyboard' },
  { url: '/sounds/Footsteps.mp3', trueAnswer: 'Footsteps' },
  { url: '/sounds/Wind.mp3', trueAnswer: 'Wind' },
  { url: '/sounds/Thunder.mp3', trueAnswer: 'Thunder' },
  { url: '/sounds/Applause.mp3', trueAnswer: 'Applause' },
  { url: '/sounds/Laughing.mp3', trueAnswer: 'Laughing' },
  { url: '/sounds/Cow.mp3', trueAnswer: 'Cow' }
];

const POOL = ['Dog', 'Cat', 'Bird', 'Cow', 'Lion', 'Elephant', 'Alarm', 'Phone', 'Doorbell', 'Microwave', 'Rain', 'River', 'Wind', 'Fire', 'Train', 'Car Horn', 'Bicycle Bell', 'Airplane', 'Water Drop', 'Ocean', 'Keyboard', 'Mouse Click', 'Writing', 'Footsteps', 'Running', 'Thunder', 'Storm', 'Applause', 'Cheering', 'Laughing', 'Crying', 'Baby Crying', 'Talking'];

const shuffle = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

const generateSoundLevels = () => {
  const levels = [];
  // Create a pool of 25 sounds by duplicating and shuffling
  const pool = [...SOUNDS, ...SOUNDS].slice(0, 25);
  const shuffledPool = shuffle(pool);
  
  for (let i = 0; i < 25; i++) {
    const soundObj = shuffledPool[i];
    
    // Pick 3 random false options
    let falseOptions = POOL.filter(o => o !== soundObj.trueAnswer);
    falseOptions = shuffle(falseOptions).slice(0, 3);
    
    const options = shuffle([soundObj.trueAnswer, ...falseOptions]);
    
    levels.push({
      id: i + 1,
      soundUrl: soundObj.url,
      answer: soundObj.trueAnswer,
      options
    });
  }
  return levels;
};

const LEVELS = generateSoundLevels();

export default function SoundRecognition() {
  const { language } = useAppStore()
  const navigate = useNavigate()
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentLevel, setCurrentLevel] = useState(0)
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(0)
  const [score, setScore] = useState(0)
  const [gameFinished, setGameFinished] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [feedback, setFeedback] = useState<'correct'|'incorrect'|null>(null)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('game_progress')
            .select('highest_level')
            .eq('user_id', user.id)
            .eq('game_id', 'sound-recognition')
            .maybeSingle()
          
          if (data && data.highest_level) {
            const maxLevel = Math.min(data.highest_level - 1, 24)
            setMaxUnlockedLevel(maxLevel)
            setCurrentLevel(maxLevel)
          } else {
            const localMax = localStorage.getItem(`max_level_${user.id}`)
            if (localMax) {
              const maxLvl = parseInt(localMax, 10) - 1
              setMaxUnlockedLevel(maxLvl)
              setCurrentLevel(maxLvl)
            }
          }
        }
      } catch (error) {
        // Handle fetch errors (e.g. table missing) gracefully
        console.error('Failed to fetch game_progress', error)
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            const localMax = localStorage.getItem(`max_level_${user.id}`)
            if (localMax) {
              const maxLvl = parseInt(localMax, 10) - 1
              setMaxUnlockedLevel(maxLvl)
              setCurrentLevel(maxLvl)
            }
          }
        })
      }
    }
    fetchProgress()

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const startGame = () => {
    setIsPlaying(true)
    setGameFinished(false)
    setStartTime(Date.now())
  }



  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    const audio = new Audio(LEVELS[currentLevel].soundUrl)
    audioRef.current = audio
    audio.play().catch(e => console.log("Audio play failed, might need interaction:", e))
  }

  const handleOptionSelect = async (option: string) => {
    if (feedback !== null || isSaving) return // prevent double click
    setIsSaving(true)
    
    // Stop the currently playing sound
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    
    playClickSound()
    
    const isCorrect = option === LEVELS[currentLevel].answer
    setFeedback(isCorrect ? 'correct' : 'incorrect')
    
    if (isCorrect) {
      playPremiumVoice(t('Congrats, you are right!', language), language)
    }
    
    let currentScore = score
    if (isCorrect) {
      currentScore += 10
      setScore(currentScore)
    }

    try {
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000)
      const { data: userData } = await supabase.auth.getUser()
      
      if (userData.user) {
        let gameId = 'sound-recognition';

        // 1. Save Session
        const payload = {
          patient_id: userData.user.id,
          game_id: gameId,
          score: isCorrect ? 10 : 0,
          duration_seconds: durationSeconds
        }

        if (navigator.onLine) {
          try {
            await supabase.from('game_sessions').insert(payload)
          } catch (e) {
            console.error('game_sessions insert failed', e)
          }

          // 2. Update Progress
          const nextLevel = Math.min(currentLevel + 1, 24)
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
              total_score: (existingProgress?.total_score || 0) + (isCorrect ? 10 : 0),
              updated_at: new Date().toISOString()
            }
            
            await supabase.from('game_progress').upsert(progressPayload, { onConflict: 'user_id,game_id' })
          } catch (e) {
            console.error('game_progress upsert failed', e)
          }

          // Always set local storage as fallback for missing table
          if (newMaxLevel > maxUnlockedLevel) {
            setMaxUnlockedLevel(newMaxLevel)
            const globalMax = parseInt(localStorage.getItem(`max_level_${userData.user.id}`) || '0', 10)
            if (newMaxLevel + 1 > globalMax) {
              localStorage.setItem(`max_level_${userData.user.id}`, (newMaxLevel + 1).toString())
            }
          }
        }
      }
      
      setTimeout(() => {
        setFeedback(null)
        setIsSaving(false)
        if (currentLevel < LEVELS.length - 1) {
          setCurrentLevel(currentLevel + 1)
          setStartTime(Date.now()) // reset timer for next level
        } else {
          handleGameComplete()
        }
      }, 1500)
      
    } catch (error) {
      console.error('Error saving session:', error)
      setIsSaving(false)
    }
  }

  const handleGameComplete = () => {
    setGameFinished(true)
    setIsPlaying(false)
    playPremiumVoice(t('Great Job!', language), language)
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/patient/games" className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors text-primary">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold text-primary">{t('Sound Recognition', language)}</h1>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-2xl mx-auto w-full flex flex-col">
        {!isPlaying && !gameFinished ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm text-center flex-1 flex flex-col justify-center items-center">
            <div className="w-24 h-24 bg-accent text-primary-hover rounded-full flex items-center justify-center mb-6">
              <Volume2 size={48} />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">{t('Sound Recognition', language)}</h2>
            <p className="text-gray-500 dark:text-gray-300 max-w-md mx-auto mb-8 text-lg leading-relaxed">
              {t('Listen to the sound and choose the correct answer. This helps improve auditory processing.', language)}
            </p>
            <button 
              onClick={startGame}
              className="bg-primary-hover text-white px-10 py-4 rounded-full font-bold text-xl hover:bg-primary-hover transition-transform active:scale-95 shadow-md">
              {currentLevel > 0 ? t('Continue Game', language) : t('Start Game', language)}
            </button>
          </div>
        ) : gameFinished ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm text-center flex-1 flex flex-col justify-center items-center animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center mb-6">
              <Trophy size={48} />
            </div>
            <h2 className="text-4xl font-bold text-gray-800 mb-2">{t('Great Job!', language)}</h2>
            <p className="text-gray-500 dark:text-gray-300 text-lg mb-8">{t('You completed the sound challenge.', language)}</p>
            
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
                  onClick={() => { setCurrentLevel(l => l - 1); setStartTime(Date.now()); if(audioRef.current) audioRef.current.pause(); }}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="bg-gray-100 px-4 py-2 rounded-full font-bold text-gray-600 text-sm min-w-[100px] text-center">
                  {t('Level', language)} {currentLevel + 1} of {LEVELS.length}
                </span>
                <button 
                  disabled={currentLevel >= maxUnlockedLevel}
                  onClick={() => { setCurrentLevel(l => l + 1); setStartTime(Date.now()); if(audioRef.current) audioRef.current.pause(); }}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <span className="font-bold text-primary-hover">
                {t('Score', language)}: {score}
              </span>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center mb-8">
              <button 
                onClick={playSound}
                className="w-32 h-32 bg-accent text-primary-hover rounded-full flex items-center justify-center hover:bg-[#c9f0db] transition-colors shadow-inner active:scale-95 border-4 border-white ring-4 ring-gray-50 mb-6"
              >
                <Play size={48} className="ml-2" />
              </button>
              <p className="text-gray-500 dark:text-gray-300 font-medium">{t('Tap to hear sound', language)}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-auto">
              {LEVELS[currentLevel].options.map((option, index) => {
                let btnStyle = "bg-background border-2 border-gray-200 text-gray-700 hover:border-[#1B4D3E] hover:text-primary-hover"
                
                if (feedback) {
                  if (option === LEVELS[currentLevel].answer) {
                    btnStyle = "bg-green-100 border-2 border-green-500 text-green-700 font-bold"
                  } else if (feedback === 'incorrect' && option !== LEVELS[currentLevel].answer) {
                    btnStyle = "bg-red-50 border-2 border-red-200 text-red-400 opacity-50"
                  }
                }
                
                return (
                  <button
                    key={index}
                    onClick={() => handleOptionSelect(option)}
                    disabled={feedback !== null}
                    className={`py-4 rounded-2xl text-lg font-bold transition-all ${btnStyle} active:scale-95 shadow-sm`}
                  >
                    {t(option, language) || option}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
