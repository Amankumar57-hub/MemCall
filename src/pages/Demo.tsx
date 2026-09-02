import { useNavigate } from 'react-router-dom'
import { Home, Briefcase } from 'lucide-react'

export default function Demo() {
  const navigate = useNavigate()

  const handleSelect = (role: 'patient' | 'caregiver') => {
    localStorage.setItem('demo_mode', 'true')
    localStorage.setItem('demo_role', role)
    if (role === 'patient') {
      navigate('/patient')
    } else {
      navigate('/caregiver')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDF9] font-sans p-4">
      <div className="w-full max-w-4xl text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-[#144533] mb-3">Try MemCall Without Sign In</h1>
        <p className="text-gray-500 font-medium mb-12">Select an experience to explore the demo:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <button 
            onClick={() => handleSelect('patient')}
            className="group flex flex-col items-center justify-center p-10 bg-white border-2 border-gray-100 rounded-3xl shadow-sm hover:border-[#144533] hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="bg-[#E1F4EA] p-6 rounded-full mb-6 group-hover:scale-110 transition-transform">
              <Home size={48} className="text-[#144533]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Patient View</h2>
            <p className="text-gray-500 font-medium text-center">Explore games, reminders, and daily check-ins</p>
          </button>

          <button 
            onClick={() => handleSelect('caregiver')}
            className="group flex flex-col items-center justify-center p-10 bg-white border-2 border-gray-100 rounded-3xl shadow-sm hover:border-gray-400 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="bg-gray-100 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform">
              <Briefcase size={48} className="text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Caregiver View</h2>
            <p className="text-gray-500 font-medium text-center">Monitor progress and set alerts</p>
          </button>
        </div>
      </div>
    </div>
  )
}
