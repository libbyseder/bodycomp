import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { upsertDailyMeasurement } from '../lib/upsertDailyMeasurement'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import ProgressPhotoUpload from './ProgressPhotoUpload'

interface QuickLogModalProps {
  isOpen: boolean
  onClose: () => void
  refetch?: () => void | Promise<void>
  refetchPhotos?: () => void | Promise<void>
}

export default function QuickLogModal({
  isOpen,
  onClose,
  refetch,
  refetchPhotos,
}: QuickLogModalProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setDate(new Date().toISOString().split('T')[0])
      setWeight('')
      setBodyFat('')
      setIsSubmitting(false)
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please log in first')
        return
      }

      const parsedWeight = parseFloat(weight)
      const parsedBodyFat = bodyFat ? parseFloat(bodyFat) : null

      const { error, merged } = await upsertDailyMeasurement(supabase, user.id, date, {
        weight: parsedWeight,
        body_fat: parsedBodyFat,
      })

      if (error) {
        toast.error(`Failed to save: ${error.message}`)
        console.error(error)
        return
      }

      const logLabel = merged && merged.log_count > 1
        ? ` (${merged.log_count} logs today, averaged)`
        : ''
      toast.success(`Measurement saved!${logLabel}`)

      onClose()

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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 sm:p-6 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl sm:rounded-3xl w-full max-w-md p-5 sm:p-8 relative my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-400 hover:text-white"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl sm:text-3xl font-semibold mb-6 sm:mb-8">Quick Log</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

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

          <div className="pt-2 border-t border-zinc-800">
            <p className="text-sm font-medium text-zinc-300 mb-3">Progress photo (optional)</p>
            <ProgressPhotoUpload
              date={date}
              compact
              onUploaded={refetchPhotos}
            />
          </div>

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
              className="flex-1 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Measurement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}