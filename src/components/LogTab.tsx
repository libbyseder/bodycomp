import { RefreshCw, Plus } from 'lucide-react'
import type { Measurement, Profile } from '../types'
import MeasurementsTable from './MeasurementsTable'

interface LogTabProps {
  measurements: Measurement[]
  profile: Profile | null
  onDelete: (id: string) => void
  onRefresh: () => Promise<void>
  onQuickLog: () => void
}

export default function LogTab({
  measurements,
  profile,
  onDelete,
  onRefresh,
  onQuickLog,
}: LogTabProps) {
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Log</h1>
          <p className="text-zinc-400 mt-1 text-sm sm:text-base">
            {measurements.length} total {measurements.length === 1 ? 'entry' : 'entries'}
          </p>
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
            onClick={() => void onRefresh()}
            className="flex items-center justify-center gap-x-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-2xl text-sm transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8">
        <MeasurementsTable
          measurements={measurements}
          onDelete={onDelete}
          profile={profile}
        />
      </div>
    </div>
  )
}