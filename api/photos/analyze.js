import { getSupabaseAdmin } from '../../server/withingsTokens.js'
import {
  analyzePhotoWithAiGateway,
  buildPhotoAnalysisPrompt,
  isVisionSupportedMime,
} from '../../server/photoAnalysis.js'
const PROGRESS_PHOTOS_BUCKET = 'progress-photos'

const supabase = getSupabaseAdmin()

function parseBody(req) {
  try {
    if (!req.body) return {}
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return {}
  }
}

function bufferToBase64(buffer) {
  return Buffer.from(buffer).toString('base64')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' })

  const token = authHeader.split(' ')[1]
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return res.status(401).json({ error: 'Invalid user' })

  const { photoId } = parseBody(req)
  if (!photoId || typeof photoId !== 'string') {
    return res.status(400).json({ error: 'photoId is required' })
  }

  const { data: photo, error: photoError } = await supabase
    .from('progress_photos')
    .select('*')
    .eq('id', photoId)
    .eq('user_id', user.id)
    .single()

  if (photoError || !photo) {
    return res.status(404).json({ error: 'Photo not found' })
  }

  if (!isVisionSupportedMime(photo.mime_type)) {
    return res.status(400).json({
      error: 'This image format cannot be analyzed. Re-upload as JPEG, PNG, or WebP.',
    })
  }

  await supabase
    .from('progress_photos')
    .update({ analysis_status: 'pending', analysis_error: null })
    .eq('id', photo.id)

  try {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(PROGRESS_PHOTOS_BUCKET)
      .download(photo.storage_path)

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message || 'Could not download photo for analysis')
    }

    const [{ data: profile }, { data: measurement }] = await Promise.all([
      supabase.from('profiles').select('gender, height_inches').eq('id', user.id).single(),
      supabase
        .from('measurements')
        .select('weight, body_fat')
        .eq('user_id', user.id)
        .eq('date', photo.date)
        .maybeSingle(),
    ])

    const prompt = buildPhotoAnalysisPrompt({
      pose: photo.pose,
      date: photo.date,
      gender: profile?.gender ?? null,
      heightInches: profile?.height_inches ?? null,
      weightLbs: measurement?.weight ?? null,
      scaleBodyFat: measurement?.body_fat ?? null,
    })

    const arrayBuffer = await fileData.arrayBuffer()
    const oidcToken = req.headers['x-vercel-oidc-token']
    const analysis = await analyzePhotoWithAiGateway({
      imageBase64: bufferToBase64(arrayBuffer),
      mimeType: photo.mime_type,
      prompt,
      oidcToken: typeof oidcToken === 'string' ? oidcToken : undefined,
    })

    const { error: updateError } = await supabase
      .from('progress_photos')
      .update({
        analysis_json: analysis,
        analysis_status: 'complete',
        analysis_error: null,
      })
      .eq('id', photo.id)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return res.status(200).json({
      success: true,
      analysis,
    })
  } catch (error) {
    console.error('Photo analysis error:', error)

    await supabase
      .from('progress_photos')
      .update({
        analysis_status: 'failed',
        analysis_error: error.message || 'Analysis failed',
      })
      .eq('id', photo.id)

    return res.status(500).json({
      success: false,
      error: error.message || 'Analysis failed',
    })
  }
}