import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Signup() {
  const navigate = useNavigate()
  
  // Form State
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [dob, setDob] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          }
        }
      })

      if (authError) {
        if (authError.message.includes('rate limit')) {
          throw new Error('Email rate limit exceeded. Please try again later or use Google Sign-in.')
        }
        throw authError
      }
      
      if (!authData.user) throw new Error('Failed to create user')

      if (authData.session === null) {
        // Email confirmation is required
        setSuccess(true)
      } else {
        // Logged in directly
        navigate('/onboarding')
      }

    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to create account')
      } else {
        setError('Failed to create account')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDF9] font-sans p-4">
        <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
          <div className="bg-[#E1F4EA] w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 6C22 4.9 21.1 4 20 4H4C2.9 4 2 4.9 2 6M22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6M22 6L12 13L2 6" stroke="#144533" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Check your email</h2>
          <p className="text-gray-500 font-medium mb-8">
            We've sent a verification link to <span className="font-bold text-gray-800">{email}</span>. 
            Please click the link in the email to activate your account.
          </p>
          <Link 
            to="/login"
            className="w-full inline-block bg-[#144533] text-white font-bold rounded-xl py-3.5 hover:bg-[#1B4D3E] transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDF9] font-sans p-4">
      <div className="w-full max-w-md text-center">
        <Link 
          to="/" 
          className="absolute top-6 left-6 text-[#144533] flex items-center gap-2 font-medium hover:underline"
        >
          <ArrowLeft size={20} /> Back
        </Link>

        <h1 className="text-4xl md:text-5xl font-bold text-[#144533] mb-6">Samriti</h1>
        
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-left">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Create Account</h2>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm font-medium text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#144533]" placeholder="e.g. Anand Bora" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#144533]" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input required type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#144533]" placeholder="Create a password" minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input required type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#144533]" />
            </div>
            
            <button disabled={loading} type="submit" className="w-full bg-[#144533] text-white font-bold rounded-xl py-3.5 mt-4 hover:bg-[#1B4D3E] transition-colors disabled:opacity-70">
              {loading ? 'Creating Account...' : 'Continue'}
            </button>

            <div className="relative flex items-center py-2 mt-4">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm font-medium">Or continue with</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <button 
              type="button"
              onClick={async () => {
                await supabase.auth.signInWithOAuth({ 
                  provider: 'google',
                  options: {
                    redirectTo: window.location.origin
                  }
                });
              }}
              className="w-full bg-white border border-gray-200 text-gray-700 font-bold rounded-xl py-3.5 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Google
            </button>
          </form>
          
          <div className="mt-8 text-center pt-6 border-t border-gray-100">
            <p className="text-gray-500 font-medium">
              Already have an account? <Link to="/login" className="text-[#144533] font-bold hover:underline transition-colors">Log In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

