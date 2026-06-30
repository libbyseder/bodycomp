import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { X, Info } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onSave?: () => void | Promise<void>
}

export default function ProfileModal({ isOpen, onClose, onSave }: ProfileModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    height_inches: 63.5,
    gender: null as "male" | "female" | null,
    target_weight: 124,
    target_body_fat: 23,
    target_ffmi: 18,
  })
  const [showFfmiTooltip, setShowFfmiTooltip] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const loadProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (data) {
          setFormData({
            name: data.name || '',
            height_inches: data.height_inches || 63.5,
            gender: data.gender || null,
            target_weight: data.target_weight || 124,
            target_body_fat: data.target_body_fat || 23,
            target_ffmi: data.target_ffmi || 18,
          })
        }
      }
      loadProfile()
    }
  }, [isOpen])

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
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl w-full max-w-md p-5 sm:p-8 relative my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <button onClick={onClose} className="absolute top-5 right-5 sm:top-6 sm:right-6 text-zinc-400 hover:text-white">
          <X size={20} />
        </button>

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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 sm:mb-8">
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
          <div className="relative">
            <label className="block text-sm text-zinc-400 mb-2 flex items-center gap-x-1">
              Target FFMI
              <button
                type="button"
                onMouseEnter={() => setShowFfmiTooltip(true)}
                onMouseLeave={() => setShowFfmiTooltip(false)}
                onClick={() => setShowFfmiTooltip((v) => !v)}
                className="text-emerald-400 hover:text-emerald-300"
                aria-label="FFMI category info"
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

            {showFfmiTooltip && (
              <div className="absolute top-full mt-2 left-0 right-0 sm:right-auto z-50 sm:w-72 bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-sm shadow-xl">
                <div className="font-medium mb-3 text-white">FFMI Categories</div>
                <div className="space-y-1.5 text-xs">
                  {ffmiCategories.map((cat, index) => (
                    <div key={index} className="flex justify-between">
                      <span className={cat.color}>{cat.range}</span>
                      <span className="text-zinc-400">{cat.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-700 text-[10px] text-zinc-500">
                  {formData.gender
                    ? `Showing categories for ${formData.gender}s`
                    : 'Select gender to see specific ranges'}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
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
    </div>
  )
}
