import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { LayoutDashboard, Users, Settings, LogOut, ShieldAlert } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Admin uses sessionStorage for JWT/Auth state to keep it separate from Patient/Caregiver Supabase auth
    const adminToken = sessionStorage.getItem("admin_token")
    if (adminToken) {
      setIsAdminAuthenticated(true)
    } else {
      setIsAdminAuthenticated(false)
      // Redirect to login if not setup or login page
      if (!location.pathname.includes('/setup') && !location.pathname.includes('/login')) {
        navigate('/admin/login')
      }
    }
    setChecking(false)
  }, [location, navigate])

  const handleLogout = async () => {
    sessionStorage.removeItem("admin_token")
    // Also sign out from Supabase just in case
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  // If we are on setup or login, we don't show the sidebar layout
  if (location.pathname === '/admin/setup' || location.pathname === '/admin/login') {
    return <Outlet />
  }

  if (checking) return null
  if (!isAdminAuthenticated) return null

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
          <div className="bg-black p-2 rounded">
            <ShieldAlert className="text-white h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">MemCall Admin</h1>
            <p className="text-xs text-gray-500">System Management</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            to="/admin"
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              location.pathname === '/admin' ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50 hover:text-black'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard Overview
          </Link>
          <Link
            to="/admin/users"
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              location.pathname.includes('/admin/users') ? 'bg-gray-100 text-black' : 'text-gray-600 hover:bg-gray-50 hover:text-black'
            }`}
          >
            <Users className="h-4 w-4" />
            User Management
          </Link>
          <button
            disabled
            className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-gray-400 opacity-50 cursor-not-allowed"
          >
            <Settings className="h-4 w-4" />
            System Settings (WIP)
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Secure Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}
