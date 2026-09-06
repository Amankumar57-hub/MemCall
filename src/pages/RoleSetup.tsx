import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Brain, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export default function RoleSetup() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        navigate('/login')
        return
      }
      setUser(session.user)
      
      // Check if they already have a role
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()
        
      if (profile && profile.role) {
        // They already have a role, send them where they belong
        navigate(profile.role === 'caregiver' ? '/caregiver' : '/patient')
      } else {
        setLoading(false)
      }
    }
    
    checkUser()
  }, [navigate])

  const handleRoleSelect = async (selectedRole: 'patient' | 'caregiver') => {
    if (!user) return
    setSaving(true)
    setError('')
    
    try {
      // The database trigger should have already created the user row.
      // We just need to update it with the selected role.
      const { data: updatedUser, error: updateError } = await supabase.from('users').update({
        full_name: user.user_metadata?.full_name || 'User',
        role: selectedRole
      }).eq('id', user.id).select().single()

      if (updateError) {
        throw updateError
      }
      
      if (!updatedUser) {
        throw new Error('Your account is in a broken state because it was created before the database was fully set up. Please go to Settings -> Delete Account (or delete it from Supabase) and sign up again.')
      }
      
      // If patient, make sure the patient profile exists
      if (selectedRole === 'patient') {
        const { error: profileError } = await supabase.from('patient_profiles').upsert({ user_id: user.id })
        if (profileError && !profileError.message.includes('row-level security')) {
          console.error('Profile error:', profileError)
        }
      } else {
        await supabase.from('patient_profiles').delete().eq('user_id', user.id)
      }

      navigate(selectedRole === 'patient' ? '/patient' : '/caregiver')
    } catch (err: unknown) {
      console.error(err)
      setError((err as Error).message || 'Failed to save role. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="animate-spin text-primary-hover" size={48} />
    </div>
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="bg-white max-w-2xl w-full rounded-3xl p-8 md:p-12 shadow-2xl border border-gray-100 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to MemCall!</h1>
        <p className="text-xl text-gray-500 mb-10">We noticed you signed in with Google. How will you be using the app today?</p>
        
        {error && (
          <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-6">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <button 
            disabled={saving}
            onClick={() => handleRoleSelect('patient')}
            className="flex flex-col items-center p-8 border-2 border-gray-100 rounded-2xl hover:border-[#1B4D3E] hover:bg-accent transition-all group disabled:opacity-50"
          >
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-white group-hover:shadow-sm transition-all">
              <Brain size={40} className="text-gray-400 group-hover:text-primary-hover transition-colors" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">I am a Patient</h3>
            <p className="text-gray-500 text-sm">I want to play games and get reminders.</p>
          </button>
          
          <button 
            disabled={saving}
            onClick={() => handleRoleSelect('caregiver')}
            className="flex flex-col items-center p-8 border-2 border-gray-100 rounded-2xl hover:border-[#1B4D3E] hover:bg-accent transition-all group disabled:opacity-50"
          >
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-white group-hover:shadow-sm transition-all">
              <Heart size={40} className="text-gray-400 group-hover:text-primary-hover transition-colors" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">I am a Caregiver</h3>
            <p className="text-gray-500 text-sm">I want to help manage someone's care.</p>
          </button>
        </div>
      </div>
    </div>
  )
}
