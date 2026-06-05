import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function AdminAuditPage() {
  const db = createAdminClient()

  const { data: logs, error } = await db
    .from('admin_audit_log')
    .select('id, admin_id, action, target_type, target_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return <div className="p-8 font-mono text-sm uppercase tracking-wider text-red-500">Error: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">Audit Log</h2>
          <p className="font-mono text-sm text-[#71717A] uppercase tracking-wider">
            Recent admin actions (Showing last 100)
          </p>
        </div>
      </div>

      <div className="border border-[#E4E4E7] overflow-x-auto bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E4E4E7] bg-[#F4F4F5]">
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Date</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Admin</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Action</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Target</th>
              <th className="p-4 font-mono text-xs font-bold uppercase tracking-widest text-[#09090B]">Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs?.map((log) => (
              <tr key={log.id} className="border-b border-[#E4E4E7] hover:bg-[#F4F4F5]/50 transition-colors">
                <td className="p-4 font-mono text-xs text-[#71717A] whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="p-4 font-mono text-xs text-[#09090B]">
                  {log.admin_id}
                </td>
                <td className="p-4">
                  <span className="font-mono text-xs uppercase bg-[#09090B] text-white px-2 py-1">
                    {log.action}
                  </span>
                </td>
                <td className="p-4 font-mono text-xs text-[#71717A]">
                  {log.target_type}: <br/> {log.target_id}
                </td>
                <td className="p-4 font-mono text-xs text-[#71717A] max-w-xs truncate" title={JSON.stringify(log.metadata)}>
                  {log.metadata ? JSON.stringify(log.metadata) : '-'}
                </td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={5} className="p-8 text-center font-mono text-sm text-[#71717A] uppercase tracking-wider">
                  No audit logs found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
