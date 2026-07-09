import { useEffect, useMemo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import type { Measurement, Profile, ProgressPhoto } from '../types'
import { analyzeProgressPhoto } from '../lib/analyzeProgressPhoto'
import { usePhotoSignedUrls } from '../hooks/usePhotoSignedUrls'
import {
  deleteProgressPhoto,
  formatPhotoDate,
  PHOTO_POSE_LABELS,
} from '../lib/progressPhotos'
import ProgressPhotoCompare from './ProgressPhotoCompare'
import ProgressPhotoUpload from './ProgressPhotoUpload'
import ProgressPhotoAnalysis from './ProgressPhotoAnalysis'

interface ProgressPhotoGalleryProps {
  photos: ProgressPhoto[]
  measurements: Measurement[]
  profile: Profile | null
  loading: boolean
  onRefresh: () => void | Promise<void>
}

export default function ProgressPhotoGallery({
  photos,
  measurements,
  profile,
  loading,
  onRefresh,
}: ProgressPhotoGalleryProps) {
  const [uploadDate, setUploadDate] = useState('')
  const [useCustomDate, setUseCustomDate] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const { getUrl, isLoading } = usePhotoSignedUrls(photos)

  const measurementDates = useMemo(
    () => [...new Set(measurements.map((m) => m.date))].sort((a, b) => b.localeCompare(a)),
    [measurements]
  )

  useEffect(() => {
    if (measurementDates.length === 0) {
      setUploadDate((current) => current || new Date().toISOString().split('T')[0])
      return
    }

    setUploadDate((current) =>
      current && measurementDates.includes(current) ? current : measurementDates[0]
    )
  }, [measurementDates])

  const grouped = useMemo(() => {
    const map = new Map<string, ProgressPhoto[]>()
    for (const photo of photos) {
      const existing = map.get(photo.date) ?? []
      existing.push(photo)
      map.set(photo.date, existing)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [photos])

  const runAnalysis = async (photoId: string) => {
    setAnalyzingId(photoId)
    const result = await analyzeProgressPhoto(photoId)
    setAnalyzingId(null)

    if (!result.ok) {
      toast.error(result.error || 'Analysis failed')
      await onRefresh()
      return
    }

    toast.success('AI analysis complete')
    await onRefresh()
  }

  const handleDelete = async (photo: ProgressPhoto) => {
    if (!confirm('Delete this progress photo?')) return

    setDeletingId(photo.id)
    const { error } = await deleteProgressPhoto(supabase, photo)
    setDeletingId(null)

    if (error) {
      toast.error(error)
      return
    }

    toast.success('Photo deleted')
    await onRefresh()
  }

  return (
    <div className="space-y-6">
      <ProgressPhotoCompare
        photos={photos}
        measurements={measurements}
        profile={profile}
        getPhotoUrl={getUrl}
        isPhotoLoading={isLoading}
      />

      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-1">Add progress photo</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Upload a check-in photo and optionally run AI body composition analysis. Estimates are
          visual only — your scale data stays primary.
        </p>

        <label className="block text-sm text-zinc-400 mb-2">Link to date</label>
        {measurementDates.length > 0 && !useCustomDate ? (
          <div className="space-y-2 mb-4">
            <select
              value={uploadDate}
              onChange={(e) => setUploadDate(e.target.value)}
              className="w-full sm:w-auto bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
            >
              {measurementDates.map((date) => (
                <option key={date} value={date}>
                  {formatPhotoDate(date)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setUseCustomDate(true)}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Use a different date
            </button>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            <input
              type="date"
              value={uploadDate}
              onChange={(e) => setUploadDate(e.target.value)}
              className="w-full sm:w-auto bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-violet-500"
            />
            {measurementDates.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setUseCustomDate(false)
                  if (!measurementDates.includes(uploadDate)) {
                    setUploadDate(measurementDates[0])
                  }
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Choose from logged dates
              </button>
            )}
          </div>
        )}

        <ProgressPhotoUpload
          date={uploadDate}
          onUploaded={onRefresh}
          analyzeAfterUpload
        />
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Photo gallery</h2>
          <span className="text-sm text-zinc-400">
            {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-zinc-400">Loading photos…</p>
        ) : grouped.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No progress photos yet. Add a front, side, or back photo to start a visual timeline.
          </p>
        ) : (
          <div className="space-y-6">
            {grouped.map(([date, dayPhotos]) => {
              const measurement = measurements.find((m) => m.date === date)
              return (
                <section key={date}>
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
                    <h3 className="font-medium text-white">{formatPhotoDate(date)}</h3>
                    {measurement && (
                      <span className="text-xs text-zinc-500">
                        {measurement.weight} lbs
                        {measurement.body_fat != null ? ` · ${measurement.body_fat}% BF (scale)` : ''}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dayPhotos.map((photo) => (
                      <article
                        key={photo.id}
                        className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950"
                      >
                        <div className="relative">
                          {isLoading(photo.storage_path) ? (
                            <div className="aspect-[3/4] flex items-center justify-center text-xs text-zinc-500">
                              Loading…
                            </div>
                          ) : getUrl(photo.storage_path) ? (
                            <img
                              src={getUrl(photo.storage_path)!}
                              alt={`${PHOTO_POSE_LABELS[photo.pose]} progress photo on ${date}`}
                              className="aspect-[3/4] w-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="aspect-[3/4] flex items-center justify-center text-xs text-zinc-500">
                              Preview unavailable
                            </div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                            <p className="text-xs font-medium text-white">
                              {PHOTO_POSE_LABELS[photo.pose]}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleDelete(photo)}
                            disabled={deletingId === photo.id}
                            className="absolute top-2 right-2 p-2 rounded-xl bg-black/60 text-zinc-200 hover:bg-red-600/90 hover:text-white transition-colors disabled:opacity-50"
                            aria-label="Delete photo"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="p-3">
                          <ProgressPhotoAnalysis
                            photo={photo}
                            measurement={measurement}
                            analyzing={analyzingId === photo.id}
                            onAnalyze={() => runAnalysis(photo.id)}
                          />
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}