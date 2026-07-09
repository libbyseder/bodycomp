import { useCallback, useEffect, useRef } from 'react'
import {
  clampScale,
  type ImageAdjustSettings,
} from '../lib/comparePhotoTools'

export interface PinchPanZoomHandlers {
  onAdjust: (patch: Partial<ImageAdjustSettings>) => void
  /** Current adjust values (read on each gesture) */
  getAdjust: () => ImageAdjustSettings
  enabled: boolean
}

interface PointerState {
  id: number
  x: number
  y: number
}

/**
 * Attach multi-touch pinch-zoom + single-finger pan + wheel zoom to an element.
 * Call attach(element) after mount; returns a detach function.
 */
export function usePinchPanZoom({ onAdjust, getAdjust, enabled }: PinchPanZoomHandlers) {
  const pointersRef = useRef<Map<number, PointerState>>(new Map())
  const lastPinchDistRef = useRef<number | null>(null)
  const lastMidpointRef = useRef<{ x: number; y: number } | null>(null)
  const panningRef = useRef(false)
  const lastPanRef = useRef<{ x: number; y: number } | null>(null)
  const enabledRef = useRef(enabled)
  const onAdjustRef = useRef(onAdjust)
  const getAdjustRef = useRef(getAdjust)

  enabledRef.current = enabled
  onAdjustRef.current = onAdjust
  getAdjustRef.current = getAdjust

  const distance = (a: PointerState, b: PointerState) =>
    Math.hypot(a.x - b.x, a.y - b.y)

  const midpoint = (a: PointerState, b: PointerState) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  })

  const attach = useCallback((element: HTMLElement | null) => {
    if (!element) return () => {}

    const onPointerDown = (event: PointerEvent) => {
      if (!enabledRef.current) return
      // Ignore primary button only for mouse when not touch/pen? Allow all for pan in align mode.
      if (event.pointerType === 'mouse' && event.button !== 0) return

      pointersRef.current.set(event.pointerId, {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      })

      try {
        element.setPointerCapture(event.pointerId)
      } catch {
        /* ignore */
      }

      if (pointersRef.current.size === 1) {
        panningRef.current = true
        lastPanRef.current = { x: event.clientX, y: event.clientY }
      } else if (pointersRef.current.size === 2) {
        panningRef.current = false
        const pts = [...pointersRef.current.values()]
        lastPinchDistRef.current = distance(pts[0], pts[1])
        lastMidpointRef.current = midpoint(pts[0], pts[1])
      }

      // Prevent page scroll while aligning
      event.preventDefault()
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!enabledRef.current) return
      if (!pointersRef.current.has(event.pointerId)) return

      pointersRef.current.set(event.pointerId, {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
      })

      const pts = [...pointersRef.current.values()]

      if (pts.length >= 2) {
        const dist = distance(pts[0], pts[1])
        const mid = midpoint(pts[0], pts[1])
        const prevDist = lastPinchDistRef.current
        const prevMid = lastMidpointRef.current

        if (prevDist != null && prevDist > 0 && prevMid) {
          const current = getAdjustRef.current()
          const scaleFactor = dist / prevDist
          const nextScale = clampScale(current.scale * scaleFactor)
          const dx = mid.x - prevMid.x
          const dy = mid.y - prevMid.y
          onAdjustRef.current({
            scale: nextScale,
            offsetX: current.offsetX + dx,
            offsetY: current.offsetY + dy,
          })
        }

        lastPinchDistRef.current = dist
        lastMidpointRef.current = mid
        event.preventDefault()
        return
      }

      if (pts.length === 1 && panningRef.current && lastPanRef.current) {
        const current = getAdjustRef.current()
        const dx = event.clientX - lastPanRef.current.x
        const dy = event.clientY - lastPanRef.current.y
        lastPanRef.current = { x: event.clientX, y: event.clientY }
        onAdjustRef.current({
          offsetX: current.offsetX + dx,
          offsetY: current.offsetY + dy,
        })
        event.preventDefault()
      }
    }

    const endPointer = (event: PointerEvent) => {
      pointersRef.current.delete(event.pointerId)
      if (pointersRef.current.size < 2) {
        lastPinchDistRef.current = null
        lastMidpointRef.current = null
      }
      if (pointersRef.current.size === 0) {
        panningRef.current = false
        lastPanRef.current = null
      } else if (pointersRef.current.size === 1) {
        const remaining = [...pointersRef.current.values()][0]
        panningRef.current = true
        lastPanRef.current = { x: remaining.x, y: remaining.y }
      }
    }

    const onWheel = (event: WheelEvent) => {
      if (!enabledRef.current) return
      event.preventDefault()
      const current = getAdjustRef.current()
      const delta = event.deltaY > 0 ? 0.92 : 1.08
      onAdjustRef.current({ scale: clampScale(current.scale * delta) })
    }

    element.addEventListener('pointerdown', onPointerDown)
    element.addEventListener('pointermove', onPointerMove)
    element.addEventListener('pointerup', endPointer)
    element.addEventListener('pointercancel', endPointer)
    element.addEventListener('pointerleave', endPointer)
    element.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerup', endPointer)
      element.removeEventListener('pointercancel', endPointer)
      element.removeEventListener('pointerleave', endPointer)
      element.removeEventListener('wheel', onWheel)
      pointersRef.current.clear()
    }
  }, [])

  return { attach }
}

/** Convenience: bind pinch/pan to a ref whenever enabled or element changes */
export function usePinchPanZoomOnElement(
  elementRef: React.RefObject<HTMLElement | null>,
  handlers: PinchPanZoomHandlers
) {
  const { attach } = usePinchPanZoom(handlers)

  useEffect(() => {
    return attach(elementRef.current)
  }, [attach, elementRef, handlers.enabled])
}
