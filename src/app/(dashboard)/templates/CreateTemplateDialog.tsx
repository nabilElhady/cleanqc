'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createTemplate } from '@/app/actions/templates'
import { PremiumActionWrapper } from '@/components/billing/PremiumActionWrapper'

export function CreateTemplateDialog() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [isPending, setIsPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsPending(true)
    setError(null)

    const res = await createTemplate(name, description)
    setIsPending(false)
    if (res.success && res.data) {
      setName('')
      setDescription('')
      setOpen(false)
      // Redirect to the newly created checklist page to add items
      router.push(`/templates/${res.data.id}`)
    } else {
      setError(res.error || 'Failed to create checklist.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <PremiumActionWrapper>
          <Button id="create-template-btn" className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Create Checklist
          </Button>
        </PremiumActionWrapper>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a Checklist</DialogTitle>
          <p className="text-[#71717A] text-xs mt-1 uppercase tracking-wider font-semibold">
            Step 1 of 2: Setup Name &amp; Description
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-[#09090B] mb-1.5">
              Checklist Name
            </label>
            <Input
              id="name"
              type="text"
              required
              placeholder="e.g. Standard Room Cleaning"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-[#09090B] mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="Describe what this checklist is used for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              className="flex w-full rounded-lg border border-[#E4E4E7] bg-[#FFFFFF] px-3 py-2 text-sm text-[#09090B] placeholder-[#71717A] focus:outline-none focus:ring-1 focus:ring-[#09090B]/20 focus:border-[#09090B] disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none"
            />
          </div>
          
          <p className="text-[11px] text-[#71717A] bg-[#FAFAFA] p-3 border border-[#E4E4E7]">
            💡 <strong>Next Step:</strong> You will add individual tasks (e.g. "Sweep floor", "Wipe mirror") on the next screen after clicking Next.
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="cursor-pointer flex items-center gap-1.5">
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>Next: Add Tasks</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
