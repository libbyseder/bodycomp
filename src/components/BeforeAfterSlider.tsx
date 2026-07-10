import { useCallback, useEffect, useRef, useState } from 'react'
import { GripVertical } from 'lucide-react'
import type { CompareToolSettings, ImageAdjustSettings } from '../lib/comparePhotoTools'
import {
  compareBackgroundStyle,
  getLayerAdjust,
  patchLayerAdjust,
  DEFAULT_IMAGE_ADJUST,
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
  const draggingRef = useRef(false)
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const lastTapRef = useRef(0)

  const position = sliderPosition ?? internalPosition
  const forceContain = Boolean(beforeDisplayUrl || afterDisplayUrl || settings.fitContain)

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
    const stopDragging = () => {
      draggingRef.current = false
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) return
      updateFromClientX(event.clientX)
    }

    window.addEventListener('pointerup', stopDragging)
    window.addEventListener('pointercancel', stopDragging)
    window.addEventListener('pointermove', onPointerMove)

    return () => {
      window.removeEventListener('pointerup', stopDragging)
      window.removeEventListener('pointercancel', stopDragging)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [updateFromClientX])

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (settings.overlayMode || settings.adjustMode) return
    draggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    updateFromClientX(event.clientX)
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
    return attach(containerRef.current)
  }, [attach, settings.adjustMode])

  // Double-tap / double-click resets the active layer (GainFrame-style)
  const handleDoubleReset = () => {
    if (!settings.adjustMode || !onSettingsChange) return
    const now = Date.now()
    if (now - lastTapRef.current < 320) {
      onSettingsChange(
        patchLayerAdjust(settingsRef.current, settingsRef.current.activeLayer, {
          ...DEFAULT_IMAGE_ADJUST,
          brightness: getLayerAdjust(settingsRef.current, settingsRef.current.activeLayer)
            .brightness,
          contrast: getLayerAdjust(settingsRef.current, settingsRef.current.activeLayer)
            .contrast,
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        })
      )
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

  return (
    <div
      ref={containerRef}
      onPointerDown={handleDoubleReset}
      className={`relative aspect-[3/4] overflow-hidden rounded-2xl border border-zinc-700 select-none touch-none ${
        settings.adjustMode ? 'cursor-grab active:cursor-grabbing ring-1 ring-violet-500/40' : ''
      } ${className}`}
      style={compareBackgroundStyle(settings.background)}
    >
      <ComparePhotoImage
        url={displayAfterUrl}
        displayUrl={visualAfterDisplay}
        alt={displayAfterLabel}
        settings={settings}
        layer={visualAfterLayer}
        forceContain={forceContain}
      />

      {settings.overlayMode ? (
        <ComparePhotoImage
          url={displayBeforeUrl}
          displayUrl={visualBeforeDisplay}
          alt={displayBeforeLabel}
          settings={settings}
          layer={visualBeforeLayer}
          opacity={settings.overlayOpacity / 100}
          forceContain={forceContain}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <ComparePhotoImage
            url={displayBeforeUrl}
            displayUrl={visualBeforeDisplay}
            alt={displayBeforeLabel}
            settings={settings}
            layer={visualBeforeLayer}
            opacity={settings.overlayOpacity / 100}
            forceContain={forceContain}
          />
        </div>
      )}

      {!settings.overlayMode && !settings.adjustMode && (
        <div
          className="absolute inset-y-0 z-10 flex w-10 -translate-x-1/2 cursor-ew-resize items-center justify-center"
          style={{ left: `${position}%` }}
          onPointerDown={startDrag}
          role="slider"
          aria-label="Drag to compare before and after"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
        >
          <div className="flex h-full w-1 items-center justify-center bg-white/90 shadow-[0_0_12px_rgba(0,0,0,0.45)]">
            <span className="absolute flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-violet-500 text-white shadow-lg">
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

      <span className="absolute left-3 top-3 z-20 rounded-lg bg-black/60 px-2 py-1 text-xs font-medium text-white">
        {displayBeforeLabel}
        {visualBeforeDisplay ? ' · cut' : ''}
      </span>
      <span className="absolute right-3 top-3 z-20 rounded-lg bg-black/60 px-2 py-1 text-xs font-medium text-white">
        {displayAfterLabel}
        {visualAfterDisplay ? ' · cut' : ''}
      </span>
    </div>
  )
}
