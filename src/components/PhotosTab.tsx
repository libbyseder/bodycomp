import { useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { Measurement, Profile, ProgressPhoto } from '../types'
import type { PhotosSection } from '../types/navigation'
import { posesWithMultiplePhotos } from '../lib/progressPhotoCompare'
import ProgressPhotoGallery from './ProgressPhotoGallery'
import ProgressPhotoCompareSection from './ProgressPhotoCompareSection'

interface PhotosTabProps {
  photos: ProgressPhoto[]
  measurements: Measurement[]
  profile: Profile | null
  photosLoading: boolean
  onRefreshPhotos: () => void | Promise<void>
  /** Optional: open on compare when deep-linked */
  initialSection?: PhotosSection
}

export default function PhotosTab({
  photos,
  measurements,
  profile,
  photosLoading,
  onRefreshPhotos,
  initialSection = 'gallery',
}: PhotosTabProps) {
  const [section, setSection] = useState<PhotosSection>(initialSection)

  const canCompare = useMemo(
    () => posesWithMultiplePhotos(photos).length > 0,
    [photos]
  )

  const subtitle = useMemo(() => {
    if (section === 'compare') {
      return canCompare
        ? 'Align, cut out backgrounds, and save adjustments'
        : 'Add the same pose on two dates to compare'
    }
    return `${photos.length} progress ${photos.length === 1 ? 'photo' : 'photos'}`
  }, [section, photos.length, canCompare])

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Photos</h1>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void onRefreshPhotos()}
          className="flex items-center justify-center gap-x-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm transition-colors self-start"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="flex rounded-2xl border border-zinc-800 bg-zinc-900 p-1 mb-6 max-w-md">
        <button
          type="button"
          onClick={() => setSection('gallery')}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            section === 'gallery'
              ? 'bg-violet-500 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Gallery
        </button>
        <button
          type="button"
          onClick={() => setSection('compare')}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            section === 'compare'
              ? 'bg-fuchsia-500 text-white shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Compare
        </button>
      </div>

      {section === 'gallery' && (
        <ProgressPhotoGallery
          photos={photos}
          measurements={measurements}
          loading={photosLoading}
          onRefresh={onRefreshPhotos}
        />
      )}

      {section === 'compare' && (
        <ProgressPhotoCompareSection
          photos={photos}
          measurements={measurements}
          profile={profile}
        />
      )}
    </div>
  )
}
