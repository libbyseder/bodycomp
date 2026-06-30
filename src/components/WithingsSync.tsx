import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { RefreshCw, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'

interface WithingsSyncProps {
  refetch: () => Promise<void>
  fullWidth?: boolean
}

export default function WithingsSync({ refetch, fullWidth = false }: WithingsSyncProps) {
  const [isSyncing, setIsSyncing] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showAdvanced) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
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
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please log in first')
        return
      }

      const res = await fetch('/api/withings/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ force }),
      })

      const result = await res.json()

      if (!result.success) {
        toast.error(result.error || 'Sync failed')
        return
      }

      toast.success(result.message || 'Sync completed!')
      await refetch()

      if (!force && result.newReadingsMerged === 0 && (result.skippedAlreadySynced ?? 0) > 0) {
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
    <div className={`relative flex items-center ${fullWidth ? 'w-full' : ''}`} ref={menuRef}>
      <button
        onClick={() => runSync(false)}
        disabled={isSyncing}
        className={`flex items-center justify-center gap-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-l-2xl text-sm transition-colors ${fullWidth ? 'flex-1' : ''}`}
      >
        <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
        {isSyncing ? 'Syncing...' : 'Sync Now'}
      </button>

      <button
        onClick={() => setShowAdvanced((open) => !open)}
        disabled={isSyncing}
        className={`flex items-center justify-center gap-x-1 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 rounded-r-2xl text-sm border-l border-emerald-600 transition-colors ${fullWidth ? 'shrink-0' : ''}`}
        aria-expanded={showAdvanced}
        aria-haspopup="menu"
      >
        Advanced
        <ChevronDown size={14} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
      </button>

      {showAdvanced && (
        <div
          role="menu"
          className={`absolute top-full mt-2 w-full sm:w-56 bg-zinc-800 border border-zinc-700 rounded-2xl shadow-xl z-50 overflow-hidden ${fullWidth ? 'left-0' : 'right-0'}`}
        >
          <button
            role="menuitem"
            onClick={handleFullResync}
            disabled={isSyncing}
            className="w-full text-left px-4 py-3 text-sm hover:bg-zinc-700 transition-colors disabled:opacity-50"
          >
            <span className="font-medium text-white block">Full re-sync</span>
            <span className="text-zinc-400 text-xs mt-0.5 block">
              Re-import all Withings history
            </span>
          </button>
        </div>
      )}
    </div>
  )
}