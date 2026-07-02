'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, ClipboardList, ArrowRight, Calendar, Search, Plus, Building2, Sparkles, Brush, Lock, Loader2, Eye } from 'lucide-react'
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
  systemTemplates?: any[]
}

const ICON_MAP: Record<string, React.ElementType> = {
  'Standard Office Daily': Building2,
  'Restroom Sanitation Protocol': Sparkles,
  'Move-In / Move-Out': Brush,
}

export function TemplatesListClient({ initialTemplates, systemTemplates = [] }: TemplatesListClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState<'standard' | 'custom'>('standard')
  const [searchQuery, setSearchQuery] = React.useState('')
  const [loadingStdId, setLoadingStdId] = React.useState<string | null>(null)

  const handleCopyStandard = async (stdId: string) => {
    setLoadingStdId(stdId)
    // NOTE: If using the new templates table, copyStandardTemplate action in templates.ts
    // must also be updated to read from the new table, or we must pass the full template data
    // to a new action. Assuming copyStandardTemplate handles the ID correctly on the backend.
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

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  }

  const cardVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.15, ease: 'easeOut' as any },
    },
  }

  return (
    <div className="space-y-8 mt-2">
      {/* Segmented Navigation (Tabs) */}
      <div className="flex items-center gap-1 bg-[#FAFAFA] p-1 border border-[#E4E4E7] w-fit">
        <button
          onClick={() => setActiveTab('standard')}
          className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors duration-200 cursor-pointer ${
            activeTab === 'standard'
              ? 'bg-[#FFFFFF] text-[#09090B] border border-[#E4E4E7] shadow-sm'
              : 'text-[#71717A] hover:text-[#09090B] border border-transparent'
          }`}
        >
          Standard Templates
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors duration-200 cursor-pointer ${
            activeTab === 'custom'
              ? 'bg-[#FFFFFF] text-[#09090B] border border-[#E4E4E7] shadow-sm'
              : 'text-[#71717A] hover:text-[#09090B] border border-transparent'
          }`}
        >
          My Custom Templates <Lock className="w-3 h-3 opacity-70" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'standard' && (
          <motion.div
            key="standard"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {systemTemplates.length === 0 && (
              <div className="col-span-full min-h-[160px] flex flex-col items-center justify-center border border-dashed border-[#E4E4E7] rounded-xl bg-[#FAFAFA] p-6 text-center">
                <div className="bg-zinc-100 p-3 rounded-full mb-3">
                  <FileText strokeWidth={1.5} className="h-6 w-6 text-[#71717A]" />
                </div>
                <p className="text-sm font-medium text-[#71717A]">No system templates available yet.</p>
              </div>
            )}
            {systemTemplates.map((std) => {
              const Icon = ICON_MAP[std.name] || FileText
              return (
              <div
                key={std.id}
                className="relative rounded-2xl bg-white border border-[#E4E4E7] shadow-md hover:shadow-lg hover:-translate-y-0.5 p-6 transition-all duration-200 group flex flex-col justify-between h-[240px] z-10"
              >
                {/* Micro-badge */}
                <div className="absolute top-4 right-4 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded-full bg-slate-100 text-slate-600 border-transparent">
                  Free Tier
                </div>

                <div>
                  {/* Icon Wrapper */}
                  <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 mb-4 group-hover:bg-black group-hover:text-white transition-colors duration-300">
                    <Icon className="w-5 h-5" />
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {std.name}
                  </h3>
                  <p className="text-slate-500 text-sm mt-1.5 leading-relaxed line-clamp-2">
                    {std.description}
                  </p>
                </div>

                <div className="pt-4 mt-auto flex flex-col gap-2">
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-between px-6 py-3 bg-[#09090B] text-white hover:bg-[#27272A] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer group/btn"
                    onClick={() => router.push(`/dashboard/dispatch?templateId=${std.id}`)}
                  >
                    <span>Use Template</span>
                    <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300" />
                  </button>
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-1.5 px-4 py-2 bg-slate-50 text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                    onClick={() => router.push(`/templates/${std.id}`)}
                  >
                    <Eye className="w-3 h-3" /> Preview
                  </button>
                </div>
              </div>
            )})}
          </motion.div>
        )}

        {activeTab === 'custom' && (
          <motion.div
            key="custom"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {/* Premium Search Input */}
            <div className="relative max-w-md mb-8 group/search">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400 group-focus-within/search:text-black transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search custom checklists..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E4E4E7] focus:border-[#09090B] text-sm text-[#09090B] placeholder:text-zinc-600 focus:outline-none transition-colors duration-200 shadow-sm"
              />
            </div>

            <AnimatePresence mode="popLayout">
              {filteredTemplates.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="min-h-[240px] border border-dashed border-[#E4E4E7] rounded-xl bg-[#FAFAFA] p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-sm"
                >
                  <div className="bg-zinc-100 p-3 rounded-full mb-4">
                    <ClipboardList strokeWidth={1.5} className="h-8 w-8 text-[#71717A]" />
                  </div>
                  <h3 className="text-sm font-bold text-[#09090B] mb-2">No custom templates found</h3>
                  <p className="text-sm font-medium text-[#71717A] max-w-sm mx-auto">
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
                        <Link href={`/templates/${template.id}`} className="block h-full group">
                            <div className="rounded-2xl bg-white border border-[#E4E4E7] shadow-md hover:shadow-lg hover:-translate-y-0.5 duration-200 p-6 transition-all flex flex-col h-[200px] relative z-10">
                            <div>
                              <h3 className="text-lg font-bold text-slate-900 line-clamp-1 leading-snug group-hover:text-black transition-colors">
                                {template.name}
                              </h3>
                              <p className="text-slate-500 text-sm mt-1.5 line-clamp-2 leading-relaxed">
                                {template.description || 'No description provided.'}
                              </p>
                            </div>

                            <div className="mt-auto pt-4 flex items-center gap-5 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
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
                          </div>
                        </Link>
                      </motion.div>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
