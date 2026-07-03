import { Settings } from 'lucide-react'
import BodyTrendBrand from './BodyTrendBrand'
import SyncStatusBadge from './SyncStatusBadge'

interface DashboardHeaderProps {
  withingsConnected: boolean
  withingsLoading?: boolean
  measurementCount: number
  onOpenSettings: () => void
}

export default function DashboardHeader({
  withingsConnected,
  withingsLoading = false,
  measurementCount,
  onOpenSettings,
}: DashboardHeaderProps) {
  return (
    <header className="mb-5 sm:mb-6">
      <div className="flex items-center justify-between gap-3">
        <BodyTrendBrand compact />

        <div className="flex items-center gap-2 shrink-0">
          <SyncStatusBadge
            withingsConnected={withingsConnected}
            withingsLoading={withingsLoading}
            measurementCount={measurementCount}
            onClick={onOpenSettings}
          />
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 transition-colors"
            aria-label="Open settings"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}