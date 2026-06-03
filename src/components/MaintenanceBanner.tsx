import { createAdminClient } from '@/lib/supabase/admin'

export default async function MaintenanceBanner() {
  const db = createAdminClient()
  const { data } = await db.from('system_settings').select('value').eq('id', 'maintenance_mode').single()
  
  const isMaintenanceMode = data?.value === 'true' || data?.value === true

  if (!isMaintenanceMode) return null

  return (
    <div className="bg-amber-500 text-black text-center py-2 px-4 font-mono text-sm uppercase tracking-wider font-bold shadow-md z-50 relative">
      ⚠️ The platform is currently undergoing maintenance. Some features may be unavailable or unstable.
    </div>
  )
}
