import { Plus } from 'lucide-react'

interface QuickLogFabProps {
  onClick: () => void
}

export default function QuickLogFab({ onClick }: QuickLogFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed z-50 right-4 sm:right-6 flex items-center justify-center w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-600 text-white shadow-lg shadow-cyan-500/25 transition-colors"
      style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
      aria-label="Quick log measurement"
    >
      <Plus size={24} strokeWidth={2.5} />
    </button>
  )
}