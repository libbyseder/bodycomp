import {
  ArrowLeftRight,
  Blend,
  Check,
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
  CompareBackground,
  CompareToolSettings,
  ImageAdjustSettings,
} from '../lib/comparePhotoTools'
import {
  COMPARE_BACKGROUND_LABELS,
  COMPARE_BACKGROUND_ORDER,
  COMPARE_BACKGROUND_SWATCHES,
  DEFAULT_IMAGE_ADJUST,
  MAX_BRIGHTNESS,
  MAX_CONTRAST,
  MAX_COMPARE_SCALE,
  MIN_BRIGHTNESS,
  MIN_CONTRAST,
  MIN_COMPARE_SCALE,
  doneEditingPatch,
  getLayerAdjust,
  isEditingTools,
  patchLayerAdjust,
} from '../lib/comparePhotoTools'

interface ComparePhotoToolsProps {
  settings: CompareToolSettings
  onChange: (patch: Partial<CompareToolSettings>) => void
  onResetAll: () => void
  onResetSlider: () => void
  onDone: () => void
  showOverlayControls: boolean
  beforeUrl?: string | null
  afterUrl?: string | null
  beforeBgRemoved?: boolean
  afterBgRemoved?: boolean
  removingLayer?: CompareAdjustLayer | 'both' | null
  onRemoveBackground?: (layer: CompareAdjustLayer | 'both') => void
  onRestoreBackground?: (layer: CompareAdjustLayer | 'both') => void
  hasSavedEdits?: boolean
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
      className={`inline-flex flex-col items-center gap-1 min-w-[3.1rem] px-2 py-2 rounded-xl text-[10px] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none ${
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
  beforeCutout,
  afterCutout,
}: {
  value: CompareAdjustLayer
  onChange: (layer: CompareAdjustLayer) => void
  beforeCutout?: boolean
  afterCutout?: boolean
}) {
  return (
    <div className="flex rounded-xl border border-zinc-700 bg-zinc-900 p-0.5">
      {([
        { layer: 'before' as const, cutout: beforeCutout },
        { layer: 'after' as const, cutout: afterCutout },
      ]).map(({ layer, cutout }) => (
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
          {cutout ? ' · cut' : ''}
        </button>
      ))}
    </div>
  )
}

export default function ComparePhotoTools({
  settings,
  onChange,
  onResetAll,
  onResetSlider,
  onDone,
  showOverlayControls,
  beforeUrl,
  afterUrl,
  beforeBgRemoved = false,
  afterBgRemoved = false,
  removingLayer = null,
  onRemoveBackground,
  onRestoreBackground,
  hasSavedEdits = false,
}: ComparePhotoToolsProps) {
  const editing = isEditingTools(settings)
  const activeAdjust = getLayerAdjust(settings, settings.activeLayer)

  const updateActiveAdjust = (patch: Partial<ImageAdjustSettings>) => {
    onChange(patchLayerAdjust(settings, settings.activeLayer, patch))
  }

  const openOnly = (mode: 'align' | 'adjust' | 'background') => {
    onChange({
      alignMode: mode === 'align' ? !settings.alignMode : false,
      adjustMode: mode === 'adjust' ? !settings.adjustMode : false,
      backgroundPickerOpen:
        mode === 'background' ? !settings.backgroundPickerOpen : false,
    })
  }

  const selectBackground = (background: CompareBackground) => {
    // Always fit contain so the chosen backdrop is visible around the subject
    onChange({
      background,
      fitContain: true,
      backgroundPickerOpen: true,
    })
  }

  const bgBusy = removingLayer != null
  const activeBgRemoved =
    settings.activeLayer === 'before' ? beforeBgRemoved : afterBgRemoved
  const canRemoveBg = Boolean((beforeUrl || afterUrl) && onRemoveBackground)
  const anyCutout = beforeBgRemoved || afterBgRemoved

  const handleCutoutActive = () => {
    if (activeBgRemoved) {
      onRestoreBackground?.(settings.activeLayer)
    } else {
      onRemoveBackground?.(settings.activeLayer)
    }
  }

  const handleCutoutBoth = () => {
    if (beforeBgRemoved && afterBgRemoved) {
      onRestoreBackground?.('both')
    } else {
      onRemoveBackground?.('both')
    }
  }

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 p-2 rounded-2xl border border-zinc-800 bg-zinc-950/80">
        <ToolButton
          label="Swap"
          active={settings.swapped}
          onClick={() => onChange({ swapped: !settings.swapped })}
        >
          <ArrowLeftRight size={18} />
        </ToolButton>

        <ToolButton
          label="Overlay"
          active={settings.overlayMode}
          onClick={() => onChange({ overlayMode: !settings.overlayMode })}
        >
          <Blend size={18} />
        </ToolButton>

        <ToolButton
          label="Align"
          active={settings.alignMode}
          onClick={() => openOnly('align')}
        >
          <Move size={18} />
        </ToolButton>

        <ToolButton
          label="Adjust"
          active={settings.adjustMode}
          onClick={() => openOnly('adjust')}
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

        <ToolButton
          label="Backdrop"
          active={
            settings.backgroundPickerOpen || settings.background !== 'dark'
          }
          onClick={() => openOnly('background')}
        >
          <Palette size={18} />
        </ToolButton>

        {canRemoveBg && (
          <ToolButton
            label={
              bgBusy
                ? 'Working…'
                : beforeBgRemoved && afterBgRemoved
                  ? 'Cutouts'
                  : 'Cutout'
            }
            active={anyCutout || bgBusy}
            disabled={bgBusy}
            onClick={handleCutoutBoth}
          >
            <Sparkles size={18} />
          </ToolButton>
        )}

        <ToolButton label="Reset" onClick={onResetAll}>
          <RotateCcw size={18} />
        </ToolButton>

        {editing && (
          <ToolButton label="Done" active onClick={onDone}>
            <Check size={18} />
          </ToolButton>
        )}
      </div>

      <p className="text-center text-[11px] text-zinc-500">
        Backdrop: {COMPARE_BACKGROUND_LABELS[settings.background]}
        {settings.overlayMode ? ' · Overlay on' : ''}
        {anyCutout
          ? ` · Cutout${beforeBgRemoved && afterBgRemoved ? 's' : ''} on`
          : ''}
        {hasSavedEdits ? ' · Saved for this pair' : ''}
        {settings.alignMode
          ? ` · Align ${settings.activeLayer}: pinch / drag / scroll`
          : ''}
      </p>

      {settings.backgroundPickerOpen && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm text-zinc-200 font-medium">Stage backdrop</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Color behind both photos. Works best with Cutout or contain fit.
              </p>
            </div>
            <button
              type="button"
              onClick={onDone}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-500 text-white hover:bg-violet-400"
            >
              <Check size={14} />
              Done
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {COMPARE_BACKGROUND_ORDER.map((bg) => {
              const selected = settings.background === bg
              const swatch = COMPARE_BACKGROUND_SWATCHES[bg]
              return (
                <button
                  key={bg}
                  type="button"
                  onClick={() => selectBackground(bg)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-colors ${
                    selected
                      ? 'border-violet-400 bg-violet-500/15 text-violet-100'
                      : 'border-zinc-700 text-zinc-300 hover:bg-zinc-900'
                  }`}
                >
                  <span
                    className="h-5 w-5 rounded-md border border-zinc-600 shrink-0"
                    style={
                      bg === 'checkered'
                        ? {
                            backgroundImage: swatch,
                            backgroundSize: '8px 8px',
                          }
                        : { backgroundColor: swatch }
                    }
                  />
                  {COMPARE_BACKGROUND_LABELS[bg]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {(settings.alignMode || settings.adjustMode) && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-zinc-200 font-medium">
                {settings.alignMode ? 'Align photos' : 'Lighting'}
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Edits apply to the selected photo. Tap Done when it looks right.
              </p>
            </div>
            <button
              type="button"
              onClick={onDone}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-violet-500 text-white hover:bg-violet-400"
            >
              <Check size={14} />
              Done
            </button>
          </div>

          <LayerToggle
            value={settings.activeLayer}
            onChange={(activeLayer) => onChange({ activeLayer })}
            beforeCutout={beforeBgRemoved}
            afterCutout={afterBgRemoved}
          />

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
                Pinch with two fingers, drag to pan, or use the mouse wheel.
                Overlay mode makes alignment easiest.
              </p>
            </div>
          )}

          {settings.adjustMode && (
            <div className="space-y-4">
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

              {(settings.overlayMode || showOverlayControls) && (
                <label className="block text-sm">
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
                </label>
              )}

              {settings.blurAmount > 0 && (
                <label className="block text-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-zinc-300">Soft blur</span>
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

          {canRemoveBg && (
            <div className="flex flex-wrap gap-2 border-t border-zinc-800 pt-3">
              <button
                type="button"
                disabled={bgBusy}
                onClick={handleCutoutActive}
                className="text-xs px-3 py-1.5 rounded-lg border border-violet-500/40 text-violet-200 hover:bg-violet-500/10 disabled:opacity-40"
              >
                {bgBusy && removingLayer === settings.activeLayer
                  ? 'Removing…'
                  : activeBgRemoved
                    ? `Restore ${settings.activeLayer}`
                    : `Cutout ${settings.activeLayer}`}
              </button>
              <button
                type="button"
                disabled={bgBusy}
                onClick={handleCutoutBoth}
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
              >
                {bgBusy && removingLayer === 'both'
                  ? 'Removing both…'
                  : beforeBgRemoved && afterBgRemoved
                    ? 'Restore both cutouts'
                    : 'Cutout both'}
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange(
                    patchLayerAdjust(settings, settings.activeLayer, {
                      ...DEFAULT_IMAGE_ADJUST,
                    })
                  )
                }
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                Reset {settings.activeLayer}
              </button>
              {showOverlayControls && !settings.overlayMode && (
                <button
                  type="button"
                  onClick={onResetSlider}
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Center slider
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {!canRemoveBg && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      patchLayerAdjust(settings, settings.activeLayer, {
                        ...DEFAULT_IMAGE_ADJUST,
                      })
                    )
                  }
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Reset {settings.activeLayer}
                </button>
                {showOverlayControls && !settings.overlayMode && (
                  <button
                    type="button"
                    onClick={onResetSlider}
                    className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  >
                    Center slider
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={() => onChange(doneEditingPatch())}
              className="text-xs px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-400 hover:bg-zinc-800 ml-auto"
            >
              Close panel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
