import { verifyWithingsOAuthState } from '../../server/withingsOAuthState.js'

const WITHINGS_ACCOUNT_URL = 'https://account.withings.com/'
const REDIRECT_URI = 'https://bodycomp-goals.vercel.app/api/withings/callback'

function buildAuthorizeUrl(state, nonce) {
  const clientId = process.env.WITHINGS_CLIENT_ID
  const authUrl = new URL('https://account.withings.com/oauth2_user/authorize2')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  authUrl.searchParams.set('scope', 'user.metrics')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('prompt', 'login')
  authUrl.searchParams.set('nonce', nonce)
  return authUrl.toString()
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const state = req.query.state
  const payload = verifyWithingsOAuthState(state)
  if (!payload) {
    return res.status(400).send('This Withings connection link expired. Go back to BodyTrend and tap Connect Withings again.')
  }

  if (!process.env.WITHINGS_CLIENT_ID) {
    return res.status(500).send('Withings is not configured on the server.')
  }

  const nonce = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const authorizeUrl = buildAuthorizeUrl(state, nonce)

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')

  return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Connect Withings to BodyTrend</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #09090b;
        color: #e4e4e7;
        font-family: system-ui, -apple-system, Segoe UI, sans-serif;
        padding: 24px;
      }
      .card {
        max-width: 420px;
        width: 100%;
        background: #18181b;
        border: 1px solid #3f3f46;
        border-radius: 24px;
        padding: 28px;
      }
      h1 { margin: 0 0 12px; font-size: 1.35rem; }
      p { margin: 0 0 14px; color: #a1a1aa; line-height: 1.5; font-size: 0.95rem; }
      .actions { display: grid; gap: 12px; margin-top: 22px; }
      a, button {
        display: block;
        text-align: center;
        border-radius: 16px;
        padding: 14px 16px;
        font-size: 0.95rem;
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
        border: none;
      }
      .primary { background: #06b6d4; color: #042f2e; }
      .secondary { background: #27272a; color: #fafafa; border: 1px solid #3f3f46; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Connect your Withings account</h1>
      <p>
        BodyTrend will ask Withings for permission to import your scale measurements.
        Sign in with the Withings account that owns your scale.
      </p>
      <p>
        If you see someone else's account, open Withings in a new tab, sign out there,
        then come back and continue below.
      </p>
      <div class="actions">
        <a class="secondary" href="${escapeHtml(WITHINGS_ACCOUNT_URL)}" target="_blank" rel="noopener noreferrer">
          Open Withings account page
        </a>
        <a class="primary" href="${escapeHtml(authorizeUrl)}">
          Continue to Withings login
        </a>
      </div>
    </div>
  </body>
</html>`)
}