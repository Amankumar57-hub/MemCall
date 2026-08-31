import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Users, Activity, Target, Brain } from 'lucide-react'

// Dummy wrapper for shadcn Card until we build it fully
function SimpleCard({ title, value, icon: Icon, description }: any) {
  return (
    <div className="rounded-xl border bg-card text-card-foreground shadow-sm bg-white p-6">
      <div className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="tracking-tight text-sm font-medium text-gray-500">{title}</h3>
        {Icon && <Icon className="h-4 w-4 text-gray-500" />}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground text-gray-500 mt-1">{description}</p>
    </div>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPatients: 0,
    totalCaregivers: 0,
    totalGames: 0
  })
  
  const [recentUsers, setRecentUsers] = useState<any[]>([])

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    // Note: In a real app, this should be done securely, perhaps counting rows
    // using Supabase RPC or selecting with head=true
    
    const [{ count: userCount }, { count: patientCount }, { count: cgCount }, { count: gameCount }, { data: recent }] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'patient'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'caregiver'),
      supabase.from('game_sessions').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('id, full_name, email, role, created_at').order('created_at', { ascending: false }).limit(5)
    ])

    setStats({
      totalUsers: userCount || 0,
      totalPatients: patientCount || 0,
      totalCaregivers: cgCount || 0,
      totalGames: gameCount || 0
    })

    if (recent) setRecentUsers(recent)
  }

  return (
    <div className="p-8 font-sans w-full max-w-7xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-gray-500">System overview and analytics.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <SimpleCard 
          title="Total Registered Users" 
          value={stats.totalUsers} 
          icon={Users} 
          description="Patients & Caregivers"
        />
        <SimpleCard 
          title="Total Patients" 
          value={stats.totalPatients} 
          icon={Brain} 
          description="Active patients"
        />
        <SimpleCard 
          title="Total Caregivers" 
          value={stats.totalCaregivers} 
          icon={Target} 
          description="Active caregivers"
        />
        <SimpleCard 
          title="Total Game Sessions" 
          value={stats.totalGames} 
          icon={Activity} 
          description="Across all patients"
        />
      </div>

      <div className="bg-white border rounded-xl shadow-sm">
        <div className="p-6 border-b">
          <h3 className="font-semibold leading-none tracking-tight">Recent Registrations</h3>
          <p className="text-sm text-gray-500 mt-1">Latest users joined the platform.</p>
        </div>
        <div className="p-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.full_name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      user.role === 'patient' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
