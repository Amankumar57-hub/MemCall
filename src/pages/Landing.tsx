import { Link } from 'react-router-dom'
import { Heart, Brain, Shield, Bell } from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#FDFDF9] font-sans flex flex-col">
      <header className="px-6 md:px-12 py-6 flex justify-between items-center bg-white border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#E1F4EA] rounded-xl flex items-center justify-center text-[#1B4D3E]">
            <Heart size={24} />
          </div>
          <span className="text-2xl font-bold text-[#144533]">MemCall</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-[#1B4D3E] font-bold hover:text-[#144533]">Sign In</Link>
          <Link to="/signup" className="bg-[#1B4D3E] text-white px-6 py-2.5 rounded-full font-bold hover:bg-[#13382D] transition-colors shadow-sm">Sign Up</Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 text-center relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-20 -left-20 w-64 h-64 bg-[#E1F4EA] blur-3xl rounded-full opacity-50 pointer-events-none"></div>
        <div className="absolute bottom-20 -right-20 w-64 h-64 bg-[#FCEBD7] blur-3xl rounded-full opacity-50 pointer-events-none"></div>

        <div className="max-w-3xl relative z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Empowering Memory,<br/>Connecting Care.
          </h1>
          <p className="text-xl md:text-2xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            A specialized companion app for cognitive wellness. Helping patients maintain independence while giving caregivers peace of mind.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <Link to="/signup" className="w-full sm:w-auto bg-[#1B4D3E] text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-[#13382D] transition-transform active:scale-95 shadow-lg">
              Get Started Free
            </Link>
            <Link to="/login" className="w-full sm:w-auto bg-white text-[#1B4D3E] border-2 border-[#1B4D3E] px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-50 transition-colors shadow-sm">
              I already have an account
            </Link>
          </div>
          
          <div className="flex justify-center mb-16">
             <Link to="/demo" className="text-gray-500 font-medium underline hover:text-gray-800 transition-colors">
                Try without Sign In (Demo Mode)
             </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full z-10 mt-8">
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-left">
            <div className="w-14 h-14 bg-[#E1F4EA] rounded-2xl flex items-center justify-center text-[#1B4D3E] mb-6">
              <Brain size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Cognitive Games</h3>
            <p className="text-gray-500 leading-relaxed">Fun, daily exercises designed to stimulate memory, motor skills, and audio recognition.</p>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-left">
            <div className="w-14 h-14 bg-[#FCEBD7] rounded-2xl flex items-center justify-center text-[#D97706] mb-6">
              <Bell size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Smart Reminders</h3>
            <p className="text-gray-500 leading-relaxed">Caregivers can easily schedule medication and hydration reminders that sync instantly.</p>
          </div>
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-left">
            <div className="w-14 h-14 bg-[#FCE4E6] rounded-2xl flex items-center justify-center text-[#BE123C] mb-6">
              <Shield size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Safe & Secure</h3>
            <p className="text-gray-500 leading-relaxed">Private family codes ensure that only authorized caregivers can connect with patients.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
