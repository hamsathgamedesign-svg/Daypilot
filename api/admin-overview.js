const crypto = require('node:crypto')
const ADMIN_HASH = process.env.ADMIN_PASSWORD_HASH || 'beb3710ebca4fd5aa36c88c36427acb7:1c9c8554653f036a3bf41a0f4ad7c445fe3e30e2d085e3bf8c3a5dcb88103138bb24fcbc3e6e676378d2340de354e319721c1715bf396b68151a92d0ee47ddde'
function validToken(value) {
  if (!value) return false
  const [payload, sig] = value.replace(/^Bearer\s+/i, '').split('.')
  if (!payload || !sig) return false
  const expected = crypto.createHmac('sha256', ADMIN_HASH).update(payload).digest('base64url')
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now() } catch { return false }
}
module.exports = (req, res) => {
  if (!validToken(req.headers.authorization)) return res.status(401).json({ error: 'Admin authentication required' })
  return res.status(200).json({ totalUsers: 0, activeUsers: 0, averageStreak: 0, activeDays: 0, completedTasks: 0, totalTasks: 0, recentActivity: [] })
}
