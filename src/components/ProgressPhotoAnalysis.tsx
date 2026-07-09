import { Sparkles, RefreshCw } from 'lucide-react'
import type { Measurement, ProgressPhoto } from '../types'
import {
  confidenceLabel,
  formatBodyFatEstimate,
  parsePhotoAnalysis,
} from '../lib/photoAnalysis'

interface ProgressPhotoAnalysisProps {
  photo: ProgressPhoto
  measurement?: Measurement
  onAnalyze?: () => void | Promise<void>
  analyzing?: boolean
  compact?: boolean
}

export default function ProgressPhotoAnalysis({
  photo,
  measurement,
  onAnalyze,
  analyzing = false,
  compact = false,
}: ProgressPhotoAnalysisProps) {
  const analysis = parsePhotoAnalysis(photo.analysis_json)
  const estimate = analysis ? formatBodyFatEstimate(analysis) : null
  const scaleBf = measurement?.body_fat

  if (photo.analysis_status === 'pending' || analyzing) {
    return (
      <div className={`${compact ? 'mt-2' : 'mt-3'} flex items-center gap-2 text-xs text-violet-300`}>
        <RefreshCw size={12} className="animate-spin" />
        Analyzing photo…
      </div>
    )
  }

  if (photo.analysis_status === 'failed') {
    return (
      <div className={compact ? 'mt-2 space-y-2' : 'mt-3 space-y-2'}>
        <p className="text-xs text-amber-400">
          {photo.analysis_error || 'Analysis failed'}
        </p>
        {onAnalyze && (
          <button
            type="button"
            onClick={() => void onAnalyze()}
            className="text-xs text-violet-300 hover:text-violet-200"
          >
            Retry analysis
          </button>
        )}
      </div>
    )
  }

  if (!analysis) {
    return onAnalyze ? (
      <button
        type="button"
        onClick={() => void onAnalyze()}
        disabled={analyzing}
        className={`${compact ? 'mt-2' : 'mt-3'} inline-flex items-center gap-1.5 text-xs text-violet-300 hover:text-violet-200 disabled:opacity-50`}
      >
        <Sparkles size={12} />
        Run AI analysis
      </button>
    ) : null
  }

  return (
    <div className={`${compact ? 'mt-2' : 'mt-3'} space-y-1.5`}>
      {estimate && (
        <p className="text-xs font-medium text-violet-200">
          AI est. body fat: {estimate}
          <span className="text-zinc-500 font-normal ml-1">
            · {confidenceLabel(analysis.confidence)}
          </span>
        </p>
      )}
      {scaleBf != null && estimate && (
        <p className="text-[11px] text-zinc-500">
          Scale that day: {scaleBf}% — visual estimate only, not a replacement for scale data.
        </p>
      )}
      {!compact && (
        <>
          <p className="text-xs text-zinc-300 leading-relaxed">{analysis.summary}</p>
          {analysis.muscle_observations && (
            <p className="text-[11px] text-zinc-500">{analysis.muscle_observations}</p>
          )}
          {analysis.posture_notes && (
            <p className="text-[11px] text-zinc-600">{analysis.posture_notes}</p>
          )}
        </>
      )}
      {onAnalyze && (
        <button
          type="button"
          onClick={() => void onAnalyze()}
          disabled={analyzing}
          className="text-[11px] text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
        >
          Re-analyze
        </button>
      )}
    </div>
  )
}