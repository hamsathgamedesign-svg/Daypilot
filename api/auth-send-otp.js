module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  return res.status(503).json({ error: 'Email verification is not configured for this Vercel deployment yet.' })
}
