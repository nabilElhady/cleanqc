'use client'

import * as React from 'react'
import { createJob } from '@/app/actions/jobs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Plus, Loader2, Trash2, Camera, Sparkles, ClipboardList, CheckSquare } from 'lucide-react'
import { PremiumActionWrapper } from '@/components/billing/PremiumActionWrapper'

interface CreateJobFormProps {
  templates: { id: string; name: string }[]
  crew: { id: string; full_name: string | null }[]
}

interface CustomItem {
  label: string
  requiresPhoto: boolean
}

export function CreateJobForm({ templates, crew }: CreateJobFormProps) {
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [location, setLocation] = React.useState('')
  const [assignedTo, setAssignedTo] = React.useState('')
  const [scheduledAt, setScheduledAt] = React.useState('')
  const [isPending, setIsPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Checklist source options: 'existing' | 'custom'
  const [checklistSource, setChecklistSource] = React.useState<'existing' | 'custom'>('existing')
  const [selectedTemplateId, setSelectedTemplateId] = React.useState('')

  // Custom Checklist builder states
  const [saveAsTemplate, setSaveAsTemplate] = React.useState(false)
  const [customTemplateName, setCustomTemplateName] = React.useState('')
  const [customItems, setCustomItems] = React.useState<CustomItem[]>([
    { label: '', requiresPhoto: false }
  ])

  // Reset form inputs
  const resetForm = () => {
    setTitle('')
    setLocation('')
    setAssignedTo('')
    setScheduledAt('')
    setSelectedTemplateId('')
    setChecklistSource('existing')
    setSaveAsTemplate(false)
    setCustomTemplateName('')
    setCustomItems([{ label: '', requiresPhoto: false }])
    setError(null)
  }

  // Handle adding a new item to custom checklist
  const addCustomItem = () => {
    setCustomItems(prev => [...prev, { label: '', requiresPhoto: false }])
  }

  // Handle removing an item from custom checklist
  const removeCustomItem = (index: number) => {
    if (customItems.length <= 1) return
    setCustomItems(prev => prev.filter((_, idx) => idx !== index))
  }

  // Update specific item properties
  const updateCustomItem = (index: number, key: keyof CustomItem, value: any) => {
    setCustomItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return { ...item, [key]: value }
      }
      return item
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!assignedTo) {
      setError('Please assign a crew member.')
      return
    }
    if (!scheduledAt) {
      setError('Please select a scheduled date and time.')
      return
    }

    let payloadTemplateId: string | undefined = undefined
    let payloadCustomChecklist: any = undefined

    if (checklistSource === 'existing') {
      if (!selectedTemplateId) {
        setError('Please select a checklist template.')
        return
      }
      payloadTemplateId = selectedTemplateId
    } else {
      // Validate custom checklist items
      const validItems = customItems.filter(item => item.label.trim().length > 0)
      if (validItems.length === 0) {
        setError('Please add at least one valid checklist item.')
        return
      }

      // If saving as template, require a name
      if (saveAsTemplate && !customTemplateName.trim()) {
        setError('Please enter a name to save this template.')
        return
      }

      // If it is a one-off checklist, prefix with Ad-hoc to hide it from lists
      const finalName = saveAsTemplate 
        ? customTemplateName.trim()
        : `Ad-hoc: ${title.trim() || 'Job'}`

      payloadCustomChecklist = {
        name: finalName,
        saveAsTemplate,
        items: validItems
      }
    }

    setIsPending(true)
    setError(null)

    try {
      const isoDate = new Date(scheduledAt).toISOString()
      const res = await createJob(
        title,
        location,
        assignedTo,
        isoDate,
        payloadTemplateId,
        payloadCustomChecklist
      )

      setIsPending(false)
      if (res.success) {
        resetForm()
        setOpen(false)
      } else {
        setError(res.error || 'Failed to create job.')
      }
    } catch (err: any) {
      setIsPending(false)
      setError(err.message || 'Invalid date or formatting.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) resetForm()
    }}>
      <DialogTrigger asChild>
        <PremiumActionWrapper>
          <Button className="cursor-pointer">
            <Plus className="h-4.5 w-4.5 mr-2" />
            Dispatch New Job
          </Button>
        </PremiumActionWrapper>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto border-white/8 bg-[#18181B] text-[#FAFAFA]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#8B5CF6]" />
            Dispatch Cleaning Job
          </DialogTitle>
          <DialogDescription className="text-[#A1A1AA]">
            Schedule a cleaning job, assign a crew member, and set the checklist items.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {error && (
            <div className="text-sm text-rose-455 bg-rose-500/10 border border-rose-500/20 p-3.5 rounded-xl">
              {error}
            </div>
          )}

          {/* Job Details Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="title" className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                Job Title / Property Name
              </label>
              <Input
                id="title"
                type="text"
                required
                placeholder="e.g. Unit 302 Post-Checkout"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                Location Address
              </label>
              <Input
                id="location"
                type="text"
                required
                placeholder="e.g. 1024 Broadway St"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="crew" className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                Assign Crew Member
              </label>
              <select
                id="crew"
                required
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                disabled={isPending}
                className="flex h-10 w-full rounded-xl border border-white/8 bg-[#18181B] px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40 focus:border-[#8B5CF6] disabled:opacity-50 transition-all cursor-pointer"
              >
                <option value="" disabled className="bg-[#18181B]">Select Crew Member...</option>
                {crew.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#18181B] text-[#FAFAFA]">
                    {c.full_name || 'Unnamed Crew'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="scheduledAt" className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
                Scheduled Date & Time
              </label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                required
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                disabled={isPending}
                className="scheme-dark"
              />
            </div>
          </div>

          {/* Checklist Builder Selector */}
          <div className="space-y-4 pt-2 border-t border-zinc-900">
            <div>
              <label className="block text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
                Checklist Source
              </label>
              <div className="grid grid-cols-2 gap-2 bg-[#18181B] p-1.5 rounded-xl border border-white/8">
                <button
                  type="button"
                  onClick={() => setChecklistSource('existing')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    checklistSource === 'existing'
                      ? 'bg-zinc-800 text-[#FAFAFA] shadow-sm border border-zinc-700/50'
                      : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-zinc-800/35 border border-transparent'
                  }`}
                >
                  <ClipboardList className="h-4 w-4" />
                  Use Predefined Template
                </button>
                <button
                  type="button"
                  onClick={() => setChecklistSource('custom')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    checklistSource === 'custom'
                      ? 'bg-zinc-800 text-[#FAFAFA] shadow-sm border border-zinc-700/50'
                      : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-zinc-800/35 border border-transparent'
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  Custom Checklist Builder
                </button>
              </div>
            </div>

            {/* Render Template Selector */}
            {checklistSource === 'existing' && (
              <div className="bg-[#18181B]/40 p-4 border border-white/8 rounded-2xl space-y-3">
                <div>
                  <label htmlFor="template" className="block text-xs font-medium text-[#FAFAFA] mb-1.5">
                    Select Template
                  </label>
                  <select
                    id="template"
                    required
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                    disabled={isPending}
                    className="flex h-10 w-full rounded-xl border border-white/8 bg-[#18181B] px-3 py-2 text-sm text-[#FAFAFA] focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40 focus:border-[#8B5CF6] disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <option value="" disabled className="bg-[#18181B]">Choose checklist...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#18181B] text-[#FAFAFA]">
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Render Custom Checklist Builder */}
            {checklistSource === 'custom' && (
              <div className="bg-[#18181B]/40 p-5 border border-white/8 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-4 w-4 text-[#8B5CF6]" />
                    <span className="text-sm font-semibold">Custom Checklist Items</span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <label className="flex items-center gap-2 text-xs text-[#FAFAFA] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={saveAsTemplate}
                        onChange={(e) => setSaveAsTemplate(e.target.checked)}
                        className="h-4 w-4 rounded border-white/8 bg-[#09090B] text-[#8B5CF6] focus:ring-[#8B5CF6]/40 accent-[#8B5CF6]"
                      />
                      <span>Save as template for future use</span>
                    </label>
                  </div>
                </div>

                {saveAsTemplate && (
                  <div className="animate-in fade-in duration-200">
                    <label htmlFor="templateName" className="block text-xs font-medium text-[#FAFAFA] mb-1.5">
                      Template Name
                    </label>
                    <Input
                      id="templateName"
                      type="text"
                      required
                      placeholder="e.g. Standard Studio Cleaning"
                      value={customTemplateName}
                      onChange={(e) => setCustomTemplateName(e.target.value)}
                    />
                  </div>
                )}

                {/* Items List */}
                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                  {customItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 animate-in slide-in-from-top-1 duration-150">
                      <span className="flex items-center justify-center text-xs font-semibold bg-[#18181B] border border-white/8 text-[#A1A1AA] h-6 w-6 rounded-full shrink-0">
                        {idx + 1}
                      </span>
                      <Input
                        type="text"
                        required
                        placeholder="e.g. Vacuum bedroom and hallway rugs"
                        value={item.label}
                        onChange={(e) => updateCustomItem(idx, 'label', e.target.value)}
                        className="flex-1"
                      />
                      
                      {/* Photo proof toggle */}
                      <button
                        type="button"
                        onClick={() => updateCustomItem(idx, 'requiresPhoto', !item.requiresPhoto)}
                        title="Toggle Photo Proof Required"
                        className={`h-9 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 transition-all text-xs cursor-pointer ${
                          item.requiresPhoto
                            ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/25 text-[#8B5CF6]'
                            : 'bg-[#18181B] border-white/8 text-[#A1A1AA] hover:text-[#FAFAFA]'
                        }`}
                      >
                        <Camera className="h-4 w-4" />
                        <span className="hidden sm:inline">Photo</span>
                      </button>

                      {/* Remove item button */}
                      <button
                        type="button"
                        onClick={() => removeCustomItem(idx)}
                        disabled={customItems.length <= 1}
                        className="h-9 w-9 shrink-0 flex items-center justify-center rounded-xl bg-[#18181B] border border-white/8 hover:bg-rose-500/10 hover:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer text-[#A1A1AA]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addCustomItem}
                  className="w-full mt-2 border-dashed border-white/8 bg-transparent text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-zinc-700 py-5 rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Checklist Item
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-900">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm()
                setOpen(false)
              }}
              disabled={isPending}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Dispatching...
                </>
              ) : (
                'Dispatch Job'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
