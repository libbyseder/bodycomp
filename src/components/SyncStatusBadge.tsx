import { RefreshCw } from 'lucide-react'

interface SyncStatusBadgeProps {
  withingsConnected: boolean
  withingsLoading?: boolean
  measurementCount: number
  onClick?: () => void
}

export default function SyncStatusBadge({
  withingsConnected,
  withingsLoading = false,
  measurementCount,
  onClick,
}: SyncStatusBadgeProps) {
  if (withingsLoading) {
    return (
      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-400 text-xs">
        <RefreshCw size={12} className="animate-spin" />
        Checking…
      </span>
    )
  }

  const dotColor = withingsConnected ? 'bg-emerald-400' : 'bg-amber-400'
  const label = withingsConnected
    ? `${measurementCount} entries`
    : 'Not connected'

  const content = (
    <>
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} aria-hidden />
      <span className="truncate max-w-[8rem] sm:max-w-none">{label}</span>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs transition-colors"
        aria-label={withingsConnected ? 'Withings connected' : 'Connect Withings in Settings'}
      >
        {content}
      </button>
    )
  }

  return (
    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 text-xs">
      {content}
    </span>
  )
}