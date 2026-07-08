import { Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { openWithingsAuth } from '../lib/withingsAuth'

interface ConnectWithingsButtonProps {
  connected: boolean
  loading?: boolean
  className?: string
  onNavigate?: () => void
}

export default function ConnectWithingsButton({
  connected,
  loading = false,
  className = '',
  onNavigate,
}: ConnectWithingsButtonProps) {
  if (loading) {
    return (
      <span
        className={`flex items-center justify-center gap-x-2 px-4 py-2.5 rounded-2xl text-sm bg-zinc-800 text-zinc-400 w-full lg:w-auto ${className}`}
      >
        Checking…
      </span>
    )
  }

  if (connected) {
    return (
      <span
        className={`flex items-center justify-center gap-x-2 px-4 py-2.5 rounded-2xl text-sm bg-zinc-800 border border-emerald-600/40 text-emerald-400 w-full lg:w-auto ${className}`}
        aria-label="Withings connected"
      >
        <Check size={16} />
        Connected
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        onNavigate?.()
        void openWithingsAuth().catch((error) => {
          console.error(error)
          toast.error(error instanceof Error ? error.message : 'Failed to open Withings authorization')
        })
      }}
      className={`flex items-center justify-center gap-x-2 px-4 py-2.5 rounded-2xl text-sm bg-blue-600 hover:bg-blue-700 transition-colors w-full lg:w-auto ${className}`}
    >
      Connect Withings
    </button>
  )
}