module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''
  if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) return res.status(400).json({ error: 'Username is invalid' })
  return res.status(200).json({ saved: true })
}
