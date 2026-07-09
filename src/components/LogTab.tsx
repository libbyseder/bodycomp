import { useMemo, useState } from 'react'
import { RefreshCw, Plus } from 'lucide-react'
import type { Measurement, Profile, ProgressPhoto } from '../types'
import { measurementsForDisplay } from '../lib/goalWindow'
import MeasurementsTable from './MeasurementsTable'
import GoalWindowNotice from './GoalWindowNotice'
import ProgressPhotoGallery from './ProgressPhotoGallery'

type LogSection = 'measurements' | 'photos'

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

  const handleRefreshAll = async () => {
    await Promise.all([onRefresh(), onRefreshPhotos()])
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Log</h1>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">
            {section === 'measurements'
              ? `${displayMeasurements.length} measurement ${displayMeasurements.length === 1 ? 'entry' : 'entries'}`
              : `${photos.length} progress ${photos.length === 1 ? 'photo' : 'photos'}`}
          </p>
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

      <div className="flex gap-2 mb-6">
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
      </div>

      {section === 'measurements' ? (
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8">
          <MeasurementsTable
            measurements={displayMeasurements}
            onDelete={onDelete}
            profile={profile}
          />
        </div>
      ) : (
        <ProgressPhotoGallery
          photos={photos}
          measurements={measurements}
          loading={photosLoading}
          onRefresh={onRefreshPhotos}
        />
      )}
    </div>
  )
}