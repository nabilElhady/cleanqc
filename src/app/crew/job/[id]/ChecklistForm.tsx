'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { submitJobResponse } from '@/app/actions/responses'
import { Camera, CheckCircle2, AlertCircle, MapPin, RefreshCw, Loader2 } from 'lucide-react'
import imageCompression from 'browser-image-compression'

interface TemplateItem {
  id: string
  label: string
  requires_photo: boolean
  sort_order: number
}

interface Section {
  name: string
  items: TemplateItem[]
}

interface ChecklistFormProps {
  jobId: string
  orgId: string
  sections: Section[]
}

export default function ChecklistForm({ jobId, orgId, sections }: ChecklistFormProps) {
  const router = useRouter()
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({})

  // States
  const [statuses, setStatuses] = React.useState<Record<string, 'pass' | 'fail' | null>>({})
  const [photos, setPhotos] = React.useState<Record<string, string>>({})
  const [gps, setGps] = React.useState<{ lat: number; lng: number } | null>(null)
  const [gpsError, setGpsError] = React.useState<string | null>(null)
  const [gpsLoading, setGpsLoading] = React.useState(false)

  const [uploadingItem, setUploadingItem] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Extract all flat items for validation
  const allItems = React.useMemo(() => {
    return sections.flatMap((s) => s.items)
  }, [sections])

  // 1. Geolocation capture
  const fetchLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS not supported')
      return
    }

    setGpsLoading(true)
    setGpsError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGps({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setGpsLoading(false)
      },
      (err) => {
        console.error('GPS acquisition error:', err)
        setGpsError('GPS location missing')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [])

  React.useEffect(() => {
    fetchLocation()
  }, [fetchLocation])

  // 2. Set Pass / Fail status
  const handleStatusChange = (itemId: string, status: 'pass' | 'fail') => {
    setStatuses((prev) => ({
      ...prev,
      [itemId]: prev[itemId] === status ? null : status,
    }))
  }

  // 3. Image Compression & Supabase Storage upload
  const handlePhotoCapture = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    setUploadingItem(itemId)
    setError(null)

    try {
      // Compress client side (Max 400KB)
      let uploadFile: File | Blob = file
      try {
        const compressionOptions = {
          maxSizeMB: 0.4,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        }
        uploadFile = await imageCompression(file, compressionOptions)
      } catch (compErr) {
        console.warn('Image compression failed, uploading raw file:', compErr)
      }

      // Upload directly to job-proofs/org_id/job_id/item_id.jpg
      const supabase = createClient()
      const fileExtension = file.name.split('.').pop() || 'jpg'
      const storagePath = `${orgId}/${jobId}/${itemId}.${fileExtension}`

      const { error: uploadErr } = await supabase.storage
        .from('job-proofs')
        .upload(storagePath, uploadFile, {
          upsert: true,
          contentType: file.type || 'image/jpeg',
        })

      if (uploadErr) {
        throw new Error(uploadErr.message)
      }

      // Save storage path to state
      setPhotos((prev) => ({
        ...prev,
        [itemId]: storagePath,
      }))
    } catch (err: any) {
      console.error('Upload failed:', err)
      setError(`Upload failed: ${err.message || err}`)
    } finally {
      setUploadingItem(null)
    }
  }

  const triggerCamera = (itemId: string) => {
    fileInputRefs.current[itemId]?.click()
  }

  // 4. Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Validation: All items must be marked PASS or FAIL
    const uninspected = allItems.filter((item) => !statuses[item.id])
    if (uninspected.length > 0) {
      setError('Error: Complete all items (PASS/FAIL) before submitting.')
      setIsSubmitting(false)
      return
    }

    // Validation: Items requiring photo must have proof uploaded
    const missingPhotos = allItems.filter((item) => item.requires_photo && !photos[item.id])
    if (missingPhotos.length > 0) {
      setError('Error: Photo proof required for marked items.')
      setIsSubmitting(false)
      return
    }

    const payload = allItems.map((item) => ({
      itemId: item.id,
      checked: statuses[item.id] === 'pass', // Checked === pass in backend schema
      photoPath: photos[item.id] || null,
      gpsLat: gps ? gps.lat : null,
      gpsLng: gps ? gps.lng : null,
    }))

    const res = await submitJobResponse(jobId, payload)

    if (res.success) {
      router.push('/crew/jobs')
      router.refresh()
    } else {
      setError(res.error || 'Failed to submit checklist response.')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Geolocation status box (1px solid black) */}
      <div className="border border-black bg-white p-4 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <MapPin className={`h-4 w-4 shrink-0 ${gps ? 'text-black' : 'text-zinc-400'}`} />
          <span className="font-mono uppercase font-bold tracking-wider">
            {gpsLoading ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin text-black" />
                ACQUIRING GPS SIGNAL...
              </span>
            ) : gps ? (
              <span>
                GPS OK: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
              </span>
            ) : gpsError ? (
              <span className="text-zinc-500 font-black">{gpsError}</span>
            ) : (
              <span>ACQUIRING GPS SIGNAL...</span>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={fetchLocation}
          disabled={gpsLoading}
          className="border border-black bg-white hover:bg-black hover:text-white h-7 w-7 flex items-center justify-center cursor-pointer transition-colors duration-150 rounded-none"
        >
          <RefreshCw className={`h-3 w-3 ${gpsLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error Output banner */}
      {error && (
        <div className="border border-black bg-white text-black p-4 text-xs font-mono uppercase flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Sections and ChecklistItems */}
      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.name} className="space-y-4">
            <h2 className="text-xs font-black tracking-widest text-zinc-500 border-b border-zinc-200 pb-1 uppercase">
              {section.name}
            </h2>

            <div className="space-y-6">
              {section.items.map((item) => {
                const itemStatus = statuses[item.id]
                const isUploaded = !!photos[item.id]
                const isUploading = uploadingItem === item.id

                return (
                  <div
                    key={item.id}
                    className="border border-black bg-white p-4 space-y-4 rounded-none"
                  >
                    {/* Item label */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-black uppercase tracking-wider leading-snug">
                          {item.label}
                        </span>
                        {item.requires_photo && (
                          <span className="block text-[9px] font-black text-black uppercase tracking-widest">
                            * PHOTO PROOF REQUIRED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Massive thumb-friendly PASS / FAIL toggle buttons */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, 'pass')}
                        className={`flex-1 py-4 font-mono font-black text-sm tracking-wider uppercase border-2 transition-all duration-100 rounded-none cursor-pointer ${
                          itemStatus === 'pass'
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-black border-black hover:bg-zinc-50'
                        }`}
                      >
                        PASS
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChange(item.id, 'fail')}
                        className={`flex-1 py-4 font-mono font-black text-sm tracking-wider uppercase border-2 transition-all duration-100 rounded-none cursor-pointer ${
                          itemStatus === 'fail'
                            ? 'bg-black text-white border-black'
                            : 'bg-white text-black border-black hover:bg-zinc-50'
                        }`}
                      >
                        FAIL
                      </button>
                    </div>

                    {/* Photo Upload Section */}
                    {item.requires_photo && (
                      <div className="pt-2">
                        <input
                          type="file"
                          ref={(el) => {
                            fileInputRefs.current[item.id] = el
                          }}
                          onChange={(e) => handlePhotoCapture(item.id, e)}
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                        />

                        {isUploading ? (
                          <div className="w-full border border-black bg-zinc-150 py-3 text-center text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>UPLOADING IMAGE...</span>
                          </div>
                        ) : isUploaded ? (
                          <div className="space-y-2">
                            <button
                              type="button"
                              onClick={() => triggerCamera(item.id)}
                              className="w-full border border-black bg-black text-white hover:bg-white hover:text-black py-3 text-xs font-bold uppercase tracking-widest transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer rounded-none"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              <span>CHANGE PHOTO PROOF</span>
                            </button>
                            <div className="border border-black p-1 bg-zinc-50">
                              {/* Stark simple indicator rather than large heavy preview to save bandwidth */}
                              <div className="text-[10px] text-zinc-500 font-bold p-2 uppercase text-center">
                                IMAGE CACHED & UPLOADED OK
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => triggerCamera(item.id)}
                            className="w-full border border-black bg-white hover:bg-black hover:text-white py-3 text-xs font-bold uppercase tracking-widest transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer rounded-none"
                          >
                            <Camera className="h-4 w-4" />
                            <span>CAPTURE PHOTO PROOF</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t-4 border-black bg-white p-4 z-50 rounded-none">
        <button
          type="submit"
          disabled={isSubmitting || uploadingItem !== null}
          className="w-full bg-black text-white hover:bg-zinc-800 disabled:bg-zinc-300 disabled:border-zinc-300 disabled:text-zinc-500 py-4 font-mono text-sm font-black tracking-widest uppercase transition-colors duration-150 text-center cursor-pointer rounded-none flex items-center justify-center gap-2 border-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>SUBMITTING INSPECTION...</span>
            </>
          ) : (
            <span>SUBMIT INSPECTION</span>
          )}
        </button>
      </div>
    </form>
  )
}
