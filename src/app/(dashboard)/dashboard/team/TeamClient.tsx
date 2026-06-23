'use client'

import * as React from 'react'
import { registerCrewMember, deleteCrewMember, inviteManager } from '@/app/actions/team'
import { Loader2, Users, Trash2, Shield, Check, Copy } from 'lucide-react'

interface TeamMember {
  id: string
  fullName: string
  email: string
  status: 'ACTIVE' | 'PENDING'
  role: 'owner' | 'manager' | 'crew'
}

interface TeamClientProps {
  initialCrew: TeamMember[]
  companyId: string
}

export default function TeamClient({ initialCrew, companyId }: TeamClientProps) {
  const [crew, setCrew] = React.useState<TeamMember[]>(initialCrew)
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<'manager' | 'crew'>('crew')
  const [passcode, setPasscode] = React.useState('')
  
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  
  const [inviteSent, setInviteSent] = React.useState(false)
  const [passcodeGenerated, setPasscodeGenerated] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [copiedId, setCopiedId] = React.useState<string | null>(null)
  
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)
  const [isDeletingId, setIsDeletingId] = React.useState<string | null>(null)

  const handleGeneratePasscode = () => {
    const chars = 'ACDEFGHJKLMNPQRTUVWXY34679'
    const lookalikes: Record<string, string[]> = {
      'G': ['6'], '6': ['G', 'C'],
      'Q': ['9'], '9': ['Q'],
      'C': ['6']
    }
    
    let isEasyToRead = false
    let generated = ''
    
    while (!isEasyToRead) {
      const length = Math.floor(Math.random() * (10 - 6 + 1)) + 6
      generated = ''
      for (let i = 0; i < length; i++) {
        generated += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      
      // Validate adjacent lookalikes
      let hasLookalikeAdjacent = false
      for (let i = 0; i < generated.length - 1; i++) {
        const char = generated[i]
        const nextChar = generated[i + 1]
        if (lookalikes[char] && lookalikes[char].includes(nextChar)) {
          hasLookalikeAdjacent = true
          break
        }
      }
      
      if (!hasLookalikeAdjacent) {
        isEasyToRead = true
      }
    }
    
    setPasscode(generated)
  }

  const handleDelete = async (id: string) => {
    setIsDeletingId(id)
    setError(null)
    try {
      const res = await deleteCrewMember(id)
      if (res.success) {
        setCrew((prev) => prev.filter((member) => member.id !== id))
        setConfirmDeleteId(null)
      } else {
        setError(res.error || 'Failed to delete team member.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting.')
    } finally {
      setIsDeletingId(null)
    }
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    setError(null)
    setInviteSent(false)
    setPasscodeGenerated(null)
    setCopied(false)

    try {
      if (role === 'manager') {
        if (!email.trim()) {
          throw new Error('Email address is required to invite a Manager.')
        }
        const res = await inviteManager(name.trim(), email.trim())
        if (!res.success) {
          throw new Error(res.error || 'Failed to dispatch manager invite.')
        }

        setInviteSent(true)

        // Prepend the new pending manager locally
        const newMember: TeamMember = {
          id: Math.random().toString(),
          fullName: name.trim(),
          email: email.trim(),
          status: 'PENDING',
          role: 'manager',
        }
        setCrew((prev) => [newMember, ...prev])
        setEmail('')
        setName('')
      } else {
        // Crew member passcode-based registration
        const res = await registerCrewMember(name.trim(), companyId, passcode)
        if (!res.success || !res.passcode) {
          throw new Error(res.error || 'Failed to register crew member.')
        }

        setPasscodeGenerated(res.passcode)

        // Prepend the new active crew member locally
        const newMember: TeamMember = {
          id: Math.random().toString(),
          fullName: name.trim(),
          email: `CODE: ${res.passcode}`,
          status: 'ACTIVE',
          role: 'crew',
        }
        setCrew((prev) => [newMember, ...prev])
        setName('')
        setPasscode('')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyCode = () => {
    if (!passcodeGenerated) return
    navigator.clipboard.writeText(passcodeGenerated)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCopyText = (text: string, id: string) => {
    const cleanText = text.startsWith('CODE: ') ? text.replace('CODE: ', '') : text
    navigator.clipboard.writeText(cleanText)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-12 text-black">
      {/* Invite Form Section */}
      <div className="border border-black bg-white p-8 border-t-2 border-l-2 border-b-4 border-r-4">
        <h2 className="font-mono text-xs font-black tracking-widest uppercase mb-1 text-black">
          Add or Invite a Team Member
        </h2>
        <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-wide mb-6">
          Managers receive secure email invites. Crew members are created instantly with a login passcode.
        </p>

        <form onSubmit={handleInviteSubmit} className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6 items-end">
            <div className="w-full md:w-48">
              <label htmlFor="role" className="block font-mono text-[10px] font-black uppercase tracking-wider mb-2 text-zinc-400">
                SELECT ROLE
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as 'manager' | 'crew')
                  setError(null)
                  setInviteSent(false)
                  setPasscodeGenerated(null)
                }}
                className="w-full bg-white border-b border-black py-2 focus:outline-none font-mono text-sm text-black rounded-none cursor-pointer"
              >
                <option value="crew">Crew Member (Passcode)</option>
                <option value="manager">Manager (Email Invite)</option>
              </select>
            </div>

            <div className="flex-1 w-full">
              <label htmlFor="name" className="block font-mono text-[10px] font-black uppercase tracking-wider mb-2 text-zinc-400">
                FULL NAME
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full bg-transparent border-b border-black py-2 focus:outline-none font-mono text-sm placeholder:text-zinc-400 text-black rounded-none"
              />
            </div>

            {role === 'manager' && (
              <div className="flex-1 w-full">
                <label htmlFor="email" className="block font-mono text-[10px] font-black uppercase tracking-wider mb-2 text-zinc-400">
                  MANAGER EMAIL ADDRESS
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@organization.com"
                  className="w-full bg-transparent border-b border-black py-2 focus:outline-none font-mono text-sm placeholder:text-zinc-400 text-black rounded-none"
                />
              </div>
            )}

            {role === 'crew' && (
              <div className="flex-1 w-full flex gap-3 items-end">
                <div className="flex-1">
                  <label htmlFor="passcode" className="block font-mono text-[10px] font-black uppercase tracking-wider mb-2 text-zinc-400">
                    PASSCODE (6-10 CHARS, OPTIONAL)
                  </label>
                  <input
                    id="passcode"
                    type="text"
                    maxLength={10}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="AUTO-GENERATED"
                    className="w-full bg-transparent border-b border-black py-2 focus:outline-none font-mono text-sm placeholder:text-zinc-400 text-black rounded-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGeneratePasscode}
                  className="border border-black bg-white hover:bg-black hover:text-white px-4 py-2 font-mono text-[10px] font-black uppercase tracking-wider transition-colors duration-150 rounded-none cursor-pointer h-[38px] flex items-center justify-center shrink-0"
                >
                  Generate
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full md:w-auto border border-black bg-black text-white hover:bg-white hover:text-black disabled:bg-zinc-200 disabled:text-zinc-500 py-3.5 px-8 font-mono text-xs font-black tracking-widest uppercase transition-colors duration-150 rounded-none cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{role === 'crew' ? 'Add Crew' : 'Send Invite'}</span>
              )}
            </button>
          </div>

          {error && (
            <p className="font-mono text-xs font-black text-red-500 uppercase tracking-wider">
              ERROR: {error}
            </p>
          )}
        </form>

        {/* Email sent successfully message */}
        {inviteSent && (
          <div className="mt-8 p-6 border-2 border-dashed border-zinc-900 bg-zinc-50 space-y-2">
            <span className="font-mono text-xs font-black uppercase tracking-wider text-black block">
              INVITATION DISPATCHED SUCCESSFULLY!
            </span>
            <p className="font-mono text-[10px] text-zinc-500 uppercase leading-relaxed">
              A secure onboarding link has been emailed to the Manager via Resend.
            </p>
          </div>
        )}

        {/* Passcode Generated message */}
        {passcodeGenerated && (
          <div className="mt-8 p-6 border-2 border-dashed border-black bg-zinc-50 space-y-3">
            <span className="font-mono text-xs font-black uppercase tracking-wider text-black block">
              CREW MEMBER REGISTERED INSTANTLY
            </span>
            <p className="font-mono text-[10px] text-zinc-500 uppercase leading-relaxed">
              No email was sent. Copy and share the unique 6-digit access passcode below directly with your crew member so they can log in.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <input
                type="text"
                readOnly
                value={passcodeGenerated}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full sm:w-48 bg-white border border-black p-3 font-mono text-lg font-black tracking-widest text-center select-all focus:outline-none rounded-none text-black"
              />
              <button
                type="button"
                onClick={handleCopyCode}
                className="border border-black bg-white hover:bg-black hover:text-white px-6 py-3 font-mono text-xs font-black uppercase transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer rounded-none"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span>COPIED CODE</span>
                  </>
                ) : (
                  <span>COPY PASSCODE</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active Crew Section */}
      <div className="border border-black bg-white p-8 border-t-2 border-l-2 border-b-4 border-r-4">
        <div className="flex items-center gap-2 mb-6">
          <Users className="h-5 w-5 text-black" />
          <h2 className="font-mono text-sm font-black tracking-widest uppercase text-black">
            ACTIVE TEAM MEMBERS
          </h2>
        </div>

        {crew.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-300">
            <Users className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
            <p className="font-mono text-sm font-bold text-zinc-400">No team members yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-black text-left">
                  <th className="py-4 font-black uppercase tracking-wider text-zinc-500">NAME</th>
                  <th className="py-4 font-black uppercase tracking-wider text-zinc-500">EMAIL / PASSCODE</th>
                  <th className="py-4 font-black uppercase tracking-wider text-zinc-500">ROLE</th>
                  <th className="py-4 font-black uppercase tracking-wider text-zinc-500">STATUS</th>
                  <th className="py-4 font-black uppercase tracking-wider text-zinc-500 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {crew.map((member) => {
                  const isConfirming = confirmDeleteId === member.id
                  const isDeleting = isDeletingId === member.id
                  const isOwner = member.role === 'owner'

                  return (
                    <tr key={member.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-4 font-bold text-black uppercase">{member.fullName}</td>
                      <td className="py-4 text-zinc-650">
                        <div className="flex items-center gap-2">
                          <span>{member.email}</span>
                          {member.email && (
                            <button
                              type="button"
                              onClick={() => handleCopyText(member.email, member.id)}
                              className="p-1 hover:bg-zinc-100 border border-transparent hover:border-black transition-colors rounded-none cursor-pointer flex items-center justify-center"
                              title="Copy to clipboard"
                            >
                              {copiedId === member.id ? (
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 text-zinc-400 hover:text-black" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-4 font-bold text-black uppercase">{member.role}</td>
                      <td className="py-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-[9px] font-black tracking-wider border rounded-none ${
                            member.status === 'ACTIVE'
                              ? 'bg-zinc-100 text-black border-black'
                              : 'bg-yellow-55 text-yellow-650 border-yellow-450'
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        {isOwner ? (
                          <span className="text-[9px] font-mono font-bold text-zinc-400 uppercase">OWNER</span>
                        ) : isConfirming ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[9px] font-bold text-red-500 uppercase mr-1">CONFIRM?</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(member.id)}
                              disabled={isDeleting}
                              className="px-2.5 py-1 bg-red-650 text-white hover:bg-red-750 text-[10px] font-bold uppercase border border-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {isDeleting ? '...' : 'YES'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={isDeleting}
                              className="px-2.5 py-1 bg-white text-black hover:bg-zinc-100 text-[10px] font-bold uppercase border border-black transition-colors cursor-pointer"
                            >
                              NO
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(member.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                            title="Delete team member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
