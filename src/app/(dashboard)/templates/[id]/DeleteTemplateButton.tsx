'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteTemplate } from '@/app/actions/templates'

export function DeleteTemplateButton({ templateId }: { templateId: string }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = React.useState(false)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this template? This cannot be undone.')) {
      return
    }

    setIsDeleting(true)
    const res = await deleteTemplate(templateId)
    if (res.success) {
      router.push('/templates')
    } else {
      alert(res.error || 'Failed to delete template.')
      setIsDeleting(false)
    }
  }

  return (
    <Button
      variant="destructive"
      onClick={handleDelete}
      disabled={isDeleting}
      className="gap-2"
    >
      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      Delete Template
    </Button>
  )
}
