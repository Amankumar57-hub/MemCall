import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Play, Trophy, Volume2, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { playClickSound } from '../../../lib/audio'
import { useAppStore } from '../../../store/useAppStore'
import { t } from '../../../lib/i18n'
import { playPremiumVoice } from '../../../lib/tts'

const SOUNDS = [
  { url: 'https://actions.google.com/sounds/v1/animals/dog_barking.ogg', trueAnswer: 'Dog' },
  { url: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg', trueAnswer: 'Alarm' },
  { url: 'https://actions.google.com/sounds/v1/water/rain_on_roof.ogg', trueAnswer: 'Rain' },
  { url: 'https://actions.google.com/sounds/v1/animals/cat_purring.ogg', trueAnswer: 'Cat' },
  { url: 'https://actions.google.com/sounds/v1/birds/bird_chirp.ogg', trueAnswer: 'Bird' },
  { url: 'https://actions.google.com/sounds/v1/transportation/train_pass_by.ogg', trueAnswer: 'Train' },
  { url: 'https://actions.google.com/sounds/v1/transportation/car_horn.ogg', trueAnswer: 'Car Horn' },
  { url: 'https://actions.google.com/sounds/v1/water/water_drop.ogg', trueAnswer: 'Water Drop' },
  { url: 'https://actions.google.com/sounds/v1/foley/typing_on_keyboard.ogg', trueAnswer: 'Keyboard' },
  { url: 'https://actions.google.com/sounds/v1/foley/footsteps_on_wood.ogg', trueAnswer: 'Footsteps' },
  { url: 'https://actions.google.com/sounds/v1/weather/wind_blowing.ogg', trueAnswer: 'Wind' },
  { url: 'https://actions.google.com/sounds/v1/weather/thunder_crack.ogg', trueAnswer: 'Thunder' },
  { url: 'https://actions.google.com/sounds/v1/crowds/applause.ogg', trueAnswer: 'Applause' },
  { url: 'https://actions.google.com/sounds/v1/human_voices/laughing.ogg', trueAnswer: 'Laughing' },
  { url: 'https://actions.google.com/sounds/v1/human_voices/baby_crying.ogg', trueAnswer: 'Baby Crying' }
];

const POOL = ['Dog', 'Cat', 'Bird', 'Cow', 'Lion', 'Elephant', 'Alarm', 'Phone', 'Doorbell', 'Microwave', 'Rain', 'River', 'Wind', 'Fire', 'Train', 'Car Horn', 'Bicycle Bell', 'Airplane', 'Water Drop', 'Ocean', 'Keyboard', 'Mouse Click', 'Writing', 'Footsteps', 'Running', 'Thunder', 'Storm', 'Applause', 'Cheering', 'Laughing', 'Crying', 'Baby Crying', 'Talking'];

const shuffle = (array: string[]) => [...array].sort(() => Math.random() - 0.5);

const generateSoundLevels = () => {
  const levels = [];
  for (let i = 0; i < 25; i++) {
    const soundObj = SOUNDS[i % SOUNDS.length];
    
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
  const [score, setScore] = useState(0)
  const [gameFinished, setGameFinished] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [startTime, setStartTime] = useState(0)
  const [feedback, setFeedback] = useState<'correct'|'incorrect'|null>(null)
  
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const savedLevel = localStorage.getItem('sound_recognition_level')
    if (savedLevel) {
      const parsed = parseInt(savedLevel)
      if (!isNaN(parsed) && parsed >= 0 && parsed < 25) {
        setCurrentLevel(parsed)
      }
    }

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
    }
    const audio = new Audio(LEVELS[currentLevel].soundUrl)
    audio.play().catch(e => console.log("Audio play failed, might need interaction:", e))
    audioRef.current = audio
  }

  const handleOptionSelect = (option: string) => {
    if (feedback !== null) return // prevent double click
    
    playClickSound()
    
    const isCorrect = option === LEVELS[currentLevel].answer
    setFeedback(isCorrect ? 'correct' : 'incorrect')
    
    if (isCorrect) {
      setScore(s => s + 10)
    }

    setTimeout(() => {
      setFeedback(null)
      if (currentLevel < LEVELS.length - 1) {
        const next = currentLevel + 1
        setCurrentLevel(next)
        localStorage.setItem('sound_recognition_level', next.toString())
      } else {
        handleGameComplete()
      }
    }, 1500)
  }

  const handleGameComplete = async () => {
    setGameFinished(true)
    setIsPlaying(false)
    
    playPremiumVoice(t('Great Job!', language), language)
    
    setIsSaving(true)
    
    try {
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000)
      const { data: userData } = await supabase.auth.getUser()
      
      if (userData.user) {
        let gameId = 'sound-recognition-uuid-placeholder';
        if (navigator.onLine) {
          const { data: gameData } = await supabase
            .from('games')
            .select('id')
            .eq('slug', 'sound-recognition')
            .single()
          if (gameData) gameId = gameData.id;
        }

        const payload = {
          patient_id: userData.user.id,
          game_id: gameId,
          difficulty_level: currentLevel + 1,
          score: score,
          questions_attempted: 25,
          questions_correct: score / 10,
          hints_used: 0,
          duration_seconds: durationSeconds,
          completed: true
        }

        if (navigator.onLine) {
          await supabase.from('game_sessions').insert(payload)
        } else {
          const { db } = await import('../../../lib/db');
          await db.sync_queue.add({
            table_name: 'game_sessions',
            operation: 'INSERT',
            payload: payload,
            created_at: new Date().toISOString(),
            status: 'pending'
          });
        }
      }
    } catch (error) {
      console.error('Error saving session:', error)
    } finally {
      setIsSaving(false)
      localStorage.setItem('sound_recognition_level', '0')
      setCurrentLevel(0)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDF9]">
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/patient/games" className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors text-[#144533]">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-bold text-[#144533]">{t('Sound Recognition', language)}</h1>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-2xl mx-auto w-full flex flex-col">
        {!isPlaying && !gameFinished ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm text-center flex-1 flex flex-col justify-center items-center">
            <div className="w-24 h-24 bg-[#E1F4EA] text-[#1B4D3E] rounded-full flex items-center justify-center mb-6">
              <Volume2 size={48} />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-4">{t('Sound Recognition', language)}</h2>
            <p className="text-gray-500 max-w-md mx-auto mb-8 text-lg leading-relaxed">
              {t('Listen to the sound and choose the correct answer. This helps improve auditory processing.', language)}
            </p>
            <button 
              onClick={startGame}
              className="bg-[#1B4D3E] text-white px-10 py-4 rounded-full font-bold text-xl hover:bg-[#13382D] transition-transform active:scale-95 shadow-md">
              {currentLevel > 0 ? t('Continue Game', language) : t('Start Game', language)}
            </button>
          </div>
        ) : gameFinished ? (
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm text-center flex-1 flex flex-col justify-center items-center animate-in zoom-in duration-500">
            <div className="w-24 h-24 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center mb-6">
              <Trophy size={48} />
            </div>
            <h2 className="text-4xl font-bold text-gray-800 mb-2">{t('Great Job!', language)}</h2>
            <p className="text-gray-500 text-lg mb-8">{t('You completed the sound challenge.', language)}</p>
            
            <div className="bg-[#FDFDF9] rounded-2xl p-6 mb-8 w-full max-w-xs border border-gray-100 shadow-inner">
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">{t('Your Score', language)}</p>
              <p className="text-5xl font-black text-[#1B4D3E]">{score}</p>
            </div>
            
            <div className="flex gap-4">
              <button 
                onClick={startGame}
                className="bg-[#1B4D3E] text-white px-8 py-3 rounded-full font-bold hover:bg-[#13382D] transition-transform active:scale-95 shadow-sm">
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
              <span className="bg-gray-100 px-4 py-2 rounded-full font-bold text-gray-600 text-sm">
                {t('Level', language)} {currentLevel + 1} of {LEVELS.length}
              </span>
              <span className="font-bold text-[#1B4D3E]">
                {t('Score', language)}: {score}
              </span>
            </div>
            
            <div className="flex-1 flex flex-col items-center justify-center mb-8">
              <button 
                onClick={playSound}
                className="w-32 h-32 bg-[#E1F4EA] text-[#1B4D3E] rounded-full flex items-center justify-center hover:bg-[#c9f0db] transition-colors shadow-inner active:scale-95 border-4 border-white ring-4 ring-gray-50 mb-6"
              >
                <Play size={48} className="ml-2" />
              </button>
              <p className="text-gray-500 font-medium">{t('Tap to hear sound', language)}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-auto">
              {LEVELS[currentLevel].options.map((option, index) => {
                let btnStyle = "bg-[#FDFDF9] border-2 border-gray-200 text-gray-700 hover:border-[#1B4D3E] hover:text-[#1B4D3E]"
                
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
