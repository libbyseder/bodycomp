import { useRef, useState } from 'react'
import { Camera, ImagePlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { ProgressPhotoPose } from '../types'
import {
  PHOTO_POSE_LABELS,
  uploadProgressPhoto,
  validatePhotoFile,
} from '../lib/progressPhotos'

interface ProgressPhotoUploadProps {
  date: string
  onUploaded?: () => void | Promise<void>
  compact?: boolean
}

export default function ProgressPhotoUpload({
  date,
  onUploaded,
  compact = false,
}: ProgressPhotoUploadProps) {
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pose, setPose] = useState<ProgressPhotoPose>('front')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const clearSelection = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  const handleFileChange = (file: File | null) => {
    clearSelection()
    if (!file) return

    const validationError = validatePhotoFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleUpload = async () => {
    if (!user) {
      toast.error('Please log in first')
      return
    }
    if (!selectedFile) {
      toast.error('Choose a photo first')
      return
    }
    if (!date) {
      toast.error('Choose a date first')
      return
    }

    setUploading(true)
    const { data, error } = await uploadProgressPhoto(
      supabase,
      user.id,
      date,
      pose,
      selectedFile
    )
    setUploading(false)

    if (error || !data) {
      toast.error(error || 'Failed to upload photo')
      return
    }

    toast.success('Progress photo saved')
    clearSelection()
    await onUploaded?.()
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PHOTO_POSE_LABELS) as ProgressPhotoPose[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setPose(value)}
            className={`px-3 py-1.5 rounded-xl text-sm transition-colors ${
              pose === value
                ? 'bg-violet-500 text-white'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {PHOTO_POSE_LABELS[value]}
          </button>
        ))}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
      />

      {previewUrl ? (
        <div className="space-y-3">
          <div className="aspect-[3/4] max-h-72 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950">
            <img
              src={previewUrl}
              alt="Selected progress photo preview"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearSelection}
              disabled={uploading}
              className="flex-1 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-sm transition-colors disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={uploading}
              className="flex-1 py-2.5 rounded-2xl bg-violet-500 hover:bg-violet-600 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {uploading ? 'Uploading…' : 'Upload photo'}
            </button>
          </div>
        </div>
      ) : (
        <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm transition-colors"
          >
            <ImagePlus size={16} />
            Choose photo
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm transition-colors"
          >
            <Camera size={16} />
            Take photo
          </button>
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Optional. JPEG, PNG, or WebP up to 10 MB. Linked to {date || 'the selected date'}.
      </p>
    </div>
  )
}