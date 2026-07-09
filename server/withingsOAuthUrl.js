export const WITHINGS_REDIRECT_URI = 'https://bodycomp-goals.vercel.app/api/withings/callback'

export function buildWithingsLoginUrl(state) {
  const clientId = process.env.WITHINGS_CLIENT_ID
  if (!clientId) {
    throw new Error('Withings client ID is not configured')
  }

  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const loginUrl = new URL('https://account.withings.com/oauth2_user/login')
  loginUrl.searchParams.set('response_type', 'code')
  loginUrl.searchParams.set('client_id', clientId)
  loginUrl.searchParams.set('redirect_uri', WITHINGS_REDIRECT_URI)
  loginUrl.searchParams.set('scope', 'user.metrics')
  loginUrl.searchParams.set('state', state)
  loginUrl.searchParams.set('prompt', 'login')
  loginUrl.searchParams.set('nonce', nonce)
  loginUrl.searchParams.set('b', 'user_select')

  return loginUrl.toString()
}