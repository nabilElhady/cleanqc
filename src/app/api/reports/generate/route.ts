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

    // 3. Fetch completed job details along with Org name & Crew name in a single joined query
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
        completed_at,
        organizations(name),
        profiles!assigned_to(full_name)
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

    // Supabase returns related objects. Handle array or single object format.
    const orgData = Array.isArray(job.organizations) ? job.organizations[0] : job.organizations;
    const crewData = Array.isArray(job.profiles) ? job.profiles[0] : job.profiles;

    const orgName = orgData?.name || 'Crewmark'
    const crewName = crewData?.full_name || 'Assigned Crew Member'

    // 4. Fetch checklist items and responses concurrently
    const [templateItemsRes, responsesRes] = await Promise.all([
      supabase
        .from('template_items')
        .select('id, label, requires_photo, sort_order')
        .eq('template_id', job.template_id)
        .order('sort_order', { ascending: true }),
      supabase
        .from('job_responses')
        .select('item_id, checked, photo_path')
        .eq('job_id', jobId)
    ])

    const templateItems = templateItemsRes.data
    const responses = responsesRes.data

    // Pre-allocate response lookup for O(1) access
    const responseMap = new Map<string, any>()
    if (responses) {
      for (const r of responses) {
        responseMap.set(r.item_id, r)
      }
    }

    // Single pass data aggregation to minimize GC overhead and memory allocations
    const sectionsMap: Record<string, any[]> = {}
    const photosList: Array<{label: string, url: string}> = []

    if (templateItems) {
      for (const item of templateItems) {
        const resp = responseMap.get(item.id)
        let photoUrl: string | null = null

        if (resp?.photo_path) {
          // Resolve the public URL of the photo in the storage bucket
          const { data } = supabase.storage
            .from('job-proofs')
            .getPublicUrl(resp.photo_path)
          photoUrl = data.publicUrl
        }

        const status = resp ? (resp.checked ? 'PASS' : 'FAIL') : 'FAIL'
        
        // Optimize string allocations for sections
        let sectionName = 'GENERAL'
        let labelText = item.label

        const colonIndex = item.label.indexOf(':')
        if (colonIndex !== -1) {
          sectionName = item.label.substring(0, colonIndex).trim().toUpperCase()
          labelText = item.label.substring(colonIndex + 1).trim()
        }

        const mappedItem = {
          id: item.id,
          label: labelText,
          requires_photo: item.requires_photo,
          status,
          photoUrl,
        }

        if (!sectionsMap[sectionName]) {
          sectionsMap[sectionName] = []
        }
        sectionsMap[sectionName].push(mappedItem)

        // Add to photos list immediately if there's a photo
        if (photoUrl) {
          photosList.push({
            label: `${labelText} [${status}]`,
            url: photoUrl
          })
        }
      }
    }

    const groupedSections = Object.entries(sectionsMap).map(([name, items]) => ({
      name,
      items,
    }))

    // 6. Generate the PDF stream
    const reportComponent = React.createElement(PDFReportTemplate, {
      job: {
        id: job.id,
        title: job.title,
        location: job.location,
        completed_at: job.completed_at || '',
        templates: null,
      },
      orgName,
      crewName,
      sections: groupedSections,
      photos: photosList,
    })

    const pdfStream = await renderToStream(reportComponent as any)

    // Convert Node.js Stream to Web ReadableStream for non-blocking HTTP streaming
    const stream = new ReadableStream({
      start(controller) {
        pdfStream.on('data', (chunk: any) => controller.enqueue(chunk));
        pdfStream.on('end', () => controller.close());
        pdfStream.on('error', (err: any) => controller.error(err));
      }
    });

    // Return non-blocking stream with optimized streaming headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Crewmark-Report-${jobId}.pdf"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
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
