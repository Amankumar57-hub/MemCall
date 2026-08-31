import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Search, Ban, UserCheck } from 'lucide-react'

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (data) setUsers(data)
    setLoading(false)
  }

  const toggleSuspend = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('users')
      .update({ is_suspended: !currentStatus })
      .eq('id', id)
      
    if (!error) {
      fetchUsers()
    }
  }

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8 font-sans w-full max-w-7xl mx-auto">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">User Management</h2>
          <p className="text-gray-500">View and manage all patients and caregivers.</p>
        </div>
        <div className="flex items-center gap-2 max-w-sm w-full">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input 
              type="text" 
              placeholder="Search by name or email..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm">
        <div className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Details</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-gray-500">Loading users...</TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-gray-500">No users found.</TableCell>
                </TableRow>
              ) : filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium text-gray-900">{user.full_name}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'patient' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.language_preference === 'hi' ? 'Hindi' : 
                     user.language_preference === 'bn' ? 'Bengali' : 
                     user.language_preference === 'as' ? 'Assamese' : 'English'}
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {user.is_suspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleSuspend(user.id, user.is_suspended)}
                    >
                      {user.is_suspended ? <UserCheck className="h-4 w-4 mr-1" /> : <Ban className="h-4 w-4 mr-1" />}
                      {user.is_suspended ? 'Activate' : 'Suspend'}
                    </Button>
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
