import { Info, ChevronDown } from 'lucide-react'

interface FfmiCalcInfoProps {
  open: boolean
  onToggle: () => void
  showTrigger?: boolean
}

export default function FfmiCalcInfo({
  open,
  onToggle,
  showTrigger = true,
}: FfmiCalcInfoProps) {
  return (
    <div>
      {showTrigger && (
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          aria-expanded={open}
        >
          <Info size={16} className="text-blue-400 shrink-0" />
          <span>How is FFMI calculated?</span>
          <ChevronDown
            size={16}
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {open && (
        <div className="mt-3 p-4 bg-zinc-800/70 border border-zinc-700 rounded-2xl text-sm text-zinc-300 leading-relaxed">
          <p className="font-medium text-white mb-2">Fat-Free Mass Index (FFMI)</p>
          <p className="mb-3">
            FFMI estimates how much lean (fat-free) mass you carry relative to your height.
            It helps track muscle development during a recomposition — independent of daily
            weight fluctuations.
          </p>
          <div className="font-mono text-xs bg-zinc-900/80 border border-zinc-700 rounded-xl px-3 py-2.5 text-blue-300 mb-3">
            FFMI = lean mass (kg) ÷ height (m)²
          </div>
          <ul className="space-y-1.5 text-xs text-zinc-400">
            <li>Lean mass (kg) = weight (kg) × (1 − body fat % ÷ 100)</li>
            <li>Height comes from your profile settings</li>
            <li>Trend lines use a moving average to smooth daily noise</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export function FfmiInfoButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-blue-400 hover:text-blue-300 transition-colors ml-1"
      aria-label="How FFMI is calculated"
    >
      <Info size={14} />
    </button>
  )
}