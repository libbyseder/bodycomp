import { useEffect, useState } from 'react'
import { X, Share, Plus } from 'lucide-react'

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isIos() || isStandalone()) return
    if (localStorage.getItem('recomptrack-install-dismissed') === '1') return
    setVisible(true)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    localStorage.setItem('recomptrack-install-dismissed', '1')
    setVisible(false)
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm">
      <div className="bg-zinc-900 border border-emerald-600/40 rounded-2xl p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-semibold text-white">Install RecompTrack</p>
            <p className="text-sm text-zinc-400 mt-1">
              Add to your Home Screen for a full-screen app experience.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="text-zinc-500 hover:text-white shrink-0 p-1"
            aria-label="Dismiss install instructions"
          >
            <X size={16} />
          </button>
        </div>
        <ol className="text-sm text-zinc-300 space-y-2">
          <li className="flex items-center gap-2">
            <Share size={14} className="text-emerald-400 shrink-0" />
            Tap <span className="text-white">Share</span> in Safari
          </li>
          <li className="flex items-center gap-2">
            <Plus size={14} className="text-emerald-400 shrink-0" />
            Tap <span className="text-white">Add to Home Screen</span>
          </li>
        </ol>
      </div>
    </div>
  )
}