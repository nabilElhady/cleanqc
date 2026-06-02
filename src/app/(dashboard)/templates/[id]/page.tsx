import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TemplateItemsManager } from './TemplateItemsManager'

interface TemplateDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

export const dynamic = 'force-dynamic'

export default async function TemplateDetailsPage({ params }: TemplateDetailsPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch the template details
  const { data: template, error: templateError } = await supabase
    .from('checklist_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (templateError || !template) {
    notFound()
  }

  // Fetch template items ordered by sort_order
  const { data: items, error: itemsError } = await supabase
    .from('template_items')
    .select('*')
    .eq('template_id', id)
    .order('sort_order', { ascending: true })

  const templateItems = itemsError ? [] : items || []

  return (
    <div className="space-y-8 text-white relative">
      {/* Back button & Header */}
      <div className="space-y-4">
        <Button asChild variant="outline" className="cursor-pointer">
          <Link href="/templates" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Templates
          </Link>
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-medium text-sm">Template Builder</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
              <span className="text-zinc-400 font-medium text-sm">Organize Items</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1">{template.name}</h1>
            {template.description && (
              <p className="text-zinc-400 mt-2 text-sm leading-relaxed max-w-2xl">
                {template.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-white/8 pt-6">
        <TemplateItemsManager templateId={id} initialItems={templateItems} />
      </div>
    </div>
  )
}
