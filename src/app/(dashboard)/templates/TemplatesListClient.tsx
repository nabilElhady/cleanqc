'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { FileText, ArrowRight, Calendar, Search } from 'lucide-react'

interface Template {
  id: string
  name: string
  description: string | null
  created_at: string
  template_items: { id: string }[]
}

interface TemplatesListClientProps {
  initialTemplates: Template[]
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

export function TemplatesListClient({ initialTemplates }: TemplatesListClientProps) {
  const [searchQuery, setSearchQuery] = React.useState('')

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
    <div className="space-y-6">
      {/* Search Filter bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A]" />
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E4E4E7] focus:border-[#09090B] text-sm text-[#09090B] placeholder-[#71717A] focus:outline-none transition-colors duration-200"
        />
      </div>

      <AnimatePresence mode="popLayout">
        {filteredTemplates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-[#FFFFFF] border border-[#E4E4E7] p-12 text-center max-w-xl mx-auto flex flex-col items-center"
          >
            <div className="h-12 w-12 bg-[#FAFAFA] flex items-center justify-center mb-4 border border-[#E4E4E7]">
              <FileText className="h-6 w-6 text-[#71717A]" />
            </div>
            <h3 className="text-sm font-bold text-[#09090B] uppercase tracking-widest">No templates found</h3>
            <p className="text-[#71717A] text-sm mt-2 leading-relaxed">
              Try adjusting your search query or create a new template above.
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
                  <FlatCard>
                    {/* Title & Description */}
                    <div>
                      <h3 className="text-lg font-bold text-[#09090B] line-clamp-1 leading-snug">
                        {template.name}
                      </h3>
                      <p className="text-[#71717A] text-sm mt-1.5 line-clamp-2 leading-relaxed">
                        {template.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Metadata Stats */}
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

                    {/* CTA Button */}
                    <div className="border-t border-[#E4E4E7] pt-4 mt-6">
                      <Link
                        href={`/templates/${template.id}`}
                        className="inline-flex w-full items-center justify-between px-4 py-2 border border-[#E4E4E7] bg-[#FAFAFA] hover:bg-[#09090B] hover:text-[#FFFFFF] text-[10px] font-bold uppercase tracking-widest text-[#09090B] transition-colors duration-200 cursor-pointer group/btn"
                      >
                        <span>Manage Items</span>
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
  )
}
