import { useMemo, useState } from 'react'
import { RefreshCw, Plus } from 'lucide-react'
import type { Measurement, Profile, ProgressPhoto } from '../types'
import { measurementsForDisplay } from '../lib/goalWindow'
import { posesWithMultiplePhotos } from '../lib/progressPhotoCompare'
import MeasurementsTable from './MeasurementsTable'
import GoalWindowNotice from './GoalWindowNotice'
import ProgressPhotoGallery from './ProgressPhotoGallery'
import ProgressPhotoCompareSection from './ProgressPhotoCompareSection'

type LogSection = 'measurements' | 'photos' | 'compare'

interface LogTabProps {
  measurements: Measurement[]
  profile: Profile | null
  photos: ProgressPhoto[]
  photosLoading: boolean
  onDelete: (id: string) => void
  onRefresh: () => Promise<void>
  onRefreshPhotos: () => void | Promise<void>
  onQuickLog: () => void
}

export default function LogTab({
  measurements,
  profile,
  photos,
  photosLoading,
  onDelete,
  onRefresh,
  onRefreshPhotos,
  onQuickLog,
}: LogTabProps) {
  const [section, setSection] = useState<LogSection>('measurements')

  const displayMeasurements = useMemo(
    () => measurementsForDisplay(measurements, profile),
    [measurements, profile]
  )

  const canCompare = useMemo(() => posesWithMultiplePhotos(photos).length > 0, [photos])

  const sectionSubtitle = useMemo(() => {
    if (section === 'measurements') {
      return `${displayMeasurements.length} measurement ${displayMeasurements.length === 1 ? 'entry' : 'entries'}`
    }
    if (section === 'compare') {
      return canCompare
        ? 'Drag the slider or view side-by-side'
        : 'Add the same pose on two dates to compare'
    }
    return `${photos.length} progress ${photos.length === 1 ? 'photo' : 'photos'}`
  }, [section, displayMeasurements.length, photos.length, canCompare])

  const handleRefreshAll = async () => {
    await Promise.all([onRefresh(), onRefreshPhotos()])
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Log</h1>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">{sectionSubtitle}</p>
          <GoalWindowNotice profile={profile} measurements={measurements} className="mt-1" />
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={onQuickLog}
            className="flex items-center justify-center gap-x-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 rounded-2xl text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Quick Log
          </button>
          <button
            type="button"
            onClick={() => void handleRefreshAll()}
            className="flex items-center justify-center gap-x-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setSection('measurements')}
          className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
            section === 'measurements'
              ? 'bg-cyan-500 text-white'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          Measurements
        </button>
        <button
          type="button"
          onClick={() => setSection('photos')}
          className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
            section === 'photos'
              ? 'bg-violet-500 text-white'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          Photos
        </button>
        <button
          type="button"
          onClick={() => setSection('compare')}
          className={`px-4 py-2 rounded-2xl text-sm font-medium transition-colors ${
            section === 'compare'
              ? 'bg-fuchsia-500 text-white'
              : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
          }`}
        >
          Compare
        </button>
      </div>

      {section === 'measurements' && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8">
          <MeasurementsTable
            measurements={displayMeasurements}
            onDelete={onDelete}
            profile={profile}
          />
        </div>
      )}

      {section === 'photos' && (
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