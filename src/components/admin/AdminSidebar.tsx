'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, Building, Briefcase, FileText, Settings } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AdminSidebar() {
  const pathname = usePathname()

  const navLinks = [
    { href: '/admin', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/organizations', label: 'Organizations', icon: Building },
    { href: '/admin/jobs', label: 'Jobs Monitor', icon: Briefcase },
    { href: '/admin/audit', label: 'Audit Log', icon: FileText },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ]

  return (
    <aside className="w-64 border-r border-[#E4E4E7] bg-white/50 backdrop-blur-sm hidden md:block">
      <nav className="p-4 space-y-2">
        {navLinks.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex items-center space-x-3 px-3 py-2.5 text-sm font-medium font-mono uppercase tracking-wider transition-all duration-200 rounded-none overflow-hidden group ${
                isActive ? 'text-[#09090B] font-bold' : 'text-[#71717A] hover:text-[#09090B]'
              }`}
            >
              {/* Background Highlight for Active State */}
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-bg"
                  className="absolute inset-0 bg-[#F4F4F5] border-l-2 border-[#09090B]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              
              {/* Hover highlight for inactive links */}
              {!isActive && (
                <div className="absolute inset-0 bg-[#F4F4F5] transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-0" />
              )}

              {/* Content */}
              <div className="relative z-10 flex items-center space-x-3 w-full">
                <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span>{link.label}</span>
              </div>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
