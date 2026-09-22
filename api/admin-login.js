const crypto = require('node:crypto')

const ADMIN_USERS = (process.env.ADMIN_USERNAMES || 'Hamsath,Nihal').split(',').map(v => v.trim()).filter(Boolean)
const ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH || 'beb3710ebca4fd5aa36c88c36427acb7:1c9c8554653f036a3bf41a0f4ad7c445fe3e30e2d085e3bf8c3a5dcb88103138bb24fcbc3e6e676378d2340de354e319721c1715bf396b68151a92d0ee47ddde'

function verify(password, stored) {
  const [salt, hex] = stored.split(':')
  if (!salt || !hex) return false
  const key = crypto.scryptSync(password, salt, 64)
  const expected = Buffer.from(hex, 'hex')
  return expected.length === key.length && crypto.timingSafeEqual(expected, key)
}

function token(username) {
  const exp = Date.now() + 8 * 60 * 60 * 1000
  const payload = Buffer.from(JSON.stringify({ username, exp })).toString('base64url')
  const sig = crypto.createHmac('sha256', ADMIN_HASH).update(payload).digest('base64url')
  return `${payload}.${sig}`
}

module.exports = (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : ''
  const password = typeof req.body?.password === 'string' ? req.body.password : ''
  if (!ADMIN_USERS.includes(username) || !verify(password, ADMIN_HASH)) return res.status(401).json({ error: 'Invalid admin credentials' })
  return res.status(200).json({ token: token(username), username })
}
