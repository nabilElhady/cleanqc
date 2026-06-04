import * as React from 'react'
import { signOut } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { LogOut, Square, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const metadata = {
  title: 'CleanQC Crew Portal',
  description: 'Mobile interface for cleaning crew operations.',
}

export default async function CrewLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Authenticate user & check if they are owner/manager
  const { data: { user } } = await supabase.auth.getUser()
  let isManagerOrOwner = false

  if (user) {
    const db = createAdminClient()
    const { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    isManagerOrOwner = profile?.role === 'owner' || profile?.role === 'manager'
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#09090B] font-sans antialiased pb-12 relative">
      {/* Crisp Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
      
      {/* Mobile-optimized Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-[#E4E4E7] bg-[#FFFFFF]/90 backdrop-blur-md relative z-10">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/crew/jobs" className="flex items-center gap-3 group">
            <div className="h-8 w-8 bg-[#09090B] flex items-center justify-center">
              <Square className="h-3.5 w-3.5 text-[#FFFFFF]" fill="currentColor" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-[#09090B]">
              CleanQC
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-[#FAFAFA] text-[#71717A] border border-[#E4E4E7]">
              Crew
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {isManagerOrOwner && (
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="text-[#09090B] hover:text-[#09090B] border-[#E4E4E7] bg-[#FAFAFA] hover:bg-[#E4E4E7] cursor-pointer h-9 px-3 text-[10px] font-bold uppercase tracking-widest"
                >
                  <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                  Manager Portal
                </Button>
              </Link>
            )}

            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                className="text-[#71717A] hover:text-[#09090B] hover:bg-[#FAFAFA] cursor-pointer transition-colors h-9 px-3 text-[10px] font-bold uppercase tracking-widest"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content container limited to mobile view max width */}
      <main className="max-w-lg mx-auto px-4 pt-6 relative z-10">
        {children}
      </main>
    </div>
  )
}
