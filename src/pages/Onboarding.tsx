import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Briefcase, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Onboarding() {
  const navigate = useNavigate()
  const [role, setRole] = useState<'patient' | 'caregiver' | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Patient specific
  const [language, setLanguage] = useState('en')
  const [concern, setConcern] = useState('mild')
  
  // Caregiver specific
  const [relationship, setRelationship] = useState('Family member')

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) return
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No user found")

      const { error: upsertError } = await supabase.from('users').upsert({
        id: user.id,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
        avatar_url: user.user_metadata?.avatar_url || null,
        role: role
      }, { onConflict: 'id' })

      if (upsertError) console.error('Upsert Error:', upsertError)

      // Update user metadata
      await supabase.auth.updateUser({
        data: { onboarding_complete: true, role }
      })

      const { data: dbUser, error: fetchError } = await supabase.from('users').select('id').eq('id', user.id).single()
      
      if (fetchError || !dbUser) {
        throw new Error("Could not find user profile in database.")
      }

      // Update users table
      if (role === 'caregiver') {
        await supabase.from('users').update({ role: 'caregiver' }).eq('id', dbUser.id)
        // Cleanup default patient profile created by trigger
        await supabase.from('patient_profiles').delete().eq('user_id', dbUser.id)
      } else {
        await supabase.from('patient_profiles').update({
          language_preference: language,
          cognitive_concern_level: concern
        }).eq('user_id', dbUser.id)
      }

      localStorage.setItem('onboarding_complete', 'true')
      navigate(role === 'patient' ? '/patient' : '/caregiver', { replace: true })
      
    } catch (err: any) {
      setError(err.message || "Failed to save details")
    } finally {
      setLoading(false)
    }
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-sans p-4">
        <div className="w-full max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-3">Welcome to MemCall</h1>
          <p className="text-gray-500 font-medium mb-12">Please select your role to continue:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <button 
              onClick={() => setRole('patient')}
              className="group flex flex-col items-center justify-center p-10 bg-white border-2 border-gray-100 rounded-3xl shadow-sm hover:border-primary hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="bg-accent p-6 rounded-full mb-6 group-hover:scale-110 transition-transform">
                <Home size={48} className="text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">I am a Patient</h2>
              <p className="text-gray-500 font-medium text-center">Starting daily tasks, play games...</p>
            </button>

            <button 
              onClick={() => setRole('caregiver')}
              className="group flex flex-col items-center justify-center p-10 bg-white border-2 border-gray-100 rounded-3xl shadow-sm hover:border-gray-400 hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="bg-gray-100 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform">
                <Briefcase size={48} className="text-gray-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">I am a Caregiver</h2>
              <p className="text-gray-500 font-medium text-center">Monitor progress, set timings, alerts...</p>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background font-sans p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-left">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Final Details</h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleComplete} className="space-y-4">
          {role === 'patient' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Language</label>
                <select value={language} onChange={e => setLanguage(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="en">English</option>
                  <option value="hi">हिन्दी (Hindi)</option>
                  <option value="mr">मराठी (Marathi)</option>
                  <option value="gu">ગુજરાતી (Gujarati)</option>
                  <option value="bn">বাংলা (Bengali)</option>
                  <option value="ta">தமிழ் (Tamil)</option>
                  <option value="te">తెలుగు (Telugu)</option>
                  <option value="as">অসমীয়া (Assamese)</option>
                  <option value="kha">Khasi</option>
                  <option value="lus">Mizo</option>
                  <option value="nag">Nagamese</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cognitive Concern Level</label>
                <select value={concern} onChange={e => setConcern(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="mild">Mild Forgetfulness</option>
                  <option value="moderate">Moderate Memory Loss</option>
                  <option value="severe">Severe Decline</option>
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship to Patient</label>
                <select value={relationship} onChange={e => setRelationship(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="Family member">Family Member</option>
                  <option value="Healthcare worker">Healthcare Worker</option>
                  <option value="ASHA worker">ASHA Worker</option>
                  <option value="Volunteer">Volunteer</option>
                </select>
              </div>
            </>
          )}
          
          <button disabled={loading} type="submit" className="w-full bg-primary text-white font-bold rounded-xl py-3.5 mt-4 hover:bg-primary-hover transition-colors disabled:opacity-70 flex items-center justify-center gap-2">
            {loading ? <><Loader2 className="animate-spin" size={20} /> Saving...</> : 'Complete Setup'}
          </button>
          
          <button type="button" onClick={() => setRole(null)} className="w-full text-gray-500 font-bold py-3 hover:text-gray-700 transition-colors">
            Back
          </button>
        </form>
      </div>
    </div>
  )
}
