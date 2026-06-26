import { useState } from 'react'
import { useMeasurements } from '../hooks/useMeasurements'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

interface QuickLogModalProps {
  isOpen: boolean
  onClose: () => void
  refetch?: () => Promise<void>
}

export default function QuickLogModal({ isOpen, onClose, refetch }: QuickLogModalProps) {
  const { addMeasurement } = useMeasurements()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!weight) {
      toast.error('Weight is required')
      return
    }

    setIsSubmitting(true)

    const { error } = await addMeasurement(
      date,
      parseFloat(weight),
      bodyFat ? parseFloat(bodyFat) : null
    )

    setIsSubmitting(false)

    if (error) {
      toast.error('Failed to save measurement')
      console.error(error)
    } else {
      toast.success('Measurement saved!')
      
      // Auto-refresh the main table
      if (refetch) {
        await refetch()
      }
      
      // Reset form
      setWeight('')
      setBodyFat('')
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-md p-8 relative">
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 text-zinc-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-3xl font-semibold mb-8">Quick Log</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Weight */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Weight (lbs)</label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 125.4"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Body Fat */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Body Fat % (optional)</label>
            <input
              type="number"
              step="0.1"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
              placeholder="e.g. 22.5"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Measurement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}