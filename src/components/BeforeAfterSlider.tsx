import { useCallback, useEffect, useRef, useState } from 'react'
import { GripVertical } from 'lucide-react'

interface BeforeAfterSliderProps {
  beforeUrl: string
  afterUrl: string
  beforeLabel: string
  afterLabel: string
  className?: string
}

export default function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeLabel,
  afterLabel,
  className = '',
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(50)
  const draggingRef = useRef(false)

  const updateFromClientX = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0) return
    const next = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.min(100, Math.max(0, next)))
  }, [])

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
    draggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    updateFromClientX(event.clientX)
  }

  return (
    <div
      ref={containerRef}
      className={`relative aspect-[3/4] overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950 select-none touch-none ${className}`}
    >
      <img
        src={afterUrl}
        alt={afterLabel}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        decoding="async"
      />

      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={beforeUrl}
          alt={beforeLabel}
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
          decoding="async"
        />
      </div>

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

      <span className="absolute left-3 top-3 z-20 rounded-lg bg-black/60 px-2 py-1 text-xs font-medium text-white">
        {beforeLabel}
      </span>
      <span className="absolute right-3 top-3 z-20 rounded-lg bg-black/60 px-2 py-1 text-xs font-medium text-white">
        {afterLabel}
      </span>
    </div>
  )
}