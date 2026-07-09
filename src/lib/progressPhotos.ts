import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProgressPhoto, ProgressPhotoPose } from '../types'

export const PROGRESS_PHOTOS_BUCKET = 'progress-photos'
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024

function inferMimeFromName(filename: string): string | null {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.heic')) return 'image/heic'
  if (lower.endsWith('.heif')) return 'image/heif'
  return null
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
])

export const PHOTO_POSE_LABELS: Record<ProgressPhotoPose, string> = {
  front: 'Front',
  side: 'Side',
  back: 'Back',
  other: 'Other',
}

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/heic':
      return 'heic'
    case 'image/heif':
      return 'heif'
    default:
      return 'jpg'
  }
}

export function resolvePhotoMime(file: File): string {
  return file.type || inferMimeFromName(file.name) || 'image/jpeg'
}

export function validatePhotoFile(file: File): string | null {
  const mime = resolvePhotoMime(file)
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    return 'Please choose a JPEG, PNG, or WebP image'
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return 'Image must be 10 MB or smaller'
  }
  return null
}

export function buildPhotoStoragePath(
  userId: string,
  date: string,
  photoId: string,
  mimeType: string
): string {
  return `${userId}/${date}/${photoId}.${extensionForMime(mimeType)}`
}

export async function uploadProgressPhoto(
  supabase: SupabaseClient,
  userId: string,
  date: string,
  pose: ProgressPhotoPose,
  file: File
): Promise<{ data: ProgressPhoto | null; error: string | null }> {
  const validationError = validatePhotoFile(file)
  if (validationError) {
    return { data: null, error: validationError }
  }

  const mimeType = resolvePhotoMime(file)
  const photoId = crypto.randomUUID()
  const storagePath = buildPhotoStoragePath(userId, date, photoId, mimeType)

  const { error: uploadError } = await supabase.storage
    .from(PROGRESS_PHOTOS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: mimeType,
    })

  if (uploadError) {
    return { data: null, error: uploadError.message }
  }

  const { data, error } = await supabase
    .from('progress_photos')
    .insert({
      id: photoId,
      user_id: userId,
      date,
      pose,
      storage_path: storagePath,
      mime_type: mimeType,
      file_size_bytes: file.size,
    })
    .select('*')
    .single()

  if (error) {
    await supabase.storage.from(PROGRESS_PHOTOS_BUCKET).remove([storagePath])
    return { data: null, error: error.message }
  }

  return { data: data as ProgressPhoto, error: null }
}

export async function deleteProgressPhoto(
  supabase: SupabaseClient,
  photo: Pick<ProgressPhoto, 'id' | 'storage_path'>
): Promise<{ error: string | null }> {
  const { error: storageError } = await supabase.storage
    .from(PROGRESS_PHOTOS_BUCKET)
    .remove([photo.storage_path])

  if (storageError) {
    return { error: storageError.message }
  }

  const { error } = await supabase.from('progress_photos').delete().eq('id', photo.id)
  return { error: error?.message ?? null }
}

export async function createSignedPhotoUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresInSeconds = 3600
): Promise<{ url: string | null; error: string | null }> {
  const { data, error } = await supabase.storage
    .from(PROGRESS_PHOTOS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds)

  if (error) {
    return { url: null, error: error.message }
  }

  return { url: data.signedUrl, error: null }
}

export function formatPhotoDate(date: string): string {
  const parsed = new Date(`${date}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}