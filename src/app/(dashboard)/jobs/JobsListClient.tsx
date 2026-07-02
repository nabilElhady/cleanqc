'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Briefcase, Calendar, MapPin, User, FileText, CheckCircle, ChevronRight, Search, Clock } from 'lucide-react'
import { StatusPill } from '@/components/ui/status-pill'

interface Job {
  id: string
  title: string
  location: string
  status: string
  scheduled_at: string
  completed_at: string | null
  template_id: string
  templates: { id: string; name: string } | null
  profiles: { id: string; full_name: string | null } | null
}

interface JobsListClientProps {
  initialJobs: Job[]
}

type TabType = 'all' | 'pending' | 'in_progress' | 'completed'

function FlatCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative rounded-2xl bg-white border border-[#E4E4E7] shadow-md hover:shadow-lg hover:-translate-y-0.5 p-6 flex flex-col justify-between h-[230px] transition-all duration-200 group z-10 ${className}`}
    >
      {children}
    </div>
  )
}

export function JobsListClient({ initialJobs }: JobsListClientProps) {
  const [activeTab, setActiveTab] = React.useState<TabType>('all')
  const [searchQuery, setSearchQuery] = React.useState('')

  const filteredJobs = initialJobs.filter((job) => {
    // Tab filter
    if (activeTab !== 'all' && job.status !== activeTab) return false

    // Search query filter
    const title = job.title.toLowerCase()
    const loc = job.location.toLowerCase()
    const crew = (job.profiles?.full_name || '').toLowerCase()
    const tempName = (job.templates?.name || '').toLowerCase()
    const query = searchQuery.toLowerCase()

    return (
      title.includes(query) ||
      loc.includes(query) ||
      crew.includes(query) ||
      tempName.includes(query)
    )
  })

  // Framer Motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
      },
    },
  }

  // Snappy animations instead of spring physics
  const cardVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    show: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.15,
        ease: 'easeOut' as any,
      },
    },
  }

  const tabOptions: { label: string; value: TabType }[] = [
    { label: 'All Jobs', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
  ]

  return (
    <div className="space-y-6">
      {/* Search & Tabs Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full lg:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A]" />
          <input
            type="text"
            placeholder="Search by property, crew member, or checklist..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#FFFFFF] border border-[#E4E4E7] focus:border-[#09090B] text-sm text-[#09090B] placeholder:text-zinc-600 focus:outline-none transition-colors duration-200"
          />
        </div>

        {/* Tab switch buttons */}
        <div className="flex items-center gap-1 bg-[#FAFAFA] p-1 border border-[#E4E4E7] w-fit">
          {tabOptions.map((tab) => {
            const isSelected = activeTab === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors duration-200 cursor-pointer ${
                  isSelected ? 'bg-[#FFFFFF] text-[#09090B] border border-[#E4E4E7] shadow-sm' : 'text-[#71717A] hover:text-[#09090B] border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid List */}
      <AnimatePresence mode="popLayout">
        {filteredJobs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-[240px] border border-dashed border-[#E4E4E7] rounded-xl bg-[#FAFAFA] p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-sm"
          >
            <div className="bg-zinc-100 p-3 rounded-full mb-4">
              <Briefcase strokeWidth={1.5} className="h-8 w-8 text-[#71717A]" />
            </div>
            <h3 className="text-sm font-bold text-[#09090B] mb-2">No jobs yet</h3>
            <p className="text-sm font-medium text-[#71717A] max-w-xs mx-auto">
              {searchQuery
                ? 'No jobs match your search. Try a different name or location.'
                : 'Jobs you send to your crew will appear here. Once a job is completed, you can click it to see the full photo report.'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredJobs.map((job) => {
              const crewMember = job.profiles?.full_name || 'Unassigned'
              const templateTitle = job.templates?.name || 'Standard Checklist'
              const dateObj = new Date(job.scheduled_at)
              const formattedTime = job.scheduled_at
                ? dateObj.toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'N/A'

              const isCompleted = job.status === 'completed'
              const isProgress = job.status === 'in_progress'

              return (
                <motion.div key={job.id} variants={cardVariants} layout>
                  <FlatCard>
                    {/* Header: Title & Status */}
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-bold text-[#09090B] line-clamp-1 leading-snug">
                        {job.title}
                      </h3>
                      <StatusPill
                        variant={isCompleted ? 'completed' : isProgress ? 'in_progress' : 'pending'}
                      >
                        {isCompleted && <CheckCircle className="h-3 w-3" />}
                        {isProgress && <Clock className="h-3 w-3" />}
                        <span>{job.status?.replace('_', ' ')}</span>
                      </StatusPill>
                    </div>

                    {/* Details Block - F Pattern structure */}
                    <div className="space-y-3 mt-6 text-sm text-[#71717A] font-medium">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{job.location}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <User className="h-4 w-4 shrink-0" />
                        <span className="text-[#09090B]">{crewMember}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="truncate">{templateTitle}</span>
                      </div>
                    </div>

                    {/* Footer: Date & View Button */}
                    <div className="flex items-center justify-between gap-3 border-t border-[#E4E4E7] pt-4 mt-6">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#71717A] uppercase tracking-widest font-bold">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formattedTime}</span>
                      </div>

                      {isCompleted ? (
                        <Link
                          href={`/jobs/${job.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#E4E4E7] bg-[#FAFAFA] hover:bg-[#09090B] hover:text-[#FFFFFF] text-[10px] font-bold uppercase tracking-widest text-[#09090B] transition-colors duration-200 cursor-pointer group/btn"
                        >
                          <span>Report</span>
                          <ChevronRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                        </Link>
                      ) : (
                        <span className="text-[10px] font-bold text-[#71717A] uppercase tracking-widest">
                          Pending Review
                        </span>
                      )}
                    </div>
                  </FlatCard>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
