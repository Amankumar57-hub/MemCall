import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { ShieldAlert, Loader2 } from 'lucide-react'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    checkSetupStatus()
  }, [])

  const checkSetupStatus = async () => {
    try {
      const { data } = await supabase
        .from('admin_config')
        .select('is_setup_complete')
        .eq('id', 1)
        .single()

      if (!data?.is_setup_complete) {
        navigate('/admin/setup')
      }
    } catch (err) {
      // If table doesn't exist or row missing, assume not setup
      navigate('/admin/setup')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) throw authError

      if (data.session) {
        // Verify this is actually the admin
        const { data: adminConfig } = await supabase
          .from('admin_config')
          .select('admin_email')
          .eq('id', 1)
          .single()

        if (adminConfig?.admin_email === email) {
          sessionStorage.setItem("admin_token", data.session.access_token)
          navigate('/admin')
        } else {
          await supabase.auth.signOut()
          throw new Error("Unauthorized access. Admin credentials only.")
        }
      }
    } catch (err: any) {
      setError(err.message || "Invalid credentials")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center justify-center text-center mb-8">
          <div className="bg-black p-3 rounded-full mb-4">
            <ShieldAlert className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">System Login</h1>
          <p className="text-sm text-gray-500 mt-2">
            Enter your admin credentials to access the dashboard.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-md">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Admin Email</label>
            <Input 
              required 
              type="email" 
              placeholder="admin@memcall.com" 
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Password</label>
            <Input 
              required 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full mt-6 bg-black hover:bg-gray-800" disabled={submitting}>
            {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sign In
          </Button>
        </form>
      </div>
    </div>
  )
}
