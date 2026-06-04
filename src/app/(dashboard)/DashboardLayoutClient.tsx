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
}: {
  children: React.ReactNode
  isAdmin?: boolean
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#FAFAFA] text-[#09090B]">
      {/* Brand */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-[#E4E4E7]">
        <div className="h-6 w-6 bg-[#09090B] flex items-center justify-center">
          <Square className="h-3 w-3 text-white" />
        </div>
        <span className="font-bold tracking-tight text-sm">CleanQC</span>
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
        {managerNavItems.map((item) => {
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
              className={`group flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-150 cursor-pointer rounded-sm ${
                isActive
                  ? 'text-[#09090B] font-bold bg-[#F4F4F5]'
                  : 'text-[#71717A] font-medium hover:text-[#09090B] hover:bg-[#F4F4F5]'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? 'text-[#09090B]' : 'text-[#A1A1AA] group-hover:text-[#09090B]'
                }`}
              />
              <span className="flex-1">{item.name}</span>
              {isActive && <ChevronRight className="h-3 w-3 text-[#A1A1AA]" />}
            </Link>
          )
        })}
      </nav>

      {/* ── Crew View — visually separated at bottom ── */}
      <div className="px-4 pb-2">
        <div className="border-t border-[#E4E4E7] pt-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-[#A1A1AA] px-3 mb-2">
            Crew Access
          </p>
          <Link
            href="/crew/jobs"
            onClick={() => setMobileOpen(false)}
            title="Preview what your cleaners see on their phone"
            className={`group flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-150 cursor-pointer rounded-sm ${
              pathname.startsWith('/crew')
                ? 'text-[#09090B] font-bold bg-[#F4F4F5]'
                : 'text-[#71717A] font-medium hover:text-[#09090B] hover:bg-[#F4F4F5]'
            }`}
          >
            <Smartphone
              className={`h-4 w-4 shrink-0 ${
                pathname.startsWith('/crew')
                  ? 'text-[#09090B]'
                  : 'text-[#A1A1AA] group-hover:text-[#09090B]'
              }`}
            />
            <span className="flex-1">Crew View</span>
            <span className="text-[9px] font-bold bg-[#E4E4E7] text-[#71717A] px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
              Preview
            </span>
          </Link>
        </div>
      </div>

      {/* Sign Out */}
      <div className="p-4 border-t border-[#E4E4E7]">
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-[#71717A] hover:text-[#09090B] transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
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
          <span className="font-bold tracking-tight text-sm">CleanQC</span>
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
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-background relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(9,9,11,0.09)_1.5px,transparent_1.5px),linear-gradient(to_bottom,rgba(9,9,11,0.09)_1.5px,transparent_1.5px)] bg-[size:32px_32px] pointer-events-none z-0" />
        <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full relative z-10">
          {children}
        </main>
      </div>
    </div>
  )
}
