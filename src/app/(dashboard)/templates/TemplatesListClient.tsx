'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, ClipboardList, ArrowRight, Calendar, Search, Plus, Building2, Sparkles, Brush, Lock, Loader2 } from 'lucide-react'
import { copyStandardTemplate } from '@/app/actions/templates'

interface Template {
  id: string
  name: string
  description: string | null
  created_at: string
  template_items: { id: string }[]
}

interface TemplatesListClientProps {
  initialTemplates: Template[]
  subscriptionTier?: string
}

function FlatCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-[#FFFFFF] border border-[#E4E4E7] p-6 flex flex-col justify-between h-[220px] transition-colors duration-200 group hover:border-[#09090B] ${className}`}
    >
      {children}
    </div>
  )
}

const STANDARD_TEMPLATES = [
  {
    id: 'std-1',
    name: 'Daily Office Cleaning',
    description: 'Standard daily workflow covering workspaces, breakrooms, and security checks.',
    icon: Building2,
  },
  {
    id: 'std-2',
    name: 'Restroom Sanitation',
    description: 'Strict hygiene checklist for cleaning, disinfecting, and restocking restrooms.',
    icon: Sparkles,
  },
  {
    id: 'std-3',
    name: 'Monthly Deep Clean',
    description: 'Intensive monthly tasks including high dusting, baseboards, and deep floor care.',
    icon: Brush,
  }
]

export function TemplatesListClient({ initialTemplates, subscriptionTier = 'starter' }: TemplatesListClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [loadingStdId, setLoadingStdId] = React.useState<string | null>(null)

  let templateLimit = 3
  if (subscriptionTier === 'growth') templateLimit = 20
  if (subscriptionTier === 'scale') templateLimit = Infinity

  const isLimitReached = initialTemplates.length >= templateLimit

  const handleCopyStandard = async (stdId: string) => {
    setLoadingStdId(stdId)
    const res = await copyStandardTemplate(stdId)
    if (res.success && res.data) {
      router.push(`/templates/${res.data.id}`)
    } else {
      alert(res.error || 'Failed to copy template.')
      setLoadingStdId(null)
    }
  }

  const filteredTemplates = initialTemplates.filter((t) => {
    const name = t.name.toLowerCase()
    const desc = (t.description || '').toLowerCase()
    const query = searchQuery.toLowerCase()
    return name.includes(query) || desc.includes(query)
  })

  // Framer Motion staggered variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.15,
        ease: 'easeOut' as any,
      },
    },
  }

  return (
    <div className="space-y-12">
      
      {/* 1. STANDARD FREE TEMPLATES SECTION */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STANDARD_TEMPLATES.map((std) => (
            <FlatCard key={std.id} className="!h-[240px]">
              <div className="flex justify-between items-start">
                <div className="p-2.5 bg-[#FAFAFA] border border-[#E4E4E7] shrink-0">
                  <std.icon className="w-5 h-5 text-[#09090B]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#09090B] bg-[#F4F4F5] px-2 py-1 rounded-full border border-[#E4E4E7]">
                  Free Tier
                </span>
              </div>
              
              <div className="mt-4 flex-1">
                <h3 className="text-lg font-bold text-[#09090B] leading-snug">
                  {std.name}
                </h3>
                <p className="text-[#71717A] text-sm mt-1.5 leading-relaxed">
                  {std.description}
                </p>
              </div>

              <div className="border-t border-[#E4E4E7] pt-4 mt-4">
                <button
                  type="button"
                  disabled={loadingStdId === std.id}
                  className="inline-flex w-full items-center justify-center gap-2 px-4 py-2 bg-[#09090B] text-[#FFFFFF] text-[10px] font-bold uppercase tracking-widest transition-colors hover:bg-[#27272A] cursor-pointer disabled:opacity-50"
                  onClick={() => handleCopyStandard(std.id)}
                >
                  {loadingStdId === std.id ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Add to My Templates'
                  )}
                </button>
              </div>
            </FlatCard>
          ))}
        </div>
      </div>

      {/* 2. CUSTOM TEMPLATES SECTION */}
      <div className="pt-8 border-t border-[#E4E4E7]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#71717A]" />
            <h2 className="text-xl font-black tracking-tight text-[#71717A]">Custom Templates</h2>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#71717A] bg-[#FAFAFA] border border-[#E4E4E7] px-3 py-1.5 w-fit">
            <span>Template Limit:</span>
            <span className={isLimitReached ? 'text-rose-500' : 'text-[#09090B]'}>
              {initialTemplates.length} / {templateLimit === Infinity ? 'Unlimited' : templateLimit}
            </span>
          </div>
        </div>

        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A]" />
          <input
            type="text"
            placeholder="Search custom checklists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E4E4E7] focus:border-[#09090B] text-sm text-[#09090B] placeholder-[#71717A] focus:outline-none transition-colors duration-200 opacity-70 focus:opacity-100"
          />
        </div>

        <AnimatePresence mode="popLayout">
          {filteredTemplates.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-[#FAFAFA] border border-[#E4E4E7] border-dashed p-12 text-center max-w-xl mx-auto flex flex-col items-center"
            >
              <div className="h-12 w-12 bg-[#FFFFFF] flex items-center justify-center mb-4 border border-[#E4E4E7]">
                <ClipboardList className="h-6 w-6 text-[#71717A]" />
              </div>
              <h3 className="text-sm font-bold text-[#09090B]">No custom templates found</h3>
              <p className="text-[#71717A] text-sm mt-2 leading-relaxed max-w-sm">
                {searchQuery
                  ? "We couldn't find any custom templates matching your search."
                  : "You haven't created any custom checklists yet. Build location-specific workflows for your team."}
              </p>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredTemplates.map((template) => {
                const itemCount = template.template_items?.length || 0
                const dateStr = template.created_at
                  ? new Date(template.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Unknown'

                return (
                  <motion.div key={template.id} variants={cardVariants}>
                    <FlatCard className="opacity-90 hover:opacity-100">
                      <div>
                        <h3 className="text-lg font-bold text-[#09090B] line-clamp-1 leading-snug">
                          {template.name}
                        </h3>
                        <p className="text-[#71717A] text-sm mt-1.5 line-clamp-2 leading-relaxed">
                          {template.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-5 text-[10px] text-[#71717A] font-bold uppercase tracking-widest mt-4">
                        <div className="flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {itemCount} {itemCount === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>{dateStr}</span>
                        </div>
                      </div>

                      <div className="border-t border-[#E4E4E7] pt-4 mt-6">
                        <Link
                          href={`/templates/${template.id}`}
                          className="inline-flex w-full items-center justify-between px-4 py-2 border border-[#E4E4E7] bg-[#FAFAFA] hover:bg-[#09090B] hover:text-[#FFFFFF] text-[10px] font-bold uppercase tracking-widest text-[#09090B] transition-colors duration-200 cursor-pointer group/btn"
                        >
                          <span>Add &amp; Edit Tasks</span>
                          <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                        </Link>
                      </div>
                    </FlatCard>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
