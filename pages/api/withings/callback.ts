import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'HEAD') {
    res.status(200).end()
    return
  }

  if (req.method === 'GET' || req.method === 'POST') {
    res.status(200).json({ status: 'ok' })
    return
  }

  res.status(405).end()
}
