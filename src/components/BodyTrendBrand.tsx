import BodyTrendLogo from './BodyTrendLogo'

interface BodyTrendBrandProps {
  compact?: boolean
  className?: string
}

export default function BodyTrendBrand({
  compact = false,
  className = '',
}: BodyTrendBrandProps) {
  return (
    <div className={`flex items-center gap-x-2 sm:gap-x-3 min-w-0 ${className}`}>
      <div className="shrink-0 rounded-2xl bg-zinc-950/80 border border-zinc-800 p-1.5 sm:p-2">
        <BodyTrendLogo className="h-8 w-8 sm:h-10 sm:w-10" />
      </div>
      <div className="min-w-0">
        <span
          className={`font-bold text-white tracking-tight block truncate ${
            compact
              ? 'text-xl sm:text-2xl lg:text-3xl'
              : 'text-3xl sm:text-4xl lg:text-5xl'
          }`}
        >
          BodyTrend
        </span>
        <span className="text-cyan-400 text-[10px] sm:text-xs lg:text-sm block -mt-0.5 sm:-mt-1 font-medium">
          Track your body composition trends
        </span>
      </div>
    </div>
  )
}