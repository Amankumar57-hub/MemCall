import { Link } from 'react-router-dom'
import { Brain, ArrowLeft } from 'lucide-react'
import { useAppStore } from '../../../store/useAppStore'
import { t } from '../../../lib/i18n'

export default function GameList() {
  const { language } = useAppStore()
  
  const games = [
    {
      id: 'ner-pattern-match',
      title: 'NER Heritage Match',
      desc: 'Match cultural symbols of the North East (Gamosa, Rhino, Tea).',
      image: '/images/memory_match.jpg', // Reusing image for now, can be updated later
      bgColor: 'bg-[#FFEDD5]',
      textColor: 'text-[#EA580C]',
      tag: 'Culture'
    },
    {
      id: 'memory-garden',
      title: 'Memory Garden',
      desc: 'Memorize the items in the garden and recall them. Helps improve short-term memory.',
      image: '/images/memory_match.jpg',
      bgColor: 'bg-[#E0F2FE]',
      textColor: 'text-[#0284C7]',
      tag: 'Memory'
    },
    {
      id: 'shape-tracer',
      title: 'Shape Tracer',
      desc: 'Connect the dots in order to trace the hidden shape. Improves motor skills and spatial memory.',
      image: '/images/shape_tracer.jpg',
      bgColor: 'bg-[#FDE2E4]',
      textColor: 'text-[#E11D48]',
      tag: 'Motor'
    },
    {
      id: 'sound-recognition',
      title: 'Daily Sound Recognition',
      desc: 'Listen closely and identify everyday familiar sounds.',
      image: '/images/sound_recognition.jpg',
      bgColor: 'bg-[#FEF9C3]',
      textColor: 'text-[#CA8A04]',
      tag: 'Audio'
    },
    {
      id: 'family-quiz',
      title: 'Family Photo Quiz',
      desc: 'Upload photos of your loved ones and play a memory quiz to remember their names.',
      image: '/images/family_quiz.jpg',
      bgColor: 'bg-[#DCFCE7]',
      textColor: 'text-[#16A34A]',
      tag: 'Social'
    }
  ]

  return (
    <main className="flex-1 px-4 md:px-8 max-w-5xl mx-auto w-full flex flex-col gap-6 mt-4 pb-12">
      
      <div className="flex items-center gap-4 mt-2 mb-4">
         <Link to="/patient" className="p-2 -ml-2 text-gray-500 dark:text-gray-300 hover:text-primary transition-colors rounded-full hover:bg-gray-50 dark:hover:bg-gray-800">
           <ArrowLeft size={28} />
         </Link>
         <div className="w-14 h-14 bg-[#EFE8FA] rounded-2xl flex items-center justify-center text-[#7C3AED] shadow-sm">
           <Brain size={32} />
         </div>
         <div>
            <h2 className="text-3xl font-extrabold text-[#5A4B81] dark:text-white">{t('Choose a Game', language)}</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mt-1 max-w-sm">
              {t('Select an activity below to keep your mind active.', language)}
            </p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {games.map(game => (
          <div key={game.id} className="bg-white dark:bg-card rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col border border-gray-100 dark:border-border">
            <div className="h-44 relative overflow-hidden bg-gray-100 dark:bg-gray-800 p-2">
              <img 
                src={game.image} 
                alt={game.title} 
                className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500"
              />
              <div className={`absolute top-4 left-4 ${game.bgColor} ${game.textColor} px-3 py-1 rounded-full text-xs font-bold shadow-sm uppercase tracking-wider`}>
                {game.tag}
              </div>
            </div>
            
            <div className="p-6 flex flex-col flex-1">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{t(game.title, language)}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 flex-1 font-medium leading-relaxed">{t(game.desc, language)}</p>
              
              <Link 
                to={`/patient/games/${game.id === 'pattern-match' ? 'memory' : game.id}`}
                className={`w-full ${game.bgColor} ${game.textColor} font-bold rounded-2xl py-3.5 text-center hover:opacity-80 transition-opacity shadow-sm active:scale-[0.98]`}
              >
                {t('Play Game', language)}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
