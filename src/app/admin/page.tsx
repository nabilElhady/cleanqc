import { createAdminClient } from '@/lib/supabase/admin'

// Force dynamic rendering to ensure fresh data on load
export const dynamic = 'force-dynamic' 

export default async function AdminDashboardPage() {
  const db = createAdminClient()

  // Fetch all organizations globally bypassing RLS
  const { data: organizations, error } = await db
    .from('organizations')
    .select('id, name, paddle_subscription_id, subscription_status, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="p-6 border border-red-500 font-mono text-red-500 text-sm uppercase">
        Failed to load global organizational data: {error.message}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-4xl font-bold tracking-tight mb-2">Platform Overview</h2>
        <p className="font-mono text-sm text-gray-500 uppercase tracking-wider">
          Total Active Tenants: {organizations?.length || 0}
        </p>
      </div>

      <div className="border border-[#E4E4E7] overflow-x-auto bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E4E4E7] bg-gray-50">
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Organization ID</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Name</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Status</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Paddle Sub ID</th>
            </tr>
          </thead>
          <tbody>
            {organizations?.map((org) => (
              <tr key={org.id} className="border-b border-[#E4E4E7] hover:bg-gray-50 transition-colors">
                <td className="p-4 font-mono text-sm text-gray-500 truncate max-w-[150px]">
                  {org.id}
                </td>
                <td className="p-4 font-medium text-[#09090B]">
                  {org.name || 'Unnamed Org'}
                </td>
                <td className="p-4">
                  <span className={`inline-block px-2 py-1 border font-mono text-xs tracking-wider uppercase ${
                    org.subscription_status === 'active' || org.subscription_status === 'trialing'
                      ? 'border-green-600 text-green-600'
                      : 'border-red-600 text-red-600'
                  }`}>
                    {org.subscription_status || 'Inactive'}
                  </span>
                </td>
                <td className="p-4 font-mono text-sm text-gray-500 truncate max-w-[200px]">
                  {org.paddle_subscription_id || 'N/A'}
                </td>
              </tr>
            ))}
            {(!organizations || organizations.length === 0) && (
              <tr>
                <td colSpan={4} className="p-8 text-center font-mono text-sm text-gray-500 uppercase tracking-wider">
                  No organizations found in database.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
