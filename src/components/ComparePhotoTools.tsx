import { useState } from 'react'
import {
  ArrowLeftRight,
  Blend,
  FlipHorizontal2,
  Focus,
  Palette,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react'
import type { CompareToolSettings } from '../lib/comparePhotoTools'
import {
  COMPARE_BACKGROUND_LABELS,
  COMPARE_BACKGROUND_ORDER,
} from '../lib/comparePhotoTools'

interface ComparePhotoToolsProps {
  settings: CompareToolSettings
  onChange: (patch: Partial<CompareToolSettings>) => void
  onResetSlider: () => void
  showOverlayControls: boolean
}

function ToolButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex flex-col items-center gap-1 min-w-[3.25rem] px-2 py-2 rounded-xl text-[10px] font-medium transition-colors ${
        active
          ? 'bg-violet-500/20 text-violet-200 border border-violet-500/40'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-transparent'
      }`}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}

export default function ComparePhotoTools({
  settings,
  onChange,
  onResetSlider,
  showOverlayControls,
}: ComparePhotoToolsProps) {
  const [showAdjust, setShowAdjust] = useState(false)

  const cycleBackground = () => {
    const index = COMPARE_BACKGROUND_ORDER.indexOf(settings.background)
    const next = COMPARE_BACKGROUND_ORDER[(index + 1) % COMPARE_BACKGROUND_ORDER.length]
    onChange({
      background: next,
      fitContain: next !== 'dark' && next !== 'black',
    })
  }

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 p-2 rounded-2xl border border-zinc-800 bg-zinc-950/80">
        <ToolButton
          label="Swap"
          onClick={() => onChange({ swapped: !settings.swapped })}
        >
          <ArrowLeftRight size={18} />
        </ToolButton>

        <ToolButton
          label="Auto"
          active={settings.overlayMode}
          onClick={() => onChange({ overlayMode: !settings.overlayMode })}
        >
          <Blend size={18} />
        </ToolButton>

        <ToolButton
          label="Adjust"
          active={showAdjust}
          onClick={() => setShowAdjust((open) => !open)}
        >
          <SlidersHorizontal size={18} />
        </ToolButton>

        <ToolButton
          label="Flip"
          active={settings.flipHorizontal}
          onClick={() => onChange({ flipHorizontal: !settings.flipHorizontal })}
        >
          <FlipHorizontal2 size={18} />
        </ToolButton>

        <ToolButton
          label="Blur"
          active={settings.blurAmount > 0}
          onClick={() =>
            onChange({ blurAmount: settings.blurAmount > 0 ? 0 : 4 })
          }
        >
          <Focus size={18} />
        </ToolButton>

        <ToolButton label="Background" onClick={cycleBackground}>
          <Palette size={18} />
        </ToolButton>

        {showOverlayControls && !settings.overlayMode && (
          <ToolButton label="Center" onClick={onResetSlider}>
            <RotateCcw size={18} />
          </ToolButton>
        )}
      </div>

      <p className="text-center text-[11px] text-zinc-500">
        Background: {COMPARE_BACKGROUND_LABELS[settings.background]}
        {settings.overlayMode ? ' · Overlay mode on' : ''}
      </p>

      {(showAdjust || settings.overlayMode) && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
          <label className="block text-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-zinc-300">Overlay opacity</span>
              <span className="text-xs text-zinc-500">{settings.overlayOpacity}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.overlayOpacity}
              onChange={(e) =>
                onChange({ overlayOpacity: Number(e.target.value) })
              }
              className="w-full accent-violet-500"
            />
            <p className="text-[11px] text-zinc-500 mt-1.5">
              {settings.overlayMode
                ? 'Blend before over after to spot subtle changes.'
                : 'Also softens the before layer in slider mode.'}
            </p>
          </label>

          {settings.blurAmount > 0 && (
            <label className="block text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-300">Background blur</span>
                <span className="text-xs text-zinc-500">{settings.blurAmount}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                value={settings.blurAmount}
                onChange={(e) =>
                  onChange({ blurAmount: Number(e.target.value) })
                }
                className="w-full accent-violet-500"
              />
            </label>
          )}
        </div>
      )}
    </div>
  )
}