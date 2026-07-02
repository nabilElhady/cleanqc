'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  ClipboardList,
  Briefcase,
  Users,
  Menu,
  LogOut,
  Smartphone,
  Square,
  CreditCard,
  Send,
  Shield,
  ChevronRight,
} from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { signOut } from '@/app/actions/auth'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<any>
  description: string
}

// Main manager navigation — plain English, no jargon
const managerNavItems: NavItem[] = [
  {
    name: 'Home',
    href: '/dashboard',
    icon: Home,
    description: 'Overview of your operations',
  },
  {
    name: 'Send a Job',
    href: '/dashboard/dispatch',
    icon: Send,
    description: 'Assign a cleaner to a property now',
  },
  {
    name: 'Checklists',
    href: '/templates',
    icon: ClipboardList,
    description: 'Define what cleaners must do at each job',
  },
  {
    name: 'Job History',
    href: '/jobs',
    icon: Briefcase,
    description: 'Review completed jobs & photo proof',
  },
  {
    name: 'My Team',
    href: '/dashboard/team',
    icon: Users,
    description: 'Manage your cleaning crew',
  },
  {
    name: 'Billing',
    href: '/dashboard/billing',
    icon: CreditCard,
    description: 'Manage your subscription',
  },
]

export default function DashboardLayoutClient({
  children,
  isAdmin,
  role,
}: {
  children: React.ReactNode
  isAdmin?: boolean
  role?: string | null
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  // Filter out Billing and Settings for managers
  const filteredNavItems = managerNavItems.filter(item => {
    if (role === 'manager') {
      const isBilling = item.href === '/dashboard/billing' || item.name.toLowerCase() === 'billing'
      const isSettings = item.href.includes('settings') || item.name.toLowerCase().includes('settings')
      if (isBilling || isSettings) return false
    }
    return true
  })

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#FAFAFA] text-[#09090B]">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-[#E4E4E7]">
        <div className="h-6 w-6 bg-[#09090B] flex items-center justify-center">
          <Square className="h-3 w-3 text-white" />
        </div>
        <span className="font-bold tracking-tight text-sm">Crewmark</span>
      </div>

      {/* Admin Portal */}
      {isAdmin && (
        <div className="px-4 pt-4 pb-0">
          <Link
            href="/admin"
            className="flex items-center justify-center gap-2 w-full py-2.5 border border-[#09090B] bg-[#09090B] text-white hover:bg-white hover:text-[#09090B] transition-colors duration-200 font-mono text-[10px] font-bold uppercase tracking-widest rounded-none"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Admin Portal</span>
          </Link>
        </div>
      )}

      {/* Main Nav */}
      <nav className="flex-1 px-4 py-6 space-y-0.5">
        {filteredNavItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              title={item.description}
              className={`group flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-200 cursor-pointer rounded-r-lg border-l-4 ${
                isActive
                  ? 'text-[#09090B] font-bold bg-[#E4E4E7]/50 border-[#09090B]'
                  : 'text-[#71717A] font-medium hover:text-[#09090B] hover:bg-[#F4F4F5] border-transparent hover:border-zinc-300'
              }`}
            >
              <Icon
                strokeWidth={2.5}
                className={`h-4 w-4 shrink-0 transition-colors ${
                  isActive ? 'text-[#09090B]' : 'text-[#A1A1AA] group-hover:text-[#09090B]'
                }`}
              />
              <span className="flex-1">{item.name}</span>
              {isActive && <ChevronRight className="h-3 w-3 text-[#A1A1AA]" />}
            </Link>
          )
        })}
      </nav>


      {/* Sign Out */}
      <div className="p-4 border-t border-[#E4E4E7]">
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2.5 text-sm font-medium text-[#71717A] hover:text-[#09090B] hover:bg-[#F4F4F5] rounded-r-lg border-l-4 border-transparent hover:border-zinc-300 transition-all duration-200 cursor-pointer"
          >
            <LogOut strokeWidth={2.5} className="h-4 w-4 shrink-0 transition-colors text-[#A1A1AA] group-hover:text-[#09090B]" />
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 shrink-0 h-screen sticky top-0 z-20 border-r border-[#E4E4E7] bg-[#FAFAFA]">
        <SidebarContent />
      </aside>

      {/* Mobile Navbar */}
      <div className="md:hidden flex items-center justify-between px-6 py-4 bg-[#FAFAFA] border-b border-[#E4E4E7] sticky top-0 z-30 w-full text-[#09090B]">
        <div className="flex items-center gap-3">
          <div className="h-6 w-6 bg-[#09090B] flex items-center justify-center">
            <Square className="h-3 w-3 text-white" />
          </div>
          <span className="font-bold tracking-tight text-sm">Crewmark</span>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <button className="p-2 text-[#71717A] hover:text-[#09090B] focus:outline-none cursor-pointer">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="p-0 border-r border-[#E4E4E7] bg-[#FAFAFA] text-[#09090B]"
          >
            <SheetHeader className="p-6 pb-2 border-b border-[#E4E4E7]">
              <SheetTitle className="text-left text-xs font-bold uppercase tracking-widest text-[#71717A]">
                Menu
              </SheetTitle>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-100 relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.2)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />
        <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full relative z-10">
          {children}
        </main>
      </div>
    </div>
  )
}
