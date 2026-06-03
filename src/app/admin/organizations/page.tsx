'use client'

import { useState, useEffect } from 'react'
import { Building, Trash2, Edit } from 'lucide-react'

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOrgs()
  }, [])

  async function fetchOrgs() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/organizations')
      if (!res.ok) throw new Error('Failed to fetch organizations')
      const data = await res.json()
      setOrgs(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function updateOrg(orgId: string, updates: any) {
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error('Failed to update organization')
      fetchOrgs()
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function deleteOrg(orgId: string) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this organization AND all its members/jobs? This cannot be undone.')) return

    try {
      const res = await fetch(`/api/admin/organizations/${orgId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete organization')
      fetchOrgs()
    } catch (err: any) {
      alert(err.message)
    }
  }

  function handleNameEdit(orgId: string, currentName: string) {
    const newName = prompt('Enter new organization name:', currentName)
    if (newName && newName !== currentName) {
      updateOrg(orgId, { name: newName })
    }
  }

  if (loading) return <div className="p-8 font-mono text-sm uppercase tracking-wider">Loading Organizations...</div>
  if (error) return <div className="p-8 font-mono text-sm uppercase tracking-wider text-red-500">Error: {error}</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Organizations</h2>
          <p className="font-mono text-sm text-[#71717A] uppercase tracking-wider">
            Manage all tenant organizations and subscriptions
          </p>
        </div>
        <div className="font-mono text-xs uppercase tracking-wider px-3 py-1.5 border border-[#E4E4E7] bg-white">
          Total: {orgs.length}
        </div>
      </div>

      <div className="border border-[#E4E4E7] overflow-x-auto bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E4E4E7] bg-[#F4F4F5]">
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Name / ID</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Subscription Status</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Created At</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => (
              <tr key={org.id} className="border-b border-[#E4E4E7] hover:bg-[#F4F4F5]/50 transition-colors">
                <td className="p-4">
                  <div className="font-medium text-[#09090B] flex items-center gap-2">
                    {org.name || 'Unnamed Org'}
                    <button onClick={() => handleNameEdit(org.id, org.name)} className="text-[#71717A] hover:text-[#09090B]">
                      <Edit className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="font-mono text-xs text-[#71717A] truncate max-w-[200px] mt-1">{org.id}</div>
                </td>
                <td className="p-4">
                  <select
                    value={org.subscription_status || 'inactive'}
                    onChange={(e) => updateOrg(org.id, { subscription_status: e.target.value })}
                    className="font-mono text-xs uppercase bg-transparent border border-[#E4E4E7] p-1 text-[#09090B] focus:border-[#09090B] outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="trialing">Trialing</option>
                    <option value="inactive">Inactive</option>
                    <option value="past_due">Past Due</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </td>
                <td className="p-4 font-mono text-xs text-[#71717A]">
                  {new Date(org.created_at).toLocaleDateString()}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => deleteOrg(org.id)}
                    className="font-mono text-xs uppercase px-3 py-1 border border-red-600 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2 ml-auto"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center font-mono text-sm text-[#71717A] uppercase tracking-wider">
                  No organizations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
