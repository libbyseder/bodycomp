import { useState, type ReactNode } from 'react'
import { Camera, ImagePlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { ProgressPhotoPose } from '../types'
import { analyzeProgressPhoto } from '../lib/analyzeProgressPhoto'
import { isNativePhotoPicker, pickProgressPhotoFile } from '../lib/pickProgressPhoto'
import {
  PHOTO_POSE_LABELS,
  uploadProgressPhoto,
  validatePhotoFile,
} from '../lib/progressPhotos'

interface ProgressPhotoUploadProps {
  date: string
  onUploaded?: () => void | Promise<void>
  compact?: boolean
  analyzeAfterUpload?: boolean
}

const useNativePicker = isNativePhotoPicker()

const pickerButtonClass =
  'relative flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-sm transition-colors touch-manipulation cursor-pointer'

function PhotoPickerLabel({
  children,
  capture,
  onFile,
  disabled,
}: {
  children: ReactNode
  capture?: boolean
  onFile: (file: File | null) => void
  disabled?: boolean
}) {
  return (
    <label
      className={`${pickerButtonClass}${disabled ? ' opacity-50 pointer-events-none' : ''}`}
    >
      <input
        type="file"
        accept="image/*"
        {...(capture ? { capture: 'environment' as const } : {})}
        disabled={disabled}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null
          onFile(file)
          window.setTimeout(() => {
            e.target.value = ''
          }, 0)
        }}
      />
      <span className="relative z-0 flex items-center justify-center gap-2 pointer-events-none">
        {children}
      </span>
    </label>
  )
}

export default function ProgressPhotoUpload({
  date,
  onUploaded,
  compact = false,
  analyzeAfterUpload = false,
}: ProgressPhotoUploadProps) {
  const { user } = useAuth()
  const [pose, setPose] = useState<ProgressPhotoPose>('front')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [picking, setPicking] = useState(false)
  const [runAnalysis, setRunAnalysis] = useState(analyzeAfterUpload)

  const clearSelection = () => {
    setSelectedFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(null)
  }

  const applyFile = (file: File | null) => {
    if (!file) return

    const validationError = validatePhotoFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const pickNative = async (source: 'gallery' | 'camera') => {
    setPicking(true)
    try {
      const file = await pickProgressPhotoFile(source)
      if (file) {
        applyFile(file)
      }
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : 'Could not open photo picker'
      )
    } finally {
      setPicking(false)
    }
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

    if (error || !data) {
      setUploading(false)
      toast.error(error || 'Failed to upload photo')
      return
    }

    if (runAnalysis) {
      toast.loading('Running AI analysis…', { id: 'photo-analysis' })
      const analysisResult = await analyzeProgressPhoto(data.id)
      toast.dismiss('photo-analysis')

      if (!analysisResult.ok) {
        toast.error(analysisResult.error || 'Photo saved, but analysis failed')
      } else {
        toast.success('Photo saved and analyzed')
      }
    } else {
      toast.success('Progress photo saved')
    }

    setUploading(false)
    clearSelection()
    await onUploaded?.()
  }

  const busy = uploading || picking

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(PHOTO_POSE_LABELS) as ProgressPhotoPose[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setPose(value)}
            disabled={busy}
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

      {previewUrl ? (
        <div className="space-y-3">
          <div className="aspect-[3/4] max-h-72 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950">
            <img
              src={previewUrl}
              alt="Selected progress photo preview"
              className="h-full w-full object-cover"
            />
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={runAnalysis}
              onChange={(e) => setRunAnalysis(e.target.checked)}
              className="mt-1 rounded border-zinc-600 bg-zinc-800 text-violet-500 focus:ring-violet-500"
            />
            <span className="text-sm text-zinc-300 leading-snug">
              Run AI body composition analysis after upload
              <span className="block text-xs text-zinc-500 mt-1">
                Visual estimate only — does not change your scale readings.
              </span>
            </span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearSelection}
              disabled={busy}
              className="flex-1 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-sm transition-colors disabled:opacity-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => void handleUpload()}
              disabled={busy}
              className="flex-1 py-2.5 rounded-2xl bg-violet-500 hover:bg-violet-600 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {uploading
                ? runAnalysis
                  ? 'Uploading & analyzing…'
                  : 'Uploading…'
                : 'Upload photo'}
            </button>
          </div>
        </div>
      ) : (
        <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {useNativePicker ? (
            <>
              <button
                type="button"
                onClick={() => void pickNative('gallery')}
                disabled={busy}
                className={`${pickerButtonClass} disabled:opacity-50`}
              >
                <ImagePlus size={16} />
                {picking ? 'Opening…' : 'Choose photo'}
              </button>
              <button
                type="button"
                onClick={() => void pickNative('camera')}
                disabled={busy}
                className={`${pickerButtonClass} disabled:opacity-50`}
              >
                <Camera size={16} />
                {picking ? 'Opening…' : 'Take photo'}
              </button>
            </>
          ) : (
            <>
              <PhotoPickerLabel onFile={applyFile} disabled={busy}>
                <ImagePlus size={16} />
                Choose photo
              </PhotoPickerLabel>
              <PhotoPickerLabel capture onFile={applyFile} disabled={busy}>
                <Camera size={16} />
                Take photo
              </PhotoPickerLabel>
            </>
          )}
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Optional. JPEG, PNG, or WebP up to 10 MB. Linked to {date || 'the selected date'}.
        {useNativePicker && ' Using native photo picker on this device.'}
      </p>
    </div>
  )
}