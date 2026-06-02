'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { Briefcase, CheckCircle, FileText, Users, ShieldCheck } from 'lucide-react'

interface DashboardClientProps {
  userEmail: string
  activeJobsCount: number
  pendingJobsCount: number
  completedJobsCount: number
  templatesCount: number
  teamCount: number
}

function FlatCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-[#FFFFFF] border border-[#E4E4E7] p-6 flex flex-col justify-between h-[115px] transition-colors duration-200 group hover:border-[#09090B] ${className}`}
    >
      {children}
    </div>
  )
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.15, ease: 'easeOut' as any } },
}

export function DashboardClient({
  userEmail,
  activeJobsCount,
  pendingJobsCount,
  completedJobsCount,
  templatesCount,
  teamCount,
}: DashboardClientProps) {
  const stats = [
    {
      label: 'Active Jobs',
      value: activeJobsCount,
      sub: `${pendingJobsCount} pending dispatch`,
      Icon: Briefcase,
    },
    {
      label: 'Completed Jobs',
      value: completedJobsCount,
      sub: 'All-time dispatches',
      Icon: CheckCircle,
      success: true,
    },
    {
      label: 'Templates',
      value: templatesCount,
      sub: 'SOP standards',
      Icon: FileText,
    },
    {
      label: 'Total Team',
      value: teamCount,
      sub: 'Staff members',
      Icon: Users,
    },
  ]

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b border-[#E4E4E7]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">Overview</span>
          <h1 className="text-3xl font-black tracking-tight mt-1 text-[#09090B]">
            Manager Dashboard
          </h1>
          <p className="text-[#71717A] text-sm mt-1">Real-time insights and monitoring of your cleaning operations.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAFAFA] border border-[#E4E4E7] text-[10px] font-bold uppercase tracking-widest text-[#09090B]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified Workspace
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {stats.map(({ label, value, sub, Icon, success }) => (
          <motion.div key={label} variants={cardVariants}>
            <FlatCard>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className={`text-[10px] font-bold uppercase tracking-widest text-[#71717A]`}>{label}</span>
                  <p className="text-3xl font-black tracking-tight text-[#09090B]">{value}</p>
                  <p className="text-[#71717A] text-[10px] uppercase font-bold tracking-wider mt-1">{sub}</p>
                </div>
                <div className={`h-11 w-11 flex items-center justify-center border ${success ? 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30' : 'bg-[#FAFAFA] text-[#09090B] border-[#E4E4E7]'}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </FlatCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="border border-[#E4E4E7] bg-[#FFFFFF] p-8 md:p-10 relative overflow-hidden group hover:border-[#09090B] transition-colors duration-300"
      >
        <div className="space-y-2 max-w-xl relative z-10">
          <h2 className="text-lg font-bold text-[#09090B]">Welcome back to your workspace!</h2>
          <p className="text-[#71717A] text-sm leading-relaxed">
            You are logged in as <span className="text-[#09090B] font-bold">{userEmail}</span>. Use the sidebar menu to dispatch new properties, manage your standard operational procedure checklists, add teammates, or overview live progress.
          </p>
        </div>
      </motion.div>
    </div>
  )
}
