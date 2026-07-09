import { useState } from 'react'
import {
  ArrowLeftRight,
  Blend,
  FlipHorizontal2,
  Focus,
  Move,
  Palette,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react'
import type {
  CompareAdjustLayer,
  CompareToolSettings,
  ImageAdjustSettings,
} from '../lib/comparePhotoTools'
import {
  COMPARE_BACKGROUND_LABELS,
  COMPARE_BACKGROUND_ORDER,
  DEFAULT_IMAGE_ADJUST,
  MAX_BRIGHTNESS,
  MAX_CONTRAST,
  MAX_COMPARE_SCALE,
  MIN_BRIGHTNESS,
  MIN_CONTRAST,
  MIN_COMPARE_SCALE,
  getLayerAdjust,
  patchLayerAdjust,
} from '../lib/comparePhotoTools'

interface ComparePhotoToolsProps {
  settings: CompareToolSettings
  onChange: (patch: Partial<CompareToolSettings>) => void
  onResetSlider: () => void
  showOverlayControls: boolean
  /** Original signed URLs for before/after (for BG removal) */
  beforeUrl?: string | null
  afterUrl?: string | null
  beforeBgRemoved?: boolean
  afterBgRemoved?: boolean
  removingLayer?: CompareAdjustLayer | 'both' | null
  onRemoveBackground?: (layer: CompareAdjustLayer | 'both') => void
  onRestoreBackground?: (layer: CompareAdjustLayer | 'both') => void
}

function ToolButton({
  active,
  label,
  onClick,
  disabled,
  children,
}: {
  active?: boolean
  label: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`inline-flex flex-col items-center gap-1 min-w-[3.25rem] px-2 py-2 rounded-xl text-[10px] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none ${
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

function LayerToggle({
  value,
  onChange,
}: {
  value: CompareAdjustLayer
  onChange: (layer: CompareAdjustLayer) => void
}) {
  return (
    <div className="flex rounded-xl border border-zinc-700 bg-zinc-900 p-0.5">
      {(['before', 'after'] as const).map((layer) => (
        <button
          key={layer}
          type="button"
          onClick={() => onChange(layer)}
          className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
            value === layer
              ? 'bg-violet-500 text-white'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {layer}
        </button>
      ))}
    </div>
  )
}

export default function ComparePhotoTools({
  settings,
  onChange,
  onResetSlider,
  showOverlayControls,
  beforeUrl,
  afterUrl,
  beforeBgRemoved = false,
  afterBgRemoved = false,
  removingLayer = null,
  onRemoveBackground,
  onRestoreBackground,
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

  const activeAdjust = getLayerAdjust(settings, settings.activeLayer)

  const updateActiveAdjust = (patch: Partial<ImageAdjustSettings>) => {
    onChange(patchLayerAdjust(settings, settings.activeLayer, patch))
  }

  const resetActiveTransform = () => {
    updateActiveAdjust({
      scale: DEFAULT_IMAGE_ADJUST.scale,
      offsetX: DEFAULT_IMAGE_ADJUST.offsetX,
      offsetY: DEFAULT_IMAGE_ADJUST.offsetY,
    })
  }

  const resetActiveLighting = () => {
    updateActiveAdjust({
      brightness: DEFAULT_IMAGE_ADJUST.brightness,
      contrast: DEFAULT_IMAGE_ADJUST.contrast,
    })
  }

  const resetActiveAll = () => {
    onChange(
      patchLayerAdjust(settings, settings.activeLayer, { ...DEFAULT_IMAGE_ADJUST })
    )
  }

  const bgBusy = removingLayer != null
  const activeBgRemoved =
    settings.activeLayer === 'before' ? beforeBgRemoved : afterBgRemoved
  const canRemoveBg = Boolean(beforeUrl && afterUrl && onRemoveBackground)

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
          label="Align"
          active={settings.alignMode}
          onClick={() => onChange({ alignMode: !settings.alignMode })}
        >
          <Move size={18} />
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

        {canRemoveBg && (
          <ToolButton
            label={bgBusy ? 'Removing…' : activeBgRemoved ? 'BG On' : 'Cutout'}
            active={activeBgRemoved || removingLayer === settings.activeLayer}
            disabled={bgBusy}
            onClick={() => {
              if (activeBgRemoved) {
                onRestoreBackground?.(settings.activeLayer)
              } else {
                onRemoveBackground?.(settings.activeLayer)
              }
            }}
          >
            <Sparkles size={18} />
          </ToolButton>
        )}

        {showOverlayControls && !settings.overlayMode && !settings.alignMode && (
          <ToolButton label="Center" onClick={onResetSlider}>
            <RotateCcw size={18} />
          </ToolButton>
        )}
      </div>

      <p className="text-center text-[11px] text-zinc-500">
        Background: {COMPARE_BACKGROUND_LABELS[settings.background]}
        {settings.overlayMode ? ' · Overlay mode on' : ''}
        {settings.alignMode
          ? ` · Align ${settings.activeLayer}: pinch zoom, drag to pan`
          : ''}
      </p>

      {(settings.alignMode || showAdjust) && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-zinc-300 font-medium">Edit photo</span>
            <LayerToggle
              value={settings.activeLayer}
              onChange={(activeLayer) => onChange({ activeLayer })}
            />
          </div>

          {settings.alignMode && (
            <div className="space-y-3">
              <label className="block text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-300">Zoom</span>
                  <span className="text-xs text-zinc-500">
                    {Math.round(activeAdjust.scale * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_COMPARE_SCALE}
                  max={MAX_COMPARE_SCALE}
                  step={0.01}
                  value={activeAdjust.scale}
                  onChange={(e) =>
                    updateActiveAdjust({ scale: Number(e.target.value) })
                  }
                  className="w-full accent-violet-500"
                />
              </label>
              <p className="text-[11px] text-zinc-500">
                Pinch with two fingers or use the mouse wheel. Drag to pan.
                Works best in overlay mode for alignment.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resetActiveTransform}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Reset position
                </button>
                {canRemoveBg && (
                  <button
                    type="button"
                    disabled={bgBusy}
                    onClick={() => onRemoveBackground?.('both')}
                    className="text-xs px-3 py-1.5 rounded-lg border border-violet-500/40 text-violet-200 hover:bg-violet-500/10 disabled:opacity-40"
                  >
                    {removingLayer === 'both' ? 'Removing both…' : 'Cutout both'}
                  </button>
                )}
              </div>
            </div>
          )}

          {showAdjust && (
            <div className="space-y-4 border-t border-zinc-800 pt-4">
              <label className="block text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-300">Brightness</span>
                  <span className="text-xs text-zinc-500">
                    {activeAdjust.brightness}%
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_BRIGHTNESS}
                  max={MAX_BRIGHTNESS}
                  value={activeAdjust.brightness}
                  onChange={(e) =>
                    updateActiveAdjust({ brightness: Number(e.target.value) })
                  }
                  className="w-full accent-violet-500"
                />
              </label>

              <label className="block text-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-300">Contrast</span>
                  <span className="text-xs text-zinc-500">
                    {activeAdjust.contrast}%
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_CONTRAST}
                  max={MAX_CONTRAST}
                  value={activeAdjust.contrast}
                  onChange={(e) =>
                    updateActiveAdjust({ contrast: Number(e.target.value) })
                  }
                  className="w-full accent-violet-500"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resetActiveLighting}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Reset lighting
                </button>
                <button
                  type="button"
                  onClick={resetActiveAll}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Reset all for {settings.activeLayer}
                </button>
              </div>
            </div>
          )}

          {(showAdjust || settings.overlayMode) && (
            <label className="block text-sm border-t border-zinc-800 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-300">Overlay opacity</span>
                <span className="text-xs text-zinc-500">
                  {settings.overlayOpacity}%
                </span>
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
          )}

          {settings.blurAmount > 0 && (
            <label className="block text-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-zinc-300">Background blur</span>
                <span className="text-xs text-zinc-500">
                  {settings.blurAmount}px
                </span>
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
