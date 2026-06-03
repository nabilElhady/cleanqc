'use client'

import { useState, useEffect } from 'react'

export default function AdminSettingsPage() {
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const res = await fetch('/api/admin/settings')
      if (res.ok) {
        const data = await res.json()
        setMaintenanceMode(data.maintenance_mode === 'true' || data.maintenance_mode === true)
      }
    } finally {
      setLoading(false)
    }
  }

  async function toggleMaintenance() {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenance_mode: !maintenanceMode }),
      })
      if (res.ok) {
        setMaintenanceMode(!maintenanceMode)
      }
    } catch (err: any) {
      alert('Failed to update settings')
    }
  }

  if (loading) return <div className="p-8 font-mono text-sm uppercase tracking-wider">Loading Settings...</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">System Settings</h2>
        <p className="font-mono text-sm text-[#71717A] uppercase tracking-wider">
          Global platform configuration
        </p>
      </div>

      <div className="border border-[#E4E4E7] bg-white p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-[#E4E4E7] pb-6">
          <div>
            <h3 className="font-bold text-lg">Maintenance Mode</h3>
            <p className="text-sm text-[#71717A] mt-1">
              When enabled, a banner will be shown to all users indicating that the platform is undergoing maintenance.
            </p>
          </div>
          <button
            onClick={toggleMaintenance}
            className={`font-mono text-xs uppercase px-4 py-2 border font-bold transition-colors ${
              maintenanceMode 
                ? 'bg-red-600 text-white border-red-600 hover:bg-red-700' 
                : 'bg-white text-[#09090B] border-[#09090B] hover:bg-gray-50'
            }`}
          >
            {maintenanceMode ? 'Disable Maintenance' : 'Enable Maintenance'}
          </button>
        </div>

        <div>
          <h3 className="font-bold text-lg">Billing Configuration</h3>
          <p className="text-sm text-[#71717A] mt-1">
            Paddle Environment: <span className="font-mono bg-gray-100 px-1">{process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox'}</span>
          </p>
          <p className="text-sm text-[#71717A] mt-1">
            Trial Duration is managed within the Paddle Dashboard.
          </p>
        </div>
      </div>
    </div>
  )
}
