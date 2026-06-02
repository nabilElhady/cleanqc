'use client'

import * as React from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { createTemplate } from '@/app/actions/templates'

export function CreateTemplateDialog() {
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
    if (res.success) {
      setName('')
      setDescription('')
      setOpen(false)
    } else {
      setError(res.error || 'Failed to create template.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Checklist Template</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#09090B] mb-1.5">
              Template Name
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
            <label htmlFor="description" className="block text-sm font-medium text-[#09090B] mb-1.5">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              placeholder="Describe the purpose of this checklist..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
              className="flex w-full rounded-lg border border-[#E4E4E7] bg-[#FFFFFF] px-3 py-2 text-sm text-[#09090B] placeholder-[#71717A] focus:outline-none focus:ring-1 focus:ring-[#09090B]/20 focus:border-[#09090B] disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none"
            />
          </div>
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
            <Button type="submit" disabled={isPending} className="cursor-pointer">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
