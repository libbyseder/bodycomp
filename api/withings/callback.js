export default async function handler(req, res) {
  const { code } = req.query

  if (!code) {
    return res.status(400).json({ error: 'No authorization code provided' })
  }

  // For now, just confirm we received the code
  return res.status(200).json({ 
    message: 'Authorization code received successfully',
    code: code 
  })
}
