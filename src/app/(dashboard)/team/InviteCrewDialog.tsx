'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { inviteCrewMember } from '@/app/actions/team'

export function InviteCrewDialog() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [isPending, setIsPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    setError(null)
    setSuccess(false)

    const res = await inviteCrewMember(name, email, password)
    setIsPending(false)
    if (res.success) {
      setName('')
      setEmail('')
      setPassword('')
      setSuccess(true)
      router.refresh()
      // Short delay before closing to show success state
      setTimeout(() => {
        setOpen(false)
        setSuccess(false)
      }, 1500)
    } else {
      setError(res.error || 'Failed to invite crew member.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Invite Crew Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Crew Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-[#10B981] bg-[#10B981]/12 border border-[#10B981]/20 p-3 rounded-lg">
              Invitation sent successfully! Crew member added.
            </div>
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#09090B] mb-1.5">
              Full Name
            </label>
            <Input
              id="name"
              type="text"
              required
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending || success}
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#09090B] mb-1.5">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              required
              placeholder="e.g. john.doe@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending || success}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#09090B] mb-1.5">
              Temporary Password
            </label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending || success}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending || success}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || success} className="cursor-pointer">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Invite'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Helper component import mapping fix (Plus)
import { Plus } from 'lucide-react'
