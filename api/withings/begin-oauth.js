import { verifyWithingsOAuthState } from '../../server/withingsOAuthState.js'
import {
  buildWithingsContinueOAuthUrl,
  buildWithingsLoginUrl,
  buildWithingsLogoutUrl,
} from '../../server/withingsOAuthUrl.js'

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
    return res
      .status(400)
      .send('This Withings connection link expired. Go back to BodyTrend and tap Connect Withings again.')
  }

  if (!process.env.WITHINGS_CLIENT_ID) {
    return res.status(500).send('Withings is not configured on the server.')
  }

  try {
    const continueUrl = buildWithingsContinueOAuthUrl(state)
    const logoutUrl = buildWithingsLogoutUrl(continueUrl)
    const loginUrl = buildWithingsLoginUrl(state)
    const skipLogout = req.query.skip_logout === '1'

    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')

    if (skipLogout) {
      return res.redirect(302, loginUrl)
    }

    return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Connect Withings</title>
    <meta http-equiv="refresh" content="0;url=${escapeHtml(logoutUrl)}" />
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
        text-align: center;
      }
      a { color: #22d3ee; }
    </style>
  </head>
  <body>
    <p>Redirecting to Withings sign-in…</p>
    <p><a href="${escapeHtml(logoutUrl)}">Continue</a></p>
    <p><a href="${escapeHtml(loginUrl)}">Already signed out? Open login directly</a></p>
  </body>
</html>`)
  } catch (error) {
    console.error('Withings begin-oauth error:', error)
    return res.status(500).send(error.message || 'Withings is not configured on the server.')
  }
}