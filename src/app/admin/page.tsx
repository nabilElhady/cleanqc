import { createAdminClient } from '@/lib/supabase/admin'
import { Users, Building, Briefcase, CreditCard } from 'lucide-react'

// Force dynamic rendering to ensure fresh data on load
export const dynamic = 'force-dynamic' 

export default async function AdminDashboardPage() {
  const db = createAdminClient()

  // 1. Fetch total users
  const { count: usersCount } = await db
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  // 2. Fetch total orgs
  const { count: orgsCount } = await db
    .from('organizations')
    .select('*', { count: 'exact', head: true })

  // 3. Fetch active subscriptions (active or trialing)
  const { count: activeSubsCount } = await db
    .from('organizations')
    .select('*', { count: 'exact', head: true })
    .in('subscription_status', ['active', 'trialing'])

  // 4. Fetch total jobs
  const { count: jobsCount } = await db
    .from('jobs')
    .select('*', { count: 'exact', head: true })

  // 5. Recent signups
  const { data: recentProfiles } = await db
    .from('profiles')
    .select('id, role, created_at, organizations(name)')
    .order('created_at', { ascending: false })
    .limit(10)

  const stats = [
    { label: 'Total Users', value: usersCount || 0, icon: Users },
    { label: 'Total Orgs', value: orgsCount || 0, icon: Building },
    { label: 'Active Subs', value: activeSubsCount || 0, icon: CreditCard },
    { label: 'Total Jobs', value: jobsCount || 0, icon: Briefcase },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Platform Overview</h2>
        <p className="font-mono text-sm text-[#71717A] uppercase tracking-wider">
          Real-time system metrics
        </p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon
          return (
            <div key={idx} className="p-6 border border-[#E4E4E7] bg-white hover:border-[#09090B] transition-colors">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#71717A]">
                  {stat.label}
                </span>
                <Icon className="w-4 h-4 text-[#09090B]" />
              </div>
              <div className="text-4xl font-light tracking-tight text-[#09090B]">
                {stat.value}
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Signups */}
      <div className="mt-8">
        <h3 className="text-lg font-bold tracking-tight mb-4 uppercase font-mono">Recent Signups</h3>
        <div className="border border-[#E4E4E7] overflow-x-auto bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E4E4E7] bg-[#F4F4F5]">
                <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">User ID</th>
                <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Role</th>
                <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Organization</th>
                <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Joined At</th>
              </tr>
            </thead>
            <tbody>
              {recentProfiles?.map((profile) => (
                <tr key={profile.id} className="border-b border-[#E4E4E7] hover:bg-[#F4F4F5]/50 transition-colors">
                  <td className="p-4 font-mono text-xs text-[#71717A] truncate max-w-[200px]">
                    {profile.id}
                  </td>
                  <td className="p-4 font-mono text-xs uppercase font-bold text-[#09090B]">
                    {profile.role || 'Unknown'}
                  </td>
                  <td className="p-4 font-mono text-sm text-[#09090B]">
                    {profile.organizations ? (profile.organizations as any).name : 'No Org'}
                  </td>
                  <td className="p-4 font-mono text-xs text-[#71717A]">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {(!recentProfiles || recentProfiles.length === 0) && (
                <tr>
                  <td colSpan={4} className="p-8 text-center font-mono text-sm text-[#71717A] uppercase tracking-wider">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
