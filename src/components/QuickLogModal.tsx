import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

interface QuickLogModalProps {
  isOpen: boolean
  onClose: () => void
  addMeasurement: (
    date: string,
    weight: number,
    body_fat: number | null
  ) => Promise<{ error: unknown }>
  refetch?: () => void | Promise<void>
}

export default function QuickLogModal({ isOpen, onClose, addMeasurement, refetch }: QuickLogModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0])
      setWeight('')
      setBodyFat('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!weight) {
      toast.error('Weight is required')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await addMeasurement(
        date,
        parseFloat(weight),
        bodyFat ? parseFloat(bodyFat) : null
      )

      if (error) {
        toast.error('Failed to save measurement')
        console.error(error)
        return
      }

      toast.success('Measurement saved!')
      setWeight('')
      setBodyFat('')

      // Close immediately — don't wait for refetch
      onClose()

      // Refresh the dashboard in the background
      if (refetch) {
        const result = refetch()
        if (result && typeof result.then === 'function') {
          result.catch((err) => console.error('refetch error:', err))
        }
      }
    } catch (err) {
      toast.error('Failed to save measurement')
      console.error(err)
    } finally {
      setIsSubmitting(false)
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