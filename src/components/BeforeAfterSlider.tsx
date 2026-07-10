import { useCallback, useEffect, useRef, useState } from 'react'
import { GripVertical } from 'lucide-react'
import type { CompareToolSettings, ImageAdjustSettings } from '../lib/comparePhotoTools'
import {
  compareBackgroundStyle,
  getLayerAdjust,
  patchLayerAdjust,
} from '../lib/comparePhotoTools'
import { usePinchPanZoom } from '../hooks/usePinchPanZoom'
import ComparePhotoImage from './ComparePhotoImage'

interface BeforeAfterSliderProps {
  beforeUrl: string
  afterUrl: string
  beforeLabel: string
  afterLabel: string
  settings: CompareToolSettings
  onSettingsChange?: (patch: Partial<CompareToolSettings>) => void
  beforeDisplayUrl?: string | null
  afterDisplayUrl?: string | null
  className?: string
  sliderPosition?: number
  onSliderPositionChange?: (position: number) => void
  resetToken?: number
  removingLayer?: 'before' | 'after' | 'both' | null
}

export default function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeLabel,
  afterLabel,
  settings,
  onSettingsChange,
  beforeDisplayUrl,
  afterDisplayUrl,
  className = '',
  sliderPosition,
  onSliderPositionChange,
  resetToken = 0,
  removingLayer = null,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [internalPosition, setInternalPosition] = useState(50)
  const draggingSliderRef = useRef(false)
  const activePointerIdRef = useRef<number | null>(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const lastTapRef = useRef(0)

  const position = sliderPosition ?? internalPosition
  const forceContain = Boolean(beforeDisplayUrl || afterDisplayUrl || settings.fitContain)
  // Slider stays available whenever we're not in Adjust (pan/zoom) mode — including Overlay
  const canScrubSlider = !settings.adjustMode

  const setPosition = useCallback(
    (next: number) => {
      const clamped = Math.min(100, Math.max(0, next))
      if (onSliderPositionChange) {
        onSliderPositionChange(clamped)
      } else {
        setInternalPosition(clamped)
      }
    },
    [onSliderPositionChange]
  )

  useEffect(() => {
    setPosition(50)
  }, [resetToken, setPosition])

  const updateFromClientX = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect || rect.width <= 0) return
      const next = ((clientX - rect.left) / rect.width) * 100
      setPosition(next)
    },
    [setPosition]
  )

  useEffect(() => {
    if (!canScrubSlider) {
      draggingSliderRef.current = false
      activePointerIdRef.current = null
      return
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!draggingSliderRef.current) return
      if (
        activePointerIdRef.current != null &&
        event.pointerId !== activePointerIdRef.current
      ) {
        return
      }
      event.preventDefault()
      updateFromClientX(event.clientX)
    }

    const stopDragging = (event: PointerEvent) => {
      if (
        activePointerIdRef.current != null &&
        event.pointerId !== activePointerIdRef.current
      ) {
        return
      }
      draggingSliderRef.current = false
      activePointerIdRef.current = null
    }

    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
    }
  }, [canScrubSlider, updateFromClientX])

  const startSliderScrub = (event: React.PointerEvent<HTMLElement>) => {
    if (!canScrubSlider) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    draggingSliderRef.current = true
    activePointerIdRef.current = event.pointerId
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      /* ignore */
    }
    updateFromClientX(event.clientX)
    event.preventDefault()
    event.stopPropagation()
  }

  const { attach } = usePinchPanZoom({
    enabled: settings.adjustMode && Boolean(onSettingsChange),
    getAdjust: () => getLayerAdjust(settingsRef.current, settingsRef.current.activeLayer),
    onAdjust: (patch: Partial<ImageAdjustSettings>) => {
      const current = settingsRef.current
      onSettingsChange?.(patchLayerAdjust(current, current.activeLayer, patch))
    },
  })

  useEffect(() => {
    if (!settings.adjustMode) return
    return attach(containerRef.current)
  }, [attach, settings.adjustMode])

  const handleDoubleReset = (event: React.PointerEvent) => {
    if (!settings.adjustMode || !onSettingsChange) return
    const now = Date.now()
    if (now - lastTapRef.current < 320) {
      const layer = settingsRef.current.activeLayer
      const current = getLayerAdjust(settingsRef.current, layer)
      onSettingsChange(
        patchLayerAdjust(settingsRef.current, layer, {
          scale: 1,
          offsetX: 0,
          offsetY: 0,
          brightness: current.brightness,
          contrast: current.contrast,
        })
      )
      event.preventDefault()
    }
    lastTapRef.current = now
  }

  const displayBeforeUrl = settings.swapped ? afterUrl : beforeUrl
  const displayAfterUrl = settings.swapped ? beforeUrl : afterUrl
  const displayBeforeLabel = settings.swapped ? afterLabel : beforeLabel
  const displayAfterLabel = settings.swapped ? beforeLabel : afterLabel
  const leftIsOriginalBefore = !settings.swapped
  const visualBeforeDisplay = settings.swapped ? afterDisplayUrl : beforeDisplayUrl
  const visualAfterDisplay = settings.swapped ? beforeDisplayUrl : afterDisplayUrl
  const visualBeforeLayer = leftIsOriginalBefore ? 'before' : 'after'
  const visualAfterLayer = leftIsOriginalBefore ? 'after' : 'before'

  const showRemoving =
    removingLayer === 'both' ||
    removingLayer === 'before' ||
    removingLayer === 'after'

  // Wipe always. Overlay softens the before layer so you can still drag the divider.
  const beforeOpacity = settings.overlayMode ? settings.overlayOpacity / 100 : 1

  return (
    <div
      ref={containerRef}
      onPointerDown={(event) => {
        if (settings.adjustMode) {
          handleDoubleReset(event)
          return
        }
        startSliderScrub(event)
      }}
      className={`relative aspect-[3/4] overflow-hidden rounded-2xl border border-zinc-700 select-none touch-none ${
        settings.adjustMode
          ? 'cursor-grab active:cursor-grabbing ring-1 ring-violet-500/40'
          : 'cursor-ew-resize'
      } ${className}`}
      style={compareBackgroundStyle(settings.background)}
      role={canScrubSlider ? 'slider' : undefined}
      aria-label={canScrubSlider ? 'Drag to compare before and after' : undefined}
      aria-valuemin={canScrubSlider ? 0 : undefined}
      aria-valuemax={canScrubSlider ? 100 : undefined}
      aria-valuenow={canScrubSlider ? Math.round(position) : undefined}
    >
      {/* Base layer: after (full frame) */}
      <ComparePhotoImage
        url={displayAfterUrl}
        displayUrl={visualAfterDisplay}
        alt={displayAfterLabel}
        settings={settings}
        layer={visualAfterLayer}
        forceContain={forceContain}
      />

      {/* Before layer: always clipped by slider; opacity softens when Overlay is on */}
      <div
        className="absolute inset-0 z-[1] overflow-hidden"
        style={{
          clipPath: `inset(0 ${100 - position}% 0 0)`,
          WebkitClipPath: `inset(0 ${100 - position}% 0 0)`,
        }}
      >
        <ComparePhotoImage
          url={displayBeforeUrl}
          displayUrl={visualBeforeDisplay}
          alt={displayBeforeLabel}
          settings={settings}
          layer={visualBeforeLayer}
          opacity={beforeOpacity}
          forceContain={forceContain}
        />
      </div>

      {/* Divider + handle (visual only; whole stage is draggable) */}
      {canScrubSlider && (
        <div
          className="pointer-events-none absolute inset-y-0 z-10 flex w-12 -translate-x-1/2 items-center justify-center"
          style={{ left: `${position}%` }}
        >
          <div className="flex h-full w-0.5 items-center justify-center bg-white shadow-[0_0_12px_rgba(0,0,0,0.45)]">
            <span className="absolute flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-violet-500 text-white shadow-lg">
              <GripVertical size={16} />
            </span>
          </div>
        </div>
      )}

      {settings.adjustMode && (
        <span className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-violet-600/90 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg">
          Adjusting {settings.activeLayer} · double-tap to reset position
        </span>
      )}

      {canScrubSlider && (
        <span className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-lg bg-black/55 px-2.5 py-1 text-[11px] font-medium text-zinc-200">
          Drag to reveal · {Math.round(position)}%
          {settings.overlayMode ? ' · overlay' : ''}
        </span>
      )}

      {showRemoving && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-[1px]">
          <div className="rounded-2xl border border-zinc-700 bg-zinc-950/95 px-4 py-3 text-center">
            <p className="text-sm font-medium text-white">Removing background…</p>
            <p className="text-[11px] text-zinc-400 mt-1">
              First run downloads the AI model
            </p>
          </div>
        </div>
      )}

      <span className="pointer-events-none absolute left-3 top-3 z-20 rounded-lg bg-black/60 px-2 py-1 text-xs font-medium text-white">
        {displayBeforeLabel}
        {visualBeforeDisplay ? ' · cut' : ''}
      </span>
      <span className="pointer-events-none absolute right-3 top-3 z-20 rounded-lg bg-black/60 px-2 py-1 text-xs font-medium text-white">
        {displayAfterLabel}
        {visualAfterDisplay ? ' · cut' : ''}
      </span>
    </div>
  )
}
