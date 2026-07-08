import crypto from 'crypto'

function getStateSecret() {
  return (
    process.env.WITHINGS_STATE_SECRET ||
    process.env.WITHINGS_CLIENT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export function createWithingsOAuthState(userId, isApp = false) {
  const secret = getStateSecret()
  if (!secret) {
    throw new Error('Withings OAuth state secret is not configured')
  }

  const payload = {
    uid: userId,
    app: !!isApp,
    exp: Date.now() + 15 * 60 * 1000,
    nonce: crypto.randomBytes(16).toString('hex'),
  }

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url')
  return `${payloadB64}.${sig}`
}

export function verifyWithingsOAuthState(state) {
  const secret = getStateSecret()
  if (!secret || !state || typeof state !== 'string') return null

  const [payloadB64, sig] = state.split('.')
  if (!payloadB64 || !sig) return null

  const expected = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url')
  const sigBuffer = Buffer.from(sig)
  const expectedBuffer = Buffer.from(expected)
  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
    if (!payload?.uid || typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return null
    }
    return payload
  } catch {
    return null
  }
}