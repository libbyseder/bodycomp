const ANALYSIS_MODEL = 'gpt-4o-mini'

const SUPPORTED_VISION_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export function isVisionSupportedMime(mimeType) {
  return SUPPORTED_VISION_MIME.has(mimeType)
}

function clampNumber(value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return Math.max(min, Math.min(max, value))
}

export function normalizeAnalysisPayload(raw) {
  if (!raw || typeof raw !== 'object') return null

  const confidenceRaw = String(raw.confidence ?? '').toLowerCase()
  const confidence =
    confidenceRaw === 'high' || confidenceRaw === 'medium' || confidenceRaw === 'low'
      ? confidenceRaw
      : 'low'

  const bodyFatPercent = clampNumber(raw.body_fat_percent, 3, 60)
  const rangeLow = clampNumber(raw.body_fat_range_low, 3, 60)
  const rangeHigh = clampNumber(raw.body_fat_range_high, 3, 60)

  const summary = typeof raw.summary === 'string' ? raw.summary.trim().slice(0, 600) : ''
  if (!summary) return null

  return {
    body_fat_percent: bodyFatPercent,
    body_fat_range_low: rangeLow,
    body_fat_range_high: rangeHigh,
    confidence,
    summary,
    posture_notes:
      typeof raw.posture_notes === 'string' ? raw.posture_notes.trim().slice(0, 300) : null,
    muscle_observations:
      typeof raw.muscle_observations === 'string'
        ? raw.muscle_observations.trim().slice(0, 400)
        : null,
    analyzed_at: new Date().toISOString(),
    model: ANALYSIS_MODEL,
    disclaimer:
      'Visual estimate only — not medical advice. Scale or clinical measurements are more accurate.',
  }
}

export function buildPhotoAnalysisPrompt({
  pose,
  date,
  gender,
  heightInches,
  weightLbs,
  scaleBodyFat,
}) {
  const contextLines = [
    `Photo pose: ${pose}`,
    `Check-in date: ${date}`,
    gender ? `User gender: ${gender}` : null,
    heightInches ? `Height: ${heightInches} inches` : null,
    weightLbs ? `Scale weight that day: ${weightLbs} lbs` : null,
    scaleBodyFat != null ? `Scale body fat that day: ${scaleBodyFat}%` : null,
  ].filter(Boolean)

  return `You are assisting a fitness progress tracking app. Analyze this gym progress photo and return ONLY valid JSON (no markdown).

Context:
${contextLines.map((line) => `- ${line}`).join('\n')}

Estimate visual body composition from the photo. This is a consumer wellness estimate, not a medical diagnosis. If the photo is unusable (poor lighting, face-only, fully clothed with no physique visible), set body_fat_percent to null and explain in summary.

Return JSON with exactly these keys:
{
  "body_fat_percent": number or null,
  "body_fat_range_low": number or null,
  "body_fat_range_high": number or null,
  "confidence": "low" | "medium" | "high",
  "summary": "2-3 sentences on visible changes or current condition",
  "posture_notes": "brief framing/lighting/pose quality notes or null",
  "muscle_observations": "brief muscle-group observations or null"
}

Rules:
- body_fat_percent should be your best single visual estimate when possible
- range low/high should bracket the estimate (about +/- 2-4 points)
- confidence reflects photo quality and pose clarity
- do not claim clinical or DEXA-level accuracy
- front/side poses are more reliable than back for body fat`
}

export async function analyzePhotoWithOpenAI({
  imageBase64,
  mimeType,
  prompt,
}) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured on the server')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: ANALYSIS_MODEL,
      temperature: 0.2,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
                detail: 'low',
              },
            },
          ],
        },
      ],
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = data?.error?.message || `OpenAI request failed (${response.status})`
    throw new Error(message)
  }

  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    throw new Error('OpenAI returned an empty analysis')
  }

  let parsed
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error('OpenAI returned invalid JSON')
  }

  const normalized = normalizeAnalysisPayload(parsed)
  if (!normalized) {
    throw new Error('OpenAI analysis was missing required fields')
  }

  return normalized
}