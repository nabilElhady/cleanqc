import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TemplateItemsManager } from './TemplateItemsManager'
import { DeleteTemplateButton } from './DeleteTemplateButton'

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

  // Use admin client to bypass RLS, then manually enforce tenant isolation
  const db = createAdminClient()
  
  // Get user's org
  const { data: profile } = await db.from('profiles').select('org_id').eq('id', user.id).single()

  // Fetch the template details
  const { data: template, error: templateError } = await db
    .from('templates')
    .select('id, name, description, organization_id, created_at, is_system, items')
    .eq('id', id)
    .single()

  if (templateError || !template) {
    notFound()
  }

  const isSystem = template.is_system === true
  
  // If it's not a system template, ensure it belongs to the user's org
  if (!isSystem && template.organization_id !== profile?.org_id) {
    notFound()
  }

  // Fetch template items ordered by sort_order
  let templateItems: any[] = []
  
  if (isSystem && template.items) {
    // Parse system template items (JSONB) into the same structure
    const sections = Array.isArray(template.items) ? template.items : []
    let sortOrder = 1
    sections.forEach((sec: any) => {
      const sectionName = sec.section || ''
      const tasks = Array.isArray(sec.tasks) ? sec.tasks : []
      tasks.forEach((task: any) => {
        const label = sectionName ? `[${sectionName}] ${task.label}` : task.label
        templateItems.push({
          id: `sys-${sortOrder}`,
          template_id: id,
          label,
          requires_photo: !!task.requiresPhoto,
          sort_order: sortOrder++
        })
      })
    })
  } else {
    // Fetch relational items for custom templates
    const { data: items, error: itemsError } = await db
      .from('template_items')
      .select('id, template_id, label, requires_photo, sort_order')
      .eq('template_id', id)
      .order('sort_order', { ascending: true })
      
    if (!itemsError && items) {
      templateItems = items
    }
  }

  return (
    <div className="space-y-8 text-[#09090B] relative">
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
              <span className="text-zinc-500 font-medium text-sm">Checklist Builder</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#8B5CF6]" />
              <span className="text-zinc-500 font-medium text-sm">Organize Tasks</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight mt-1 text-[#09090B]">{template.name}</h1>
            {template.description && (
              <p className="text-zinc-600 mt-2 text-sm leading-relaxed max-w-2xl">
                {template.description}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-3">
            {isSystem ? (
              <Button asChild className="gap-2 cursor-pointer bg-slate-900 hover:bg-black text-white">
                <Link href={`/dashboard/dispatch?templateId=${id}`}>
                  Use Template
                </Link>
              </Button>
            ) : (
              <DeleteTemplateButton templateId={id} />
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-[#E4E4E7] pt-6">
        {isSystem && (
          <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-sm text-slate-600 font-medium">
              You are previewing a standard system template. It is read-only. Click "Use Template" to dispatch jobs with it, or create a custom template to make your own checklists.
            </p>
          </div>
        )}
        <TemplateItemsManager templateId={id} initialItems={templateItems} isSystemTemplate={isSystem} />
      </div>
    </div>
  )
}
