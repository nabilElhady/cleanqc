'use client'

import { useState, useEffect } from 'react'
import { Briefcase, Trash2, CheckCircle } from 'lucide-react'

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchJobs()
  }, [])

  async function fetchJobs() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/jobs')
      if (!res.ok) throw new Error('Failed to fetch jobs')
      const data = await res.json()
      setJobs(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function deleteJob(jobId: string) {
    if (!confirm('Are you sure you want to permanently delete this job?')) return

    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete job')
      fetchJobs()
    } catch (err: any) {
      alert(err.message)
    }
  }

  async function forceCompleteJob(jobId: string) {
    if (!confirm('Force this job to completed status?')) return

    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      if (!res.ok) throw new Error('Failed to force complete job')
      fetchJobs()
    } catch (err: any) {
      alert(err.message)
    }
  }

  if (loading) return <div className="p-8 font-mono text-sm uppercase tracking-wider">Loading Jobs...</div>
  if (error) return <div className="p-8 font-mono text-sm uppercase tracking-wider text-red-500">Error: {error}</div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Global Job Monitor</h2>
          <p className="font-mono text-sm text-[#71717A] uppercase tracking-wider">
            Monitor and manage jobs across all tenant organizations
          </p>
        </div>
        <div className="font-mono text-xs uppercase tracking-wider px-3 py-1.5 border border-[#E4E4E7] bg-white">
          Total: {jobs.length}
        </div>
      </div>

      <div className="border border-[#E4E4E7] overflow-x-auto bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E4E4E7] bg-[#F4F4F5]">
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Title / ID</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Organization</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Status</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Created At</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b border-[#E4E4E7] hover:bg-[#F4F4F5]/50 transition-colors">
                <td className="p-4">
                  <div className="font-medium text-[#09090B]">{job.title}</div>
                  <div className="font-mono text-xs text-[#71717A] truncate max-w-[200px] mt-1">{job.id}</div>
                </td>
                <td className="p-4 font-mono text-sm text-[#09090B]">
                  {job.organizations ? job.organizations.name : 'Unknown Org'}
                </td>
                <td className="p-4">
                  <span className={`inline-block px-2 py-1 border font-mono text-xs tracking-wider uppercase ${
                    job.status === 'completed' ? 'border-green-600 text-green-600' :
                    job.status === 'active' ? 'border-blue-600 text-blue-600' :
                    'border-amber-600 text-amber-600'
                  }`}>
                    {job.status}
                  </span>
                </td>
                <td className="p-4 font-mono text-xs text-[#71717A]">
                  {new Date(job.created_at).toLocaleDateString()}
                </td>
                <td className="p-4 text-right space-x-2">
                  {job.status !== 'completed' && (
                    <button
                      onClick={() => forceCompleteJob(job.id)}
                      className="font-mono text-xs uppercase px-3 py-1 border border-green-600 text-green-600 hover:bg-green-50"
                    >
                      Complete
                    </button>
                  )}
                  <button
                    onClick={() => deleteJob(job.id)}
                    className="font-mono text-xs uppercase px-3 py-1 border border-red-600 text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center font-mono text-sm text-[#71717A] uppercase tracking-wider">
                  No jobs found across the platform.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
