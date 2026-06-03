'use client'

import * as React from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { addTemplateItem, updateItemOrder } from '@/app/actions/templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { GripVertical, Camera, Plus, Loader2, AlertCircle } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSubscription } from '@/hooks/useSubscription'

interface TemplateItem {
  id: string
  template_id: string
  label: string
  requires_photo: boolean
  sort_order: number
  created_at: string
}

interface TemplateItemsManagerProps {
  templateId: string
  initialItems: TemplateItem[]
}

// Sortable item wrapper
interface SortableItemProps {
  id: string
  label: string
  requiresPhoto: boolean
}

function SortableItem({ id, label, requiresPhoto }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-zinc-900 border border-white/8 rounded-xl p-4 shadow-sm hover:border-zinc-800 transition-all select-none"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-zinc-800 rounded text-zinc-500 hover:text-[#FAFAFA] transition-colors"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <span className="flex-1 text-sm font-medium text-white">{label}</span>

      {requiresPhoto && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 text-xs font-semibold text-[#8B5CF6]">
          <Camera className="h-3.5 w-3.5" />
          Photo required
        </span>
      )}
    </div>
  )
}

export function TemplateItemsManager({ templateId, initialItems }: TemplateItemsManagerProps) {
  const { isReadOnly, openUpgradeModal } = useSubscription()
  const [items, setItems] = React.useState<TemplateItem[]>(initialItems)
  const [newLabel, setNewLabel] = React.useState('')
  const [requiresPhoto, setRequiresPhoto] = React.useState(false)
  const [isAdding, setIsAdding] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  // Sync state if initialItems from server component changes
  React.useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  // Set up sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require dragging a bit to differentiate from clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (isReadOnly) {
      openUpgradeModal()
      return
    }

    if (!over || active.id === over.id) return

    // Optimistically update UI order immediately
    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)
    const reorderedItems = arrayMove(items, oldIndex, newIndex)

    setItems(reorderedItems)

    // Call server action in the background with updated sort orders
    const updatePayload = reorderedItems.map((item, index) => ({
      id: item.id,
      sort_order: index,
    }))

    const res = await updateItemOrder(updatePayload)
    if (!res.success) {
      // Revert to old order on failure
      setItems(items)
      setErrorMessage(res.error || 'Failed to update order in database.')
    }
  }

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isReadOnly) {
      openUpgradeModal()
      return
    }
    if (!newLabel.trim()) return

    setIsAdding(true)
    setErrorMessage(null)

    const res = await addTemplateItem(templateId, newLabel, requiresPhoto)
    setIsAdding(false)

    if (res.success && res.data) {
      setItems([...items, res.data])
      setNewLabel('')
      setRequiresPhoto(false)
    } else {
      setErrorMessage(res.error || 'Failed to add checklist item.')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      {/* Items List (Left / Large Span) */}
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-white">Checklist Items</h2>
          <span className="text-sm text-zinc-500 bg-zinc-900 border border-white/8 px-3 py-1 rounded-full font-medium">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </span>
        </div>

        {errorMessage && (
          <div className="flex items-start gap-3 rounded-lg bg-rose-500/10 border border-rose-500/20 p-4 text-sm text-rose-400">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Error updating template</span>
              <p className="mt-0.5 text-rose-400/90">{errorMessage}</p>
            </div>
          </div>
        )}

        {items.length === 0 ? (
          <div className="backdrop-blur-xl bg-zinc-900/10 border border-white/8 border-dashed rounded-xl p-12 text-center text-zinc-500">
            No items in this template yet. Use the form on the right to start building.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {items.map((item) => (
                  <SortableItem
                    key={item.id}
                    id={item.id}
                    label={item.label}
                    requiresPhoto={item.requires_photo}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Add Item Form (Right Side) */}
      <div>
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle className="text-lg">Add Checklist Item</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label htmlFor="label" className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Item Label / Task Instruction
                </label>
                <Input
                  id="label"
                  type="text"
                  required
                  placeholder="e.g. Empty lint trap in dryer"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  disabled={isAdding}
                />
              </div>

              {/* Requires Photo Toggle */}
              <div className="flex items-center justify-between border border-white/8 bg-[#18181B] p-4 rounded-xl">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-white">Require Photo</span>
                  <span className="text-xs text-zinc-500">Staff must upload an image to complete this task</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresPhoto}
                    onChange={(e) => setRequiresPhoto(e.target.checked)}
                    disabled={isAdding}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8B5CF6]"></div>
                </label>
              </div>

              <Button type="submit" disabled={isAdding} className="w-full justify-center cursor-pointer">
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
