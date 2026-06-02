'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Phone, Calendar, Shield, Search, Trash2, AlertCircle, Loader2, Users } from 'lucide-react'
import { deleteCrewMember } from '@/app/actions/team'

interface Profile {
  id: string
  full_name: string | null
  role: string
  phone: string | null
  created_at: string
}

interface TeamListClientProps {
  profiles: Profile[]
  emailMap: Record<string, string>
  currentUserId: string
  currentUserRole: string
}

function FlatCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden bg-[#FFFFFF] border border-[#E4E4E7] p-6 flex flex-col justify-between h-[230px] transition-colors duration-200 group hover:border-[#09090B] ${className}`}
    >
      {children}
    </div>
  )
}

export function TeamListClient({ profiles, emailMap, currentUserId, currentUserRole }: TeamListClientProps) {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)
  const [isDeletingId, setIsDeletingId] = React.useState<string | null>(null)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const filteredProfiles = profiles.filter((p) => {
    const email = emailMap[p.id] || ''
    const displayName = p.full_name || (email ? email.split('@')[0] : 'Unnamed Crew')
    const name = displayName.toLowerCase()
    const role = p.role.toLowerCase()
    const query = searchQuery.toLowerCase()
    return name.includes(query) || email.toLowerCase().includes(query) || role.includes(query)
  })

  const handleDelete = async (id: string) => {
    setIsDeletingId(id)
    setErrorMsg(null)
    try {
      const res = await deleteCrewMember(id)
      if (res.success) {
        setConfirmDeleteId(null)
      } else {
        setErrorMsg(res.error || 'Failed to delete member')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred')
    } finally {
      setIsDeletingId(null)
    }
  }

  // Framer Motion staggered grid variants
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

  return (
    <div className="space-y-6">
      {/* Search Input Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A]" />
        <input
          type="text"
          placeholder="Filter team members by name, email, or role..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] border border-[#E4E4E7] focus:border-[#09090B] text-sm text-[#09090B] placeholder-[#71717A] focus:outline-none transition-colors duration-300"
        />
      </div>

      {errorMsg && (
        <div className="max-w-md p-3.5 bg-[#FFFFFF] border border-red-500 text-red-500 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="font-bold">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-[10px] uppercase font-bold tracking-wider hover:text-red-700">
            Dismiss
          </button>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        {filteredProfiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-[#FFFFFF] border border-[#E4E4E7] p-12 text-center max-w-xl mx-auto flex flex-col items-center"
          >
            <div className="h-12 w-12 bg-[#FAFAFA] flex items-center justify-center mb-4 border border-[#E4E4E7]">
              <Users className="h-6 w-6 text-[#71717A]" />
            </div>
            <h3 className="text-sm font-bold text-[#09090B] uppercase tracking-widest">No members found</h3>
            <p className="text-[#71717A] text-sm mt-1.5 leading-relaxed">
              Try adjusting your search filter or invite a new crew member above.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredProfiles.map((profile) => {
              const email = emailMap[profile.id] || 'No Email Registered'
              const displayName = profile.full_name || (email !== 'No Email Registered' ? email.split('@')[0] : 'Unnamed Crew')
              const joinedDate = profile.created_at
                ? new Date(profile.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'N/A'

              // Initials for avatar bubble
              const initials = displayName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()

              const isOwnerOrManager = profile.role === 'owner' || profile.role === 'manager'
              const canDelete = 
                (currentUserRole === 'owner' || currentUserRole === 'manager') && 
                profile.id !== currentUserId && 
                profile.role !== 'owner'

              return (
                <motion.div key={profile.id} variants={cardVariants}>
                  <FlatCard>
                    {confirmDeleteId === profile.id ? (
                      <div className="flex flex-col justify-between h-full animate-in fade-in zoom-in-95 duration-200">
                        <div className="space-y-2 text-left">
                          <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                            <AlertCircle className="h-4 w-4" /> Confirm Deletion
                          </h4>
                          <p className="text-sm text-[#71717A] leading-relaxed">
                            Are you sure you want to delete <span className="text-[#09090B] font-bold">{displayName}</span>? This action cannot be undone.
                          </p>
                        </div>
                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#E4E4E7]">
                          <button
                            onClick={() => handleDelete(profile.id)}
                            disabled={isDeletingId === profile.id}
                            className="flex-1 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold text-[10px] uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {isDeletingId === profile.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Yes, Delete'
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            disabled={isDeletingId === profile.id}
                            className="flex-1 py-2 bg-[#FAFAFA] hover:bg-[#E4E4E7] border border-[#E4E4E7] text-[#09090B] font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Card Header Profile & Initials */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 text-left">
                            <div className={`h-11 w-11 flex items-center justify-center text-sm font-black tracking-wider border ${
                              isOwnerOrManager 
                                ? 'bg-[#09090B] text-[#FFFFFF] border-[#09090B]' 
                                : 'bg-[#FAFAFA] text-[#09090B] border-[#E4E4E7]'
                            }`}>
                              {initials}
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-[#09090B] leading-snug">
                                {displayName}
                              </h3>
                              <span className="block text-[10px] text-[#71717A] uppercase tracking-widest font-bold mt-0.5">
                                {profile.role === 'owner' ? 'Owner' : profile.role === 'manager' ? 'Administrator' : 'Cleaning Crew'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                              isOwnerOrManager 
                                ? 'bg-[#09090B] text-[#FFFFFF] border-[#09090B]' 
                                : 'bg-[#FAFAFA] text-[#71717A] border-[#E4E4E7]'
                            }`}>
                              <Shield className="h-3 w-3" />
                              <span>{profile.role}</span>
                            </div>

                            {canDelete && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setConfirmDeleteId(profile.id)
                                }}
                                className="p-1 text-[#71717A] hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                                title="Delete crew member"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Card Details Panel */}
                        <div className="space-y-3 mt-6 text-sm text-[#71717A] font-medium text-left">
                          <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 shrink-0" />
                            <span className="truncate">{email}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 shrink-0" />
                            <span>{profile.phone || '—'}</span>
                          </div>
                        </div>

                        {/* Card Footer Join Date */}
                        <div className="flex items-center gap-1.5 text-[10px] text-[#71717A] font-bold uppercase tracking-widest mt-6 border-t border-[#E4E4E7] pt-4 text-left">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>Enrolled: {joinedDate}</span>
                        </div>
                      </>
                    )}
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
