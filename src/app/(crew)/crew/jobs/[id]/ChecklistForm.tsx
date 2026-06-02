'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { submitJobResponse } from '@/app/actions/responses'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { motion } from 'framer-motion'
import {
  Camera,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import imageCompression from 'browser-image-compression'

interface TemplateItem {
  id: string
  label: string
  requires_photo: boolean
  sort_order: number
}

interface ChecklistFormProps {
  jobId: string
  orgId: string
  items: TemplateItem[]
}

export default function ChecklistForm({ jobId, orgId, items }: ChecklistFormProps) {
  const router = useRouter()
  const fileInputRefs = React.useRef<Record<string, HTMLInputElement | null>>({})

  // States
  const [checked, setChecked] = React.useState<Record<string, boolean>>({})
  const [photos, setPhotos] = React.useState<Record<string, string>>({})
  const [gps, setGps] = React.useState<{ lat: number; lng: number } | null>(null)
  const [gpsError, setGpsError] = React.useState<string | null>(null)
  const [gpsLoading, setGpsLoading] = React.useState(false)

  const [uploadingItem, setUploadingItem] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // 1. Capture Geolocation on Mount
  const fetchLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.')
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
        console.error('GPS error:', err)
        setGpsError('Could not retrieve GPS coordinates. Please enable location services.')
        setGpsLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }, [])

  React.useEffect(() => {
    fetchLocation()
  }, [fetchLocation])

  // 2. Toggle checkbox state
  const handleCheckboxChange = (itemId: string, isChecked: boolean) => {
    setChecked((prev) => ({
      ...prev,
      [itemId]: isChecked,
    }))
  }

  // 3. Handle photo selection, compression and upload
  const handlePhotoCapture = async (itemId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    setUploadingItem(itemId)
    setError(null)

    try {
      // Compress client-side (Max 400KB)
      let uploadFile: File | Blob = file
      try {
        const compressionOptions = {
          maxSizeMB: 0.4,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        }
        uploadFile = await imageCompression(file, compressionOptions)
      } catch (compErr) {
        console.warn('Image compression failed, using original file:', compErr)
      }

      // Upload to Supabase Storage: job-photos/org_id/job_id/item_id.jpg
      const supabase = createClient()
      const fileExtension = file.name.split('.').pop() || 'jpg'
      const storagePath = `${orgId}/${jobId}/${itemId}.${fileExtension}`

      const { error: uploadErr } = await supabase.storage
        .from('job-photos')
        .upload(storagePath, uploadFile, {
          upsert: true,
          contentType: file.type || 'image/jpeg',
        })

      if (uploadErr) {
        throw new Error(uploadErr.message)
      }

      // Save path to state
      setPhotos((prev) => ({
        ...prev,
        [itemId]: storagePath,
      }))

      // Auto-check item on successful photo upload
      setChecked((prev) => ({
        ...prev,
        [itemId]: true,
      }))
    } catch (err: any) {
      console.error('Upload error:', err)
      setError(`Failed to upload photo: ${err.message || err}`)
    } finally {
      setUploadingItem(null)
    }
  }

  // Trigger file input
  const triggerCamera = (itemId: string) => {
    fileInputRefs.current[itemId]?.click()
  }

  // 4. Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Validation: Enforce all items are checked
    const uncheckedItems = items.filter((item) => !checked[item.id])
    if (uncheckedItems.length > 0) {
      setError('Please complete all checklist items before submitting.')
      setIsSubmitting(false)
      return
    }

    // Validation: Enforce photo proof if required
    const missingPhotos = items.filter((item) => item.requires_photo && !photos[item.id])
    if (missingPhotos.length > 0) {
      setError('Photo proof is required for marked items.')
      setIsSubmitting(false)
      return
    }

    const payload = items.map((item) => ({
      itemId: item.id,
      checked: !!checked[item.id],
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Geolocation Status Card */}
      <Card className="border-white/8 bg-[#18181B]/40 backdrop-blur-md">
        <CardContent className="p-4 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <MapPin className={`h-4 w-4 shrink-0 ${gps ? 'text-[#8B5CF6] animate-pulse' : 'text-[#A1A1AA]'}`} />
            <div className="text-[#A1A1AA]">
              {gpsLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin text-[#8B5CF6]" />
                  Acquiring GPS location...
                </span>
              ) : gps ? (
                <span>
                  Location Captured ({gps.lat.toFixed(5)}, {gps.lng.toFixed(5)})
                </span>
              ) : gpsError ? (
                <span className="text-[#A1A1AA] font-medium">{gpsError}</span>
              ) : (
                <span>Location pending...</span>
              )}
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={fetchLocation}
            disabled={gpsLoading}
            className="h-7 w-7 p-0 hover:bg-[#18181B] rounded-full flex items-center justify-center text-[#A1A1AA] hover:text-[#FAFAFA]"
            title="Refresh GPS"
          >
            <RefreshCw className={`h-3 w-3 ${gpsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </CardContent>
      </Card>

      {/* Error Message banner */}
      {error && (
        <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm flex items-start gap-2">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Checklist items list (Native iOS-like feeling) */}
      <div className="space-y-2.5">
        {items.map((item) => {
          const isUploaded = !!photos[item.id]
          const isUploading = uploadingItem === item.id

          return (
            <Card
              key={item.id}
              className={`border-white/8 bg-[#18181B] backdrop-blur-xl transition-all duration-300 rounded-xl overflow-hidden ${
                checked[item.id] ? 'bg-[#18181B]/70 border-white/6' : ''
              }`}
            >
              <CardContent className="p-4 flex items-center justify-between gap-4">
                {/* Circular iOS-Style Checkbox and Label */}
                <label className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!checked[item.id]}
                    onChange={(e) => handleCheckboxChange(item.id, e.target.checked)}
                    className="sr-only"
                  />
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    animate={{
                      backgroundColor: checked[item.id] ? '#10B981' : 'transparent',
                      borderColor: checked[item.id] ? '#10B981' : 'rgba(255, 255, 255, 0.15)',
                      scale: checked[item.id] ? 1.08 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                    className="h-6 w-6 rounded-full border flex items-center justify-center shrink-0"
                  >
                    {checked[item.id] && (
                      <motion.svg
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="4"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </motion.svg>
                    )}
                  </motion.div>
                  <div className="min-w-0">
                    <span
                      className={`text-sm font-medium transition-all duration-200 break-words leading-tight ${
                        checked[item.id] ? 'line-through text-[#A1A1AA]/60' : 'text-[#FAFAFA]'
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.requires_photo && (
                      <span className="block text-[10px] text-[#8B5CF6] font-extrabold uppercase tracking-wider mt-0.5">
                        Requires photo proof
                      </span>
                    )}
                  </div>
                </label>

                {/* Photo Capture Section (Success state styled in Mint) */}
                {item.requires_photo && (
                  <div className="shrink-0">
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
                      <Button
                        type="button"
                        variant="ghost"
                        disabled
                        className="bg-[#18181B] border border-white/8 h-9 w-9 p-0 rounded-lg flex items-center justify-center cursor-not-allowed"
                      >
                        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                      </Button>
                    ) : isUploaded ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => triggerCamera(item.id)}
                        className="bg-[#10B981]/10 hover:bg-[#10B981]/20 border border-[#10B981]/30 text-[#10B981] h-9 w-9 p-0 rounded-lg flex items-center justify-center"
                        title="Change Photo"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => triggerCamera(item.id)}
                        className="bg-[#18181B] hover:bg-[#27272A] border border-white/8 text-[#A1A1AA] hover:text-[#FAFAFA] h-9 px-2.5 gap-1 rounded-lg text-xs flex items-center justify-center"
                      >
                        <Camera className="h-4 w-4" />
                        <span>Proof</span>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Submit Button */}
      <motion.button
        type="submit"
        disabled={isSubmitting}
        whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(139, 92, 246, 0.4)' }}
        whileTap={{ scale: 0.98 }}
        className="w-full h-14 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-extrabold uppercase tracking-widest text-xs rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border border-[#8B5CF6]/30 shadow-[0_0_20px_rgba(139,92,246,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Submitting Job...</span>
          </>
        ) : (
          <span>Complete & Submit Job</span>
        )}
      </motion.button>
    </form>
  )
}
