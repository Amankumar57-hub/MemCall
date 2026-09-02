import { Link } from 'react-router-dom'
import { Bell, User, ArrowLeft, LayoutGrid, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '../../../store/useAppStore'
import { t } from '../../../lib/i18n'

export default function GameList() {
  const { language } = useAppStore()
  const games = [
    {
      id: 'pattern-match',
      title: 'Traditional Pattern Match',
      desc: 'Match the stunning woven designs from local handlooms.',
      image: '/images/memory_match.jpg',
      bgColor: 'bg-[#E1F4EA]',
      tag: 'Memory'
    },
    {
      id: 'memory-garden',
      title: 'Memory Garden',
      desc: 'Memorize the items in the garden and recall them. Helps improve short-term memory.',
      image: '/images/memory_match.jpg', // Placeholder
      bgColor: 'bg-[#E8F0FE]',
      tag: 'Memory'
    },
    {
      id: 'shape-tracer',
      title: 'Shape Tracer',
      desc: 'Connect the dots in order to trace the hidden shape. Improves motor skills and spatial memory.',
      image: '/images/shape_tracer.jpg',
      bgColor: 'bg-[#FCEBD7]',
      tag: 'Motor'
    },
    {
      id: 'sound-recognition',
      title: 'Daily Sound Recognition',
      desc: 'Listen closely and identify everyday familiar sounds.',
      image: '/images/sound_recognition.jpg',
      bgColor: 'bg-[#FCE4E6]',
      tag: 'Audio'
    },
    {
      id: 'family-quiz',
      title: 'Family Photo Quiz',
      desc: 'Upload photos of your loved ones and play a memory quiz to remember their names.',
      image: '/images/family_quiz.jpg',
      bgColor: 'bg-[#FFF3E0]',
      tag: 'Social'
    }
  ]

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDF9] font-sans pb-24">
      {/* Top Header */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-[#144533]">MemCall</h1>
          <nav className="hidden md:flex gap-6 text-sm font-semibold text-gray-500">
            <Link to="/patient" className="hover:text-[#144533] transition-colors pb-1">{t('Today', language)}</Link>
            <Link to="/patient/games" className="text-[#144533] border-b-2 border-[#144533] pb-1">{t('Games', language)}</Link>
            <Link to="/patient/reminders" className="hover:text-[#144533] transition-colors pb-1">{t('Reminders', language)}</Link>
            <Link to="/patient/profile" className="hover:text-[#144533] transition-colors pb-1">{t('Profile', language)}</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4 text-[#144533]">
          <button className="p-2 hover:bg-gray-100 rounded-full"><Bell size={24} /></button>
          <button className="p-2 hover:bg-gray-100 rounded-full"><User size={24} /></button>
          <button className="hidden md:block bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm">Emergency</button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full">
        <Link to="/patient" className="inline-flex items-center gap-2 text-[#144533] font-medium mb-6 hover:underline">
          <ArrowLeft size={20} /> {t('Back to Home', language)}
        </Link>
        
        <div className="mb-10">
          <h2 className="text-4xl font-bold text-gray-800 mb-3">{t('Choose a Game', language)}</h2>
          <p className="text-gray-500 font-medium text-lg max-w-2xl">
            {t('Select an activity below to keep your mind active. These games are designed to be enjoyable and helpful.', language)}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {games.map(game => (
            <div key={game.id} className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="h-48 relative overflow-hidden bg-gray-100">
                <img src={game.image} alt={game.title} className="w-full h-full object-cover" />
                <div className={`absolute top-4 left-4 ${game.bgColor} text-[#144533] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide`}>
                  {t(game.tag, language)}
                </div>
              </div>
              
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{t(game.title, language)}</h3>
                <p className="text-gray-500 text-sm mb-6 flex-1 line-clamp-2">{t(game.desc, language)}</p>
                
                <Link 
                  to={`/patient/games/${game.id === 'pattern-match' ? 'memory' : game.id}`}
                  className="w-full bg-[#1B4D3E] text-white font-bold rounded-full py-3.5 text-center hover:bg-[#13382D] transition-colors shadow-md active:scale-[0.98]"
                >
                  {t('Play', language)}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between z-50">
        <Link to="/patient" className="flex flex-col items-center text-gray-400">
          <div className="p-1"><CheckCircle2 size={24} /></div>
          <span className="text-xs font-medium mt-1">{t('Today', language)}</span>
        </Link>
        <Link to="/patient/games" className="flex flex-col items-center text-[#1B4D3E]">
          <div className="p-1"><LayoutGrid size={24} /></div>
          <span className="text-xs font-bold mt-1">{t('Games', language)}</span>
        </Link>
        <Link to="/patient/reminders" className="flex flex-col items-center text-gray-400">
          <div className="p-1"><Bell size={24} /></div>
          <span className="text-xs font-medium mt-1">{t('Alerts', language)}</span>
        </Link>
        <Link to="/patient/profile" className="flex flex-col items-center text-gray-400">
          <div className="p-1"><User size={24} /></div>
          <span className="text-xs font-medium mt-1">{t('Profile', language)}</span>
        </Link>
      </nav>
    </div>
  )
}
