'use client'

import * as React from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Briefcase,
  CheckCircle,
  ClipboardList,
  Users,
  ShieldCheck,
  Send,
  Plus,
  ArrowRight,
  CheckCircle2,
  Circle,
} from 'lucide-react'

interface DashboardClientProps {
  userEmail: string
  activeJobsCount: number
  pendingJobsCount: number
  completedJobsCount: number
  templatesCount: number
  teamCount: number
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.18, ease: 'easeOut' as any } },
}

export function DashboardClient({
  userEmail,
  activeJobsCount,
  pendingJobsCount,
  completedJobsCount,
  templatesCount,
  teamCount,
}: DashboardClientProps) {
  // Determine setup progress — show guide until all 3 steps are done
  const hasChecklists = templatesCount > 0
  const hasCrew = teamCount > 1 // teamCount includes the owner themselves
  const hasJobs = completedJobsCount + activeJobsCount + pendingJobsCount > 0
  const isSetupComplete = hasChecklists && hasCrew && hasJobs

  const setupSteps = [
    {
      done: hasChecklists,
      label: 'Create your first checklist',
      description: 'Define the tasks your cleaners must complete at each job',
      href: '/templates',
      cta: 'Go to Checklists',
    },
    {
      done: hasCrew,
      label: 'Add a crew member',
      description: 'Invite your cleaners so you can assign jobs to them',
      href: '/dashboard/team',
      cta: 'Go to My Team',
    },
    {
      done: hasJobs,
      label: 'Send your first job',
      description: 'Assign a cleaner and checklist to a property',
      href: '/dashboard/dispatch',
      cta: 'Send a Job',
    },
  ]

  const stats = [
    {
      label: 'Active Jobs',
      value: activeJobsCount,
      sub: `${pendingJobsCount} waiting to start`,
      icon: Briefcase,
      href: '/jobs',
    },
    {
      label: 'Completed Jobs',
      value: completedJobsCount,
      sub: 'With photo proof',
      icon: CheckCircle,
      href: '/jobs',
      success: true,
    },
    {
      label: 'Checklists',
      value: templatesCount,
      sub: 'Ready to use',
      icon: ClipboardList,
      href: '/templates',
    },
    {
      label: 'Team Size',
      value: teamCount,
      sub: 'Staff members',
      icon: Users,
      href: '/dashboard/team',
    },
  ]

  return (
    <div className="space-y-8 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b border-[#E4E4E7]">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
            Overview
          </span>
          <h1 className="text-3xl font-black tracking-tight mt-1 text-[#09090B]">Home</h1>
          <p className="text-[#71717A] text-sm mt-1">
            Logged in as <span className="text-[#09090B] font-semibold">{userEmail}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FAFAFA] border border-[#E4E4E7] text-[10px] font-bold uppercase tracking-widest text-[#09090B]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified Workspace
          </span>
        </div>
      </div>

      {/* ── Getting Started Guide (hidden once all 3 steps done) ── */}
      {!isSetupComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="border border-[#09090B] bg-white p-6 md:p-8"
        >
          <div className="mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
              Setup Guide
            </span>
            <h2 className="text-xl font-black text-[#09090B] mt-1">
              3 steps to your first job
            </h2>
            <p className="text-[#71717A] text-sm mt-1">
              Complete these steps to get your team running.
            </p>
          </div>

          <div className="space-y-4">
            {setupSteps.map((step, i) => (
              <div
                key={i}
                className={`flex items-start gap-4 p-4 border transition-colors ${
                  step.done
                    ? 'border-[#16A34A]/30 bg-[#16A34A]/5'
                    : 'border-[#E4E4E7] hover:border-[#09090B]'
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {step.done ? (
                    <CheckCircle2 className="h-5 w-5 text-[#16A34A]" />
                  ) : (
                    <Circle className="h-5 w-5 text-[#D4D4D8]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-bold ${
                      step.done ? 'line-through text-[#71717A]' : 'text-[#09090B]'
                    }`}
                  >
                    {i + 1}. {step.label}
                  </p>
                  {!step.done && (
                    <p className="text-xs text-[#71717A] mt-0.5">{step.description}</p>
                  )}
                </div>
                {!step.done && (
                  <Link
                    href={step.href}
                    className="shrink-0 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[#09090B] border border-[#09090B] px-3 py-1.5 hover:bg-[#09090B] hover:text-white transition-colors"
                  >
                    {step.cta}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Quick Actions ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] mb-3">
          Quick Actions
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/dispatch"
            className="flex items-center gap-2 bg-[#09090B] text-white px-4 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-[#27272A] transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
            Send a Job
          </Link>
          <Link
            href="/templates"
            className="flex items-center gap-2 border border-[#E4E4E7] bg-white text-[#09090B] px-4 py-2.5 text-xs font-bold uppercase tracking-widest hover:border-[#09090B] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Checklist
          </Link>
          <Link
            href="/dashboard/team"
            className="flex items-center gap-2 border border-[#E4E4E7] bg-white text-[#09090B] px-4 py-2.5 text-xs font-bold uppercase tracking-widest hover:border-[#09090B] transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Crew Member
          </Link>
        </div>
      </div>

      {/* ── Stat Cards (clickable) ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map(({ label, value, sub, icon: Icon, href, success }) => (
          <motion.div key={label} variants={cardVariants}>
            <Link href={href} className="block group">
              <div className="relative overflow-hidden bg-white border border-[#E4E4E7] p-6 h-[115px] flex flex-col justify-between transition-colors duration-200 hover:border-[#09090B]">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717A]">
                      {label}
                    </span>
                    <p className="text-3xl font-black tracking-tight text-[#09090B]">{value}</p>
                    <p className="text-[#71717A] text-[10px] uppercase font-bold tracking-wider">
                      {sub}
                    </p>
                  </div>
                  <div
                    className={`h-11 w-11 flex items-center justify-center border ${
                      success
                        ? 'bg-[#16A34A]/10 text-[#16A34A] border-[#16A34A]/30'
                        : 'bg-[#FAFAFA] text-[#09090B] border-[#E4E4E7]'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
