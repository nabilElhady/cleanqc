'use client'

import * as React from 'react'
import { inviteCrew, deleteCrew } from '@/actions/inviteCrew'
import { Loader2, Copy, Check, Users, Trash2 } from 'lucide-react'

interface CrewMember {
  id: string
  fullName: string
  email: string
  status: 'ACTIVE' | 'PENDING'
}

interface TeamClientProps {
  initialCrew: CrewMember[]
}

export default function TeamClient({ initialCrew }: TeamClientProps) {
  const [crew, setCrew] = React.useState<CrewMember[]>(initialCrew)
  const [email, setEmail] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [inviteLink, setInviteLink] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [emailSent, setEmailSent] = React.useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null)
  const [isDeletingId, setIsDeletingId] = React.useState<string | null>(null)

  const handleDelete = async (id: string) => {
    setIsDeletingId(id)
    setError(null)
    try {
      const res = await deleteCrew(id)
      if (res.success) {
        setCrew((prev) => prev.filter((member) => member.id !== id))
        setConfirmDeleteId(null)
      } else {
        setError(res.error || 'Failed to delete crew member.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting.')
    } finally {
      setIsDeletingId(null)
    }
  }

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setIsSubmitting(true)
    setError(null)
    setInviteLink(null)
    setCopied(false)
    setEmailSent(false)

    try {
      const res = await inviteCrew(email)
      if (!res.success) {
        throw new Error(res.error || 'Failed to dispatch invite.')
      }

      if (res.emailSent) {
        setEmailSent(true)
      } else if (res.inviteLink) {
        setInviteLink(res.inviteLink)
      }

      // Prepend the new pending crew member locally
      const newCrewMember: CrewMember = {
        id: Math.random().toString(), // Temp ID until refresh
        fullName: 'Invited Crew Member',
        email: email.trim(),
        status: 'PENDING',
      }
      setCrew((prev) => [newCrewMember, ...prev])
      setEmail('')
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopyLink = () => {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-12">
      {/* Invite Form Section */}
      <div className="border border-black bg-white p-8 border-t-2 border-l-2 border-b-4 border-r-4">
        <h2 className="font-mono text-xs font-black tracking-widest uppercase mb-1 text-black">
          Invite a Crew Member
        </h2>
        <p className="font-mono text-[10px] text-zinc-400 uppercase tracking-wide mb-6">
          Enter their email and they'll receive login credentials to access their jobs.
        </p>

        <form onSubmit={handleInviteSubmit} className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label htmlFor="email" className="block font-mono text-[10px] font-black uppercase tracking-wider mb-2 text-zinc-400">
                CLEANER EMAIL ADDRESS
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cleaner@organization.com"
                className="w-full bg-transparent border-b border-black py-2 focus:outline-none font-mono text-sm placeholder:text-zinc-450 text-black rounded-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto border border-black bg-black text-white hover:bg-white hover:text-black disabled:bg-zinc-200 disabled:text-zinc-500 py-3.5 px-8 font-mono text-xs font-black tracking-widest uppercase transition-colors duration-150 rounded-none cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                  <span>Sending...</span>
                </>
              ) : (
                <span>Send Invite</span>
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
        {emailSent && (
          <div className="mt-8 p-6 border-2 border-dashed border-zinc-900 bg-zinc-50 space-y-2">
            <span className="font-mono text-xs font-black uppercase tracking-wider text-black block">
              INVITATION EMAIL SENT SUCCESSFULLY!
            </span>
            <p className="font-mono text-[10px] text-zinc-500 uppercase leading-relaxed">
              An invitation email was sent to your crew member. They can click the link in their email to set up their account.
            </p>
          </div>
        )}

        {/* Read-Only Monospace Copy Invitation Link */}
        {inviteLink && (
          <div className="mt-8 p-6 border-2 border-dashed border-black bg-zinc-55 space-y-3">
            <span className="font-mono text-xs font-black uppercase tracking-wider text-black block">
              INVITATION DISPATCHED (EMAIL COULD NOT SEND)
            </span>
            <p className="font-mono text-[10px] text-zinc-500 uppercase leading-relaxed">
              Supabase email delivery is not configured. Use the link below to manually register the crew member, or copy and send it to them via message/email.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 bg-white border border-black p-3 font-mono text-xs select-all focus:outline-none rounded-none text-black"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="border border-black bg-white hover:bg-black hover:text-white px-6 py-3 font-mono text-xs font-black uppercase transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer rounded-none"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-650" />
                    <span>COPIED</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>COPY LINK</span>
                  </>
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
            ACTIVE CREW MEMBERS
          </h2>
        </div>

        {crew.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-zinc-300">
            <Users className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
            <p className="font-mono text-sm font-bold text-zinc-400">No crew members yet</p>
            <p className="font-mono text-[11px] text-zinc-400 mt-1 max-w-xs mx-auto">
              Add cleaners using the form above. They'll get an email with a link to set up their account and access their assigned jobs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-black text-left">
                  <th className="py-4 font-black uppercase tracking-wider text-zinc-500">NAME</th>
                  <th className="py-4 font-black uppercase tracking-wider text-zinc-500">EMAIL</th>
                  <th className="py-4 font-black uppercase tracking-wider text-zinc-500">STATUS</th>
                  <th className="py-4 font-black uppercase tracking-wider text-zinc-500 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {crew.map((member) => {
                  const isConfirming = confirmDeleteId === member.id
                  const isDeleting = isDeletingId === member.id

                  return (
                    <tr key={member.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-4 font-bold text-black uppercase">{member.fullName}</td>
                      <td className="py-4 text-zinc-650">{member.email}</td>
                      <td className="py-4">
                        <span
                          className={`inline-block px-2.5 py-1 text-[9px] font-black tracking-wider border rounded-none ${
                            member.status === 'ACTIVE'
                              ? 'bg-zinc-100 text-black border-black'
                              : 'bg-yellow-50 text-yellow-600 border-yellow-400'
                          }`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        {isConfirming ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[9px] font-bold text-red-500 uppercase mr-1">CONFIRM?</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(member.id)}
                              disabled={isDeleting}
                              className="px-2.5 py-1 bg-red-600 text-white hover:bg-red-700 text-[10px] font-bold uppercase border border-red-650 transition-colors disabled:opacity-50 cursor-pointer"
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
                            className="p-1.5 text-zinc-400 hover:text-red-550 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                            title="Delete crew member"
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
