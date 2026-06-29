import { useState } from 'react'
import { useProfile } from '../hooks/useProfile'
import { X, Info } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { profile, updateProfile } = useProfile()
  
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    height_inches: profile?.height_inches || 63.5,
    gender: (profile?.gender as "male" | "female" | null) || null,
    target_weight: profile?.target_weight || 124,
    target_bf: profile?.target_bf || 21,
    target_ffmi: profile?.target_ffmi || 17.5,
  })

  const [showFfmiTooltip, setShowFfmiTooltip] = useState(false)

  if (!isOpen) return null

  const handleSave = async () => {
    const { error } = await updateProfile({
      name: formData.name,
      height_inches: formData.height_inches,
      gender: formData.gender || null,
      target_weight: formData.target_weight,
      target_bf: formData.target_bf,
      target_ffmi: formData.target_ffmi,
    })

    if (error) {
      toast.error('Failed to save profile')
    } else {
      toast.success('Profile updated')
      onClose()
    }
  }

  // Dynamic FFMI categories based on gender
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

    // No gender selected - show both
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-md p-8 relative">
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-400 hover:text-white">
          <X size={20} />
        </button>

        <h2 className="text-3xl font-semibold mb-8">Profile &amp; Goals</h2>

        {/* Name */}
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

        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* Height */}
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

          {/* Gender */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Gender</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select...</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
        </div>

        {/* Goals Section */}
        <div className="mb-2">
          <h3 className="text-lg font-medium mb-4">Goals</h3>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* Target Weight */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Target Weight (lbs)</label>
            <input
              type="number"
              value={formData.target_weight}
              onChange={(e) => setFormData({ ...formData, target_weight: parseFloat(e.target.value) || 124 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Target Body Fat */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Target Body Fat %</label>
            <input
              type="number"
              step="0.1"
              value={formData.target_bf}
              onChange={(e) => setFormData({ ...formData, target_bf: parseFloat(e.target.value) || 21 })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Target FFMI with Tooltip */}
          <div className="relative">
            <label className="block text-sm text-zinc-400 mb-2 flex items-center gap-x-1">
              Target FFMI
              <button
                type="button"
                onMouseEnter={() => setShowFfmiTooltip(true)}
                onMouseLeave={() => setShowFfmiTooltip(false)}
                className="text-emerald-400 hover:text-emerald-300"
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

            {/* Dynamic FFMI Tooltip */}
            {showFfmiTooltip && (
              <div className="absolute top-full mt-2 left-0 z-50 w-72 bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-sm shadow-xl">
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
                    ? `Showing categories for ${formData.gender.toLowerCase()}s` 
                    : 'Select gender to see specific ranges'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
