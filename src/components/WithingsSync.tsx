import { useState, useEffect, useRef } from 'react'
import { RefreshCw, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import { runWithingsSync } from '../lib/runWithingsSync'
import { supabase } from '../lib/supabase'

interface WithingsSyncProps {
  refetch: () => Promise<void>
  fullWidth?: boolean
  measurementCount?: number
}

export default function WithingsSync({
  refetch,
  fullWidth = false,
  measurementCount = 0,
}: WithingsSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showAdvanced) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowAdvanced(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAdvanced])

  const runSync = async (force: boolean) => {
    setIsSyncing(true)
    setShowAdvanced(false)

    try {
      const beforeCount = measurementCount
      const result = await runWithingsSync(force)

      if (!result.ok) {
        toast.error(result.error || 'Sync failed')
        return
      }

      toast.success(result.message || 'Sync completed!')
      await refetch()

      const { data: refreshed, error: readError } = await supabase
        .from('measurements')
        .select('id')

      if (readError) {
        console.error('Could not verify synced measurements:', readError)
      } else if ((result.measurementsSaved ?? 0) > 0 && (refreshed?.length ?? 0) <= beforeCount) {
        toast.error(
          'Sync saved data, but the app cannot read it. Check Supabase row-level security policies for the measurements table.',
          { duration: 8000 }
        )
      } else if (
        !force &&
        result.newReadingsMerged === 0 &&
        (result.skippedAlreadySynced ?? 0) > 0
      ) {
        toast(
          'No new readings. If data looks incomplete, try Advanced → Full re-sync.',
          { duration: 5000 }
        )
      }
    } catch (err) {
      console.error(err)
      toast.error('Error syncing with Withings')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleFullResync = () => {
    const confirmed = confirm(
      'Full re-sync will re-import ALL Withings history and merge it into your daily records.\n\n' +
      '• Use after Delete All or CSV import\n' +
      '• Can increase # Logs on days already synced\n' +
      '• Does not delete your existing data\n\n' +
      'Continue with full re-sync?'
    )
    if (confirmed) runSync(true)
  }

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-2 ${fullWidth ? 'w-full' : ''}`}
    >
      <div className={`flex items-stretch ${fullWidth ? 'w-full' : ''}`}>
        <button
          onClick={() => runSync(false)}
          disabled={isSyncing}
          className={`flex items-center justify-center gap-x-2 px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 rounded-l-2xl text-sm transition-colors ${fullWidth ? 'flex-1' : ''}`}
        >
          <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>

        <button
          onClick={() => setShowAdvanced((open) => !open)}
          disabled={isSyncing}
          className={`flex items-center justify-center gap-x-1 px-3 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 rounded-r-2xl text-sm border-l border-cyan-500 transition-colors ${fullWidth ? 'shrink-0' : ''}`}
          aria-expanded={showAdvanced}
          aria-controls="withings-advanced-panel"
        >
          Advanced
          <ChevronDown size={14} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {showAdvanced && (
        <div
          id="withings-advanced-panel"
          className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 overflow-hidden"
        >
          <button
            type="button"
            onClick={handleFullResync}
            disabled={isSyncing}
            className="w-full text-left px-4 py-3.5 text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            <span className="font-medium text-white block">Full re-sync</span>
            <span className="text-zinc-400 text-xs mt-1 block leading-relaxed">
              Re-import all Withings history
            </span>
          </button>
        </div>
      )}
    </div>
  )
}