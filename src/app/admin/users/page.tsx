'use client'

import { useState, useEffect } from 'react'
import { ShieldBan, Trash2, Shield, MoreVertical } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function toggleSuspend(userId: string, isSuspended: boolean) {
    if (!confirm(`Are you sure you want to ${isSuspended ? 'unsuspend' : 'suspend'} this user?`)) return

    try {
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suspend: !isSuspended }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to toggle suspend status')
      }
      fetchUsers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function deleteUser(userId: string) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this user? This cannot be undone.')) return

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete user')
      }
      fetchUsers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function changeRole(userId: string, newRole: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to change role')
      }
      fetchUsers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function toggleSuperadmin(userId: string, isSuperadmin: boolean) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_superadmin: !isSuperadmin }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to toggle superadmin')
      }
      fetchUsers()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) return <div className="p-8 font-mono text-sm uppercase tracking-wider">Loading Users...</div>
  if (error) return <div className="p-8 font-mono text-sm uppercase tracking-wider text-red-500">Error: {error}</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">User Management</h2>
          <p className="font-mono text-sm text-[#71717A] uppercase tracking-wider">
            Manage all platform users, roles, and suspensions
          </p>
        </div>
        <div className="font-mono text-xs uppercase tracking-wider px-3 py-1.5 border border-[#E4E4E7] bg-white">
          Total: {users.length}
        </div>
      </div>

      <div className="border border-[#E4E4E7] overflow-x-auto bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E4E4E7] bg-[#F4F4F5]">
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Email / ID</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Role</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Superadmin</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Status</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSuspended = !!u.suspended_at
              return (
                <tr key={u.id} className="border-b border-[#E4E4E7] hover:bg-[#F4F4F5]/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-[#09090B] truncate max-w-[200px]">{u.email}</div>
                    <div className="font-mono text-xs text-[#71717A] truncate max-w-[200px]">{u.id}</div>
                  </td>
                  <td className="p-4">
                    <select
                      value={u.role || 'crew'}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="font-mono text-xs uppercase bg-transparent border border-[#E4E4E7] p-1 text-[#09090B] focus:border-[#09090B] outline-none"
                    >
                      <option value="owner">Owner</option>
                      <option value="manager">Manager</option>
                      <option value="crew">Crew</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => toggleSuperadmin(u.id, u.is_superadmin)}
                      className={`font-mono text-xs uppercase px-2 py-1 border ${
                        u.is_superadmin 
                          ? 'border-indigo-500 text-indigo-500 bg-indigo-50' 
                          : 'border-[#E4E4E7] text-[#71717A] hover:border-[#09090B]'
                      }`}
                    >
                      {u.is_superadmin ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="p-4">
                    {isSuspended ? (
                      <span className="font-mono text-xs uppercase tracking-wider text-red-500 border border-red-200 bg-red-50 px-2 py-1 flex items-center w-fit gap-1">
                        <ShieldBan className="w-3 h-3" /> Suspended
                      </span>
                    ) : (
                      <span className="font-mono text-xs uppercase tracking-wider text-green-600 border border-green-200 bg-green-50 px-2 py-1 w-fit flex items-center gap-1">
                        <Shield className="w-3 h-3" /> Active
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => toggleSuspend(u.id, isSuspended)}
                      className={`font-mono text-xs uppercase px-3 py-1 border ${
                        isSuspended 
                          ? 'border-green-600 text-green-600 hover:bg-green-50' 
                          : 'border-amber-600 text-amber-600 hover:bg-amber-50'
                      }`}
                    >
                      {isSuspended ? 'Unsuspend' : 'Suspend'}
                    </button>
                    <button
                      onClick={() => deleteUser(u.id)}
                      className="font-mono text-xs uppercase px-3 py-1 border border-red-600 text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center font-mono text-sm text-[#71717A] uppercase tracking-wider">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
