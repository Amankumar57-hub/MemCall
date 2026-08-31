import { Link } from 'react-router-dom'
import { Bell, User, ArrowLeft } from 'lucide-react'

export default function GameList() {
  const games = [
    {
      id: 'pattern-match',
      title: 'Traditional Pattern Match',
      desc: 'Match the stunning woven designs from local handlooms.',
      image: 'https://images.unsplash.com/photo-1551042784-07f9c26f6345?w=400&q=80',
      bgColor: 'bg-[#E1F4EA]',
      tag: 'Memory'
    },
    {
      id: 'face-recall',
      title: 'Family Face Recall',
      desc: 'Identify familiar faces and names of your loved ones.',
      image: 'https://images.unsplash.com/photo-1581579186913-46aaeca787e9?w=400&q=80',
      bgColor: 'bg-[#FCEBD7]',
      tag: 'Recall'
    },
    {
      id: 'sound-recognition',
      title: 'Daily Sound Recognition',
      desc: 'Listen closely and identify everyday familiar sounds.',
      image: 'https://images.unsplash.com/photo-1516280440502-628d00938bf7?w=400&q=80',
      bgColor: 'bg-[#FCE4E6]',
      tag: 'Audio'
    }
  ]

  return (
    <div className="flex flex-col min-h-screen bg-[#FDFDF9] font-sans pb-24">
      {/* Top Header */}
      <header className="px-6 py-4 flex justify-between items-center border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-[#144533]">MemCall</h1>
          <nav className="hidden md:flex gap-6 text-sm font-semibold text-gray-500">
            <Link to="/patient" className="hover:text-[#144533] transition-colors pb-1">Today</Link>
            <Link to="/patient/games" className="text-[#144533] border-b-2 border-[#144533] pb-1">Games</Link>
            <Link to="/patient/reminders" className="hover:text-[#144533] transition-colors pb-1">Reminders</Link>
            <Link to="/patient/profile" className="hover:text-[#144533] transition-colors pb-1">Profile</Link>
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
          <ArrowLeft size={20} /> Back to Home
        </Link>
        
        <div className="mb-10">
          <h2 className="text-4xl font-bold text-gray-800 mb-3">Choose a Game</h2>
          <p className="text-gray-500 font-medium text-lg max-w-2xl">
            Select an activity below to keep your mind active. These games are designed to be enjoyable and helpful.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {games.map(game => (
            <div key={game.id} className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="h-48 relative overflow-hidden bg-gray-100">
                <img src={game.image} alt={game.title} className="w-full h-full object-cover" />
                <div className={`absolute top-4 left-4 ${game.bgColor} text-[#144533] px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide`}>
                  {game.tag}
                </div>
              </div>
              
              <div className="p-6 flex flex-col flex-1">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{game.title}</h3>
                <p className="text-gray-500 text-sm mb-6 flex-1 line-clamp-2">{game.desc}</p>
                
                <Link 
                  to={`/patient/games/${game.id === 'pattern-match' ? 'memory' : game.id}`}
                  className="w-full bg-[#1B4D3E] text-white font-bold rounded-full py-3.5 text-center hover:bg-[#13382D] transition-colors shadow-md active:scale-[0.98]"
                >
                  Play
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
