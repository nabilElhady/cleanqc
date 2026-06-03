'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Briefcase, Users, Menu, LogOut, Smartphone, Square, CreditCard, Zap } from 'lucide-react'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { signOut } from '@/app/actions/auth'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<any>
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Dispatch', href: '/dashboard/dispatch', icon: Zap },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Billing', href: '/pricing', icon: CreditCard },
  { name: 'Crew Portal', href: '/crew/jobs', icon: Smartphone },
]

export default function DashboardLayoutClient({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#FAFAFA] text-[#09090B]">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-[#E4E4E7]">
        <div className="h-6 w-6 bg-[#09090B] flex items-center justify-center">
          <Square className="h-3 w-3 text-white" />
        </div>
        <span className="font-bold tracking-tight text-sm">
          CleanQC
        </span>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors duration-200 cursor-pointer ${
                isActive ? 'text-[#09090B] font-bold' : 'text-[#71717A] font-medium hover:text-[#09090B]'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${
                  isActive ? 'text-[#09090B]' : 'text-[#71717A]'
                }`}
              />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

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
          <SheetContent side="left" className="p-0 border-r border-[#E4E4E7] bg-[#FAFAFA] text-[#09090B]">
            <SheetHeader className="p-6 pb-2 border-b border-[#E4E4E7]">
              <SheetTitle className="text-left text-xs font-bold uppercase tracking-widest text-[#71717A]">Menu</SheetTitle>
            </SheetHeader>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-background">
        <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full">{children}</main>
      </div>
    </div>
  )
}
