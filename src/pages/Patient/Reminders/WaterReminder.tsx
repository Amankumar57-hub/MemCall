import { Droplet, Check, Clock, Volume2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function WaterReminder() {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 bg-[#E1F4EA] flex flex-col items-center justify-center p-6 font-sans z-50">
      
      {/* Icon */}
      <div className="bg-white/60 p-8 rounded-full mb-8 shadow-sm">
        <Droplet size={64} className="text-[#144533] fill-[#144533]" />
      </div>

      {/* Text */}
      <h1 className="text-4xl md:text-5xl font-bold text-[#144533] mb-4 text-center">
        Time to Drink Water
      </h1>
      <p className="text-[#1B4D3E]/80 text-xl font-medium mb-16 text-center">
        Stay hydrated for good health.
      </p>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mb-12">
        <button 
          onClick={() => navigate('/patient')}
          className="flex-1 bg-[#144533] text-white py-5 rounded-full text-xl font-bold flex items-center justify-center gap-3 hover:bg-[#13382D] transition-colors shadow-lg active:scale-[0.98]"
        >
          <Check size={28} /> I've Drunk It
        </button>
        <button 
          onClick={() => navigate('/patient')}
          className="flex-1 bg-[#F59E0B] text-white py-5 rounded-full text-xl font-bold flex items-center justify-center gap-3 hover:bg-[#D97706] transition-colors shadow-lg active:scale-[0.98]"
        >
          <Clock size={28} /> Remind in 5 mins
        </button>
      </div>

      {/* Voice Prompt indicator */}
      <div className="flex items-center gap-2 text-[#1B4D3E]/70 bg-white/40 px-6 py-3 rounded-full">
        <Volume2 size={24} />
        <span className="font-bold">Listening for "Okay" or "Later"</span>
      </div>
      
    </div>
  )
}
