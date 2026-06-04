import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Use admin client so RLS never blocks reading is_superadmin
  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  // Strict evaluation: Kick non-admins back to their standard dashboard
  if (profile?.is_superadmin !== true) {
    redirect('/dashboard')
  }


  return (
    <div className="min-h-screen bg-white text-[#09090B] selection:bg-[#09090B] selection:text-white relative flex flex-col">
      {/* Crisp Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
      
      {/* Global Admin Header */}
      <header className="border-b border-[#E4E4E7] px-8 py-4 flex items-center justify-between relative z-20 bg-white/90 backdrop-blur-sm">
        <div className="flex items-center space-x-4">
          <div className="w-4 h-4 bg-[#09090B]"></div>
          <h1 className="font-mono text-sm tracking-widest uppercase font-bold">
            System Overseer
          </h1>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/dashboard"
            className="font-mono text-xs uppercase tracking-wider px-3 py-1.5 border border-[#09090B] hover:bg-[#09090B] hover:text-white transition-colors duration-150 font-bold rounded-none"
          >
            Exit to Dashboard
          </Link>
          <div className="font-mono text-xs uppercase tracking-wider px-2 py-1 border border-[#09090B] bg-[#09090B] text-white">
            Admin Access Active
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 relative z-10 max-w-[1600px] w-full mx-auto">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
