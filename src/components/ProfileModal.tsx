import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { X, Info } from 'lucide-react'
import toast from 'react-hot-toast'

const DEFAULT_FORM_DATA = {
  name: '',
  height_inches: 63.5,
  gender: null as 'male' | 'female' | null,
  target_weight: 124,
  target_body_fat: 23,
  target_ffmi: 18,
}

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: () => void | Promise<void>
}

export default function ProfileModal({ isOpen, onClose, onSave }: ProfileModalProps) {
  const { user } = useAuth()
  const [formData, setFormData] = useState(DEFAULT_FORM_DATA)
  const [showFfmiTooltip, setShowFfmiTooltip] = useState(false)
  const [tooltipStyle, setTooltipStyle] = useState<{ top: number; left: number; width: number } | null>(null)
  const [isCoarsePointer, setIsCoarsePointer] = useState(false)
  const [loading, setLoading] = useState(false)
  const ffmiInfoRef = useRef<HTMLButtonElement>(null)
  const ffmiTooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsCoarsePointer(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  const updateTooltipPosition = useCallback(() => {
    const button = ffmiInfoRef.current
    if (!button) return

    const rect = button.getBoundingClientRect()
    const width = Math.min(288, window.innerWidth - 24)
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))
    const tooltipHeight = ffmiTooltipRef.current?.offsetHeight ?? 260
    const spaceAbove = rect.top
    const spaceBelow = window.innerHeight - rect.bottom
    const showAbove = spaceAbove >= tooltipHeight + 8 || spaceAbove >= spaceBelow
    const top = showAbove
      ? Math.max(12, rect.top - tooltipHeight - 8)
      : Math.min(window.innerHeight - tooltipHeight - 12, rect.bottom + 8)

    setTooltipStyle({ top, left, width })
  }, [])

  useEffect(() => {
    if (!showFfmiTooltip) {
      setTooltipStyle(null)
      return
    }

    updateTooltipPosition()
    const raf = window.requestAnimationFrame(updateTooltipPosition)
    window.addEventListener('resize', updateTooltipPosition)
    window.addEventListener('scroll', updateTooltipPosition, true)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', updateTooltipPosition)
      window.removeEventListener('scroll', updateTooltipPosition, true)
    }
  }, [showFfmiTooltip, updateTooltipPosition, formData.gender])

  useEffect(() => {
    if (!isOpen || !user) {
      setFormData(DEFAULT_FORM_DATA)
      return
    }

    const userId = user.id
    setFormData(DEFAULT_FORM_DATA)

    let cancelled = false

    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (cancelled) return

      if (data) {
        setFormData({
          name: data.name || '',
          height_inches: data.height_inches || 63.5,
          gender: data.gender || null,
          target_weight: data.target_weight || 124,
          target_body_fat: data.target_body_fat || 23,
          target_ffmi: data.target_ffmi || 18,
        })
      } else if (error?.code !== 'PGRST116') {
        console.error('Error loading profile:', error)
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [isOpen, user?.id])

  if (!isOpen) return null

  const handleSave = async () => {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('No user found')
      setLoading(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name: formData.name,
        height_inches: formData.height_inches,
        gender: formData.gender,
        target_weight: formData.target_weight,
        target_body_fat: formData.target_body_fat,
        target_ffmi: formData.target_ffmi,
      })

    setLoading(false)

    if (error) {
      toast.error('Failed to save profile')
      return
    }

    toast.success('Profile updated')

    // Close immediately
    onClose()

    // Refresh profile in background
    if (onSave) {
      const result = onSave()
      if (result && typeof result.then === 'function') {
        result.catch((e: any) => console.error('refetchProfile error:', e))
      }
    }
  }

  const getFfmiCategories = () => {
    const gender = formData.gender?.toLowerCase()
    if (gender === 'male') {
      return [
        { range: '< 16', label: 'Below Average', color: 'text-red-400' },
        { range: '16 – 18', label: 'Average', color: 'text-yellow-400' },
        { range: '18 – 20', label: 'Above Average', color: 'text-emerald-400' },
        { range: '20 – 22', label: 'Excellent', color: 'text-emerald-400' },
        { range: '> 22', label: 'Superior / Elite', color: 'text-emerald-400' },
      ]
    }
    if (gender === 'female') {
      return [
        { range: '< 14', label: 'Below Average', color: 'text-red-400' },
        { range: '14 – 16', label: 'Average', color: 'text-yellow-400' },
        { range: '16 – 18', label: 'Above Average', color: 'text-emerald-400' },
        { range: '18 – 20', label: 'Excellent', color: 'text-emerald-400' },
        { range: '> 20', label: 'Superior / Elite', color: 'text-emerald-400' },
      ]
    }
    return [
      { range: 'Men: < 16 | Women: < 14', label: 'Below Average', color: 'text-red-400' },
      { range: 'Men: 16-18 | Women: 14-16', label: 'Average', color: 'text-yellow-400' },
      { range: 'Men: 18-20 | Women: 16-18', label: 'Above Average', color: 'text-emerald-400' },
      { range: 'Men: 20-22 | Women: 18-20', label: 'Excellent', color: 'text-emerald-400' },
      { range: 'Men: > 22 | Women: > 20', label: 'Superior / Elite', color: 'text-emerald-400' },
    ]
  }

  const ffmiCategories = getFfmiCategories()

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl w-full max-w-md relative my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-hidden">
        <button onClick={onClose} className="absolute top-5 right-5 sm:top-6 sm:right-6 text-zinc-400 hover:text-white z-10">
          <X size={20} />
        </button>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-8 pb-4 sm:pb-6">
        <h2 className="text-2xl sm:text-3xl font-semibold mb-6 sm:mb-8 pr-8">Profile &amp; Goals</h2>

        <div className="mb-6">
          <label className="block text-sm text-zinc-400 mb-2">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            placeholder="Your name"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 sm:mb-8">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Height (inches)</label>
            <input
              type="number"
              step="0.5"
              value={formData.height_inches}
              onChange={(e) => setFormData({ ...formData, height_inches: parseFloat(e.target.value) || 63.5 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Gender</label>
            <select
              value={formData.gender || ''}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as "male" | "female" | null })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
        </div>

        <div className="mb-2">
          <h3 className="text-lg font-medium mb-4">Goals</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 sm:mb-8 overflow-visible">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Target Weight (lbs)</label>
            <input
              type="number"
              value={formData.target_weight}
              onChange={(e) => setFormData({ ...formData, target_weight: parseFloat(e.target.value) || 124 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Target Body Fat %</label>
            <input
              type="number"
              step="0.1"
              value={formData.target_body_fat}
              onChange={(e) => setFormData({ ...formData, target_body_fat: parseFloat(e.target.value) || 23 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2 flex items-center gap-x-1">
              Target FFMI
              <button
                ref={ffmiInfoRef}
                type="button"
                onMouseEnter={() => { if (!isCoarsePointer) setShowFfmiTooltip(true) }}
                onMouseLeave={() => { if (!isCoarsePointer) setShowFfmiTooltip(false) }}
                onClick={() => setShowFfmiTooltip((v) => !v)}
                className="text-emerald-400 hover:text-emerald-300"
                aria-label="FFMI category info"
                aria-expanded={showFfmiTooltip}
              >
                <Info size={14} />
              </button>
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.target_ffmi}
              onChange={(e) => setFormData({ ...formData, target_ffmi: parseFloat(e.target.value) || 17.5 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        </div>

        <div className="flex gap-3 p-5 sm:px-8 sm:pb-8 pt-0 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {showFfmiTooltip && tooltipStyle && createPortal(
        <div
          ref={ffmiTooltipRef}
          className="fixed z-[100] bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-sm shadow-xl pointer-events-none"
          style={{ top: tooltipStyle.top, left: tooltipStyle.left, width: tooltipStyle.width }}
          role="tooltip"
        >
          <div className="font-medium mb-3 text-white">FFMI Categories</div>
          <div className="space-y-2 text-xs">
            {ffmiCategories.map((cat, index) => (
              <div
                key={index}
                className={formData.gender ? 'flex justify-between gap-3' : 'space-y-0.5'}
              >
                <span className={`${cat.color} leading-snug ${formData.gender ? '' : 'block'}`}>
                  {cat.range}
                </span>
                <span className={`text-zinc-400 ${formData.gender ? 'shrink-0 text-right' : 'block'}`}>
                  {cat.label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-700 text-[10px] text-zinc-500 leading-relaxed">
            {formData.gender
              ? `Showing categories for ${formData.gender}s`
              : 'Select gender to see specific ranges'}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
