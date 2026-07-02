import * as React from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  FileText,
  MapPin,
  User,
  Clock,
  Camera,
  Navigation,
  ExternalLink,
} from 'lucide-react'
import DownloadReportButton from '@/components/DownloadReportButton'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function JobReviewPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Authenticate user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Use admin client so RLS never blocks reading org_id
  const db = createAdminClient()
  const { data: profile } = await db
    .from('profiles')
    .select('org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return (
      <div className="text-white text-center p-8 bg-[#18181B] border border-white/8 rounded-xl max-w-lg mx-auto mt-12">
        <h3 className="text-lg font-semibold">No Organization Assigned</h3>
        <p className="text-zinc-400 text-sm mt-2">
          Your profile is not associated with any organization.
        </p>
      </div>
    )
  }

  // 2. Fetch job details
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select(`
      id,
      title,
      location,
      scheduled_at,
      completed_at,
      status,
      org_id,
      assigned_to,
      template_id,
      profiles!assigned_to (
        full_name
      ),
      templates!template_id (
        id,
        name
      )
    `)
    .eq('id', id)
    .single()

  if (jobError || !job) {
    notFound()
  }

  // Organization isolation check
  if (job.org_id !== profile.org_id) {
    return (
      <div className="text-white text-center p-8 bg-[#18181B] border border-white/8 rounded-xl max-w-lg mx-auto mt-12">
        <h3 className="text-lg font-semibold text-rose-450">Access Denied</h3>
        <p className="text-zinc-400 text-sm mt-2">
          You do not have permission to view this job report.
        </p>
      </div>
    )
  }

  // Safely extract profile and template names
  const rawProfiles = job.profiles
  const crewMemberName = Array.isArray(rawProfiles)
    ? rawProfiles[0]?.full_name
    : (rawProfiles as any)?.full_name || 'Unassigned'

  const rawTemplates = job.templates
  let templateName = Array.isArray(rawTemplates)
    ? rawTemplates[0]?.name
    : (rawTemplates as any)?.name || 'Standard Checklist'

  let templateItems: any[] = []

  // 3. Fetch template items ordered by sort_order
  if (job.templates) {
    const { data: items } = await supabase
      .from('template_items')
      .select('id, label, requires_photo, sort_order')
      .eq('template_id', job.template_id)
      .order('sort_order', { ascending: true })
    templateItems = items || []
  } else if (job.template_id) {
    // Fallback to system templates
    const { data: sysTemplate } = await db
      .from('templates')
      .select('name, items')
      .eq('id', job.template_id)
      .single()

    if (sysTemplate) {
      templateName = sysTemplate.name
      templateItems = (sysTemplate.items as any[]) || []
    }
  }

  // 4. Fetch job responses
  const { data: responses } = await supabase
    .from('job_responses')
    .select('id, item_id, checked, photo_path, gps_lat, gps_lng, created_at')
    .eq('job_id', id)

  const jobResponses = responses || []

  // 5. Generate signed URLs for private photos
  const signedUrls: Record<string, string> = {}
  for (const resp of jobResponses) {
    if (resp.photo_path) {
      const { data, error } = await supabase.storage
        .from('job-proofs')
        .createSignedUrl(resp.photo_path, 3600)
      if (data?.signedUrl) {
        signedUrls[resp.item_id] = data.signedUrl
      }
    }
  }

  // Match items with their responses
  const itemsWithResponses = templateItems.map((item) => {
    const response = jobResponses.find((r) => r.item_id === item.id)
    return {
      ...item,
      response: response || null,
    }
  })

  // Format Dates
  const formattedScheduled = job.scheduled_at
    ? new Date(job.scheduled_at).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'N/A'

  const formattedCompleted = job.completed_at
    ? new Date(job.completed_at).toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'N/A'

  // Calculate stats
  const totalItems = templateItems.length
  const completedItems = itemsWithResponses.filter((i) => i.response?.checked).length
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0

  // Grab the first response coordinates for maps link
  const firstGpsResponse = jobResponses.find((r) => r.gps_lat !== null && r.gps_lng !== null)
  const gpsLocation = firstGpsResponse
    ? { lat: firstGpsResponse.gps_lat, lng: firstGpsResponse.gps_lng }
    : null

  return (
    <div className="space-y-8 text-white">
      {/* Back button and page title */}
      <div className="space-y-4">
        <Link href="/jobs" className="inline-flex items-center text-sm text-[#A1A1AA] hover:text-[#FAFAFA] gap-1.5 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Jobs</span>
        </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Job Review Report</h1>
            <p className="text-[#A1A1AA] mt-1 text-sm">
              Verification report and photo proof for the completed cleaning dispatch.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold border bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20 w-fit">
              <CheckCircle className="h-4 w-4" />
              <span>Completed</span>
            </span>
            {job.status === 'completed' && (
              <DownloadReportButton jobId={job.id} />
            )}
          </div>
        </div>
      </div>

      {/* Grid containing summary meta and location */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Job Metadata Card */}
        <Card className="border-white/8 bg-[#18181B] backdrop-blur-xl md:col-span-2">
          <CardHeader className="pb-3 border-b border-white/8">
            <CardTitle className="text-lg">Assignment Details</CardTitle>
            <CardDescription>Overview of the properties and cleaning team schedule.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 grid gap-4 sm:grid-cols-2 text-sm">
            <div className="space-y-3">
              <div>
                <span className="text-[#A1A1AA] text-xs font-semibold uppercase tracking-wider block">Property Name</span>
                <span className="text-[#FAFAFA] font-semibold text-base mt-0.5 block">{job.title}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-[#A1A1AA] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#A1A1AA] text-xs font-medium block">Location</span>
                  <span className="text-[#FAFAFA]">{job.location}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 text-[#A1A1AA] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#A1A1AA] text-xs font-medium block">Assigned Crew Member</span>
                  <span className="text-[#FAFAFA] font-medium">{crewMemberName}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-[#A1A1AA] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#A1A1AA] text-xs font-medium block">Checklist Template</span>
                  <span className="text-[#8B5CF6] font-semibold">{templateName}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="h-4 w-4 text-[#A1A1AA] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#A1A1AA] text-xs font-medium block">Scheduled At</span>
                  <span className="text-[#FAFAFA]">{formattedScheduled}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-[#A1A1AA] shrink-0 mt-0.5" />
                <div>
                  <span className="text-[#A1A1AA] text-xs font-medium block">Completed At</span>
                  <span className="text-[#FAFAFA]">{formattedCompleted}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Summary Card */}
        <Card className="border-white/8 bg-[#18181B] backdrop-blur-xl">
          <CardHeader className="pb-3 border-b border-white/8">
            <CardTitle className="text-lg">Quality Progress</CardTitle>
            <CardDescription>Metrics on job checklist completion.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex flex-col justify-between h-[calc(100%-80px)]">
            <div className="space-y-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[#A1A1AA] text-sm">Task Completion</span>
                <span className="text-2xl font-black text-[#10B981]">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#10B981] h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <div className="text-[#A1A1AA] text-xs">
                {completedItems} of {totalItems} checklist items completed successfully.
              </div>
            </div>

            {gpsLocation && (
              <div className="pt-4 border-t border-white/8 mt-4 space-y-2">
                <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                  <Navigation className="h-3.5 w-3.5 text-[#10B981]" />
                  <span>GPS Confirmed ({gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)})</span>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${gpsLocation.lat},${gpsLocation.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#8B5CF6] hover:text-[#7C3AED] font-medium transition-colors"
                >
                  <span>Verify location on Google Maps</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Checklist items responses list */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight border-b border-white/8 pb-2">Checklist Proof Details</h2>

        <div className="grid gap-4">
          {itemsWithResponses.map((item, index) => {
            const isCompleted = !!item.response?.checked
            const photoUrl = signedUrls[item.id]

            return (
              <Card
                key={item.id}
                className="border-white/8 bg-[#18181B] hover:border-white/12 transition-all overflow-hidden"
              >
                <CardContent className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center text-xs font-bold bg-zinc-800 border border-zinc-700 text-zinc-300 h-6 w-6 rounded-full shrink-0">
                        {index + 1}
                      </span>
                      <h3 className="font-semibold text-[#FAFAFA] text-base leading-tight">
                        {item.label}
                      </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs pl-9">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold border ${
                          isCompleted
                            ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
                            : 'bg-zinc-800 text-[#A1A1AA] border-zinc-750'
                        }`}
                      >
                        {isCompleted ? 'Done' : 'Not Completed'}
                      </span>

                      {item.requires_photo && (
                        <span className="inline-flex items-center gap-1 text-[#8B5CF6] font-medium bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 px-2.5 py-0.5 rounded-full">
                          <Camera className="h-3.5 w-3.5" />
                          Photo Required
                        </span>
                      )}

                      {item.response?.gps_lat && item.response?.gps_lng && (
                        <span className="inline-flex items-center gap-1 text-[#8B5CF6] font-medium bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 px-2.5 py-0.5 rounded-full">
                          <Navigation className="h-3.5 w-3.5" />
                          GPS Logged
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Photo proof display container */}
                  {photoUrl && (
                    <div className="md:w-64 shrink-0 pl-9 md:pl-0">
                      <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                        Uploaded Proof
                      </span>
                      <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-white/8 bg-[#09090B] shadow-inner group">
                        <img
                          src={photoUrl}
                          alt={`Proof photo for ${item.label}`}
                          className="object-cover w-full h-full hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
