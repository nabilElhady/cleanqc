import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

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

  // Fetch the user's role
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single()

  // Strict evaluation: Kick non-admins back to their standard dashboard
  if (profile?.is_superadmin !== true) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-white text-[#09090B] selection:bg-[#09090B] selection:text-white">
      {/* Global Admin Header */}
      <header className="border-b border-[#E4E4E7] px-8 py-4 flex items-center justify-between">
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
      
      <main className="p-8 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  )
}
