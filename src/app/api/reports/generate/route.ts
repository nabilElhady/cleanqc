import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToStream } from '@react-pdf/renderer'
import * as React from 'react'
import PDFReportTemplate from './PDFReportTemplate'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id')

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID parameter is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Fetch requesting user profile to verify role
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 })
    }

    // Must be owner or admin of the organization
    if (profile.role !== 'owner' && profile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied: Requires admin or owner role' },
        { status: 403 }
      )
    }

    // 3. Fetch completed job details
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select(`
        id,
        title,
        location,
        status,
        org_id,
        assigned_to,
        template_id,
        completed_at
      `)
      .eq('id', jobId)
      .single()

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Verify requesting user is in the correct organization
    if (job.org_id !== profile.org_id) {
      return NextResponse.json(
        { error: 'Access denied: Organization mismatch' },
        { status: 403 }
      )
    }

    // 4. Fetch additional metadata (Org name & Crew name)
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', job.org_id)
      .single()

    const { data: crewProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', job.assigned_to)
      .single()

    const orgName = org?.name || 'CleanQC'
    const crewName = crewProfile?.full_name || 'Assigned Crew Member'

    // 5. Fetch checklist items and responses
    const { data: templateItems } = await supabase
      .from('template_items')
      .select('id, label, requires_photo, sort_order')
      .eq('template_id', job.template_id)
      .order('sort_order', { ascending: true })

    const { data: responses } = await supabase
      .from('job_responses')
      .select('item_id, checked, photo_path')
      .eq('job_id', jobId)

    const responseMap: Record<string, { checked: boolean; photo_path: string | null }> = {}
    responses?.forEach((r) => {
      responseMap[r.item_id] = {
        checked: r.checked,
        photo_path: r.photo_path,
      }
    })

    // Map template items to responses, resolving Storage URLs
    const itemsWithResponses = (templateItems || []).map((item) => {
      const resp = responseMap[item.id]
      let photoUrl: string | null = null

      if (resp?.photo_path) {
        // Resolve the public URL of the photo in the storage bucket
        const { data } = supabase.storage
          .from('job-photos')
          .getPublicUrl(resp.photo_path)
        photoUrl = data.publicUrl
      }

      return {
        id: item.id,
        label: item.label,
        requires_photo: item.requires_photo,
        status: resp ? (resp.checked ? ('PASS' as const) : ('FAIL' as const)) : ('FAIL' as const),
        photoUrl,
      }
    })

    // Group items into Sections dynamically based on label prefix
    const sectionsMap: Record<string, typeof itemsWithResponses> = {}
    itemsWithResponses.forEach((item) => {
      let sectionName = 'GENERAL'
      let labelText = item.label

      if (item.label.includes(':')) {
        const parts = item.label.split(':')
        sectionName = parts[0].trim().toUpperCase()
        labelText = parts.slice(1).join(':').trim()
      }

      if (!sectionsMap[sectionName]) {
        sectionsMap[sectionName] = []
      }
      sectionsMap[sectionName].push({
        ...item,
        label: labelText,
      })
    })

    const groupedSections = Object.keys(sectionsMap).map((name) => ({
      name,
      items: sectionsMap[name],
    }))

    // Retrieve all photos with label descriptions for appendix
    const photosList = itemsWithResponses
      .filter((item) => item.photoUrl)
      .map((item) => ({
        label: `${item.label} [${item.status}]`,
        url: item.photoUrl!,
      }))

    // 6. Generate the PDF stream
    const reportComponent = React.createElement(PDFReportTemplate, {
      job: {
        id: job.id,
        title: job.title,
        location: job.location,
        completed_at: job.completed_at || '',
        checklist_templates: null,
      },
      orgName,
      crewName,
      sections: groupedSections,
      photos: photosList,
    })

    const pdfStream = await renderToStream(reportComponent as any)

    // Return PDF stream directly
    return new Response(pdfStream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="CleanQC-Report-${jobId}.pdf"`,
      },
    })
  } catch (err: any) {
    console.error('Error generating PDF report:', err)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
