export default function handler(req, res) {
  if (req.method === 'HEAD') {
    return res.status(200).end()
  }

  if (req.method === 'GET' || req.method === 'POST') {
    return res.status(200).json({ status: 'ok' })
  }

  return res.status(405).end()
}
