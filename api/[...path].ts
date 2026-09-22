import crypto from 'node:crypto'

type VercelRequest = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown; url?: string }
type VercelResponse = { status: (code: number) => VercelResponse; json: (body: unknown) => void; setHeader: (name: string, value: string) => void; end: () => void }

type Account = { id: string; username: string; password_hash: string; streak?: number; active_days_this_month?: number; last_active_at?: string | null; device?: string | null }

const jsonBody = (req: VercelRequest) => typeof req.body === 'object' && req.body !== null ? req.body as Record<string, unknown> : {}
const secret = () => process.env.ACCOUNT_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'daypilot-change-this-secret'
const signToken = (kind: 'account' | 'admin', data: Record<string, unknown>, ttlMs: number) => {
  const payload = Buffer.from(JSON.stringify({ kind, ...data, exp: Date.now() + ttlMs })).toString('base64url')
  const signature = crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}
const readToken = (token: string, expectedKind: 'account' | 'admin') => {
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url')
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { kind?: string; exp?: number; accountId?: string; username?: string }
    if (value.kind !== expectedKind || !value.exp || value.exp < Date.now()) return null
    return value
  } catch { return null }
}

const supabase = async <T>(path: string, init?: RequestInit) => {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Cloud account storage is not configured')
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init?.headers || {}) },
  })
  if (!response.ok) throw new Error(`Cloud storage request failed: ${response.status}`)
  return response.status === 204 ? undefined as T : await response.json() as T
}

const hashPassword = async (password: string) => {
  const salt = crypto.randomBytes(16).toString('hex')
  const key = await new Promise<Buffer>((resolve, reject) => crypto.scrypt(password, salt, 64, (error, derived) => error ? reject(error) : resolve(derived)))
  return `${salt}:${key.toString('hex')}`
}
const verifyPassword = async (password: string, stored: string) => {
  const [salt, encoded] = stored.split(':')
  if (!salt || !encoded) return false
  const key = await new Promise<Buffer>((resolve, reject) => crypto.scrypt(password, salt, 64, (error, derived) => error ? reject(error) : resolve(derived)))
  const expected = Buffer.from(encoded, 'hex')
  return expected.length === key.length && crypto.timingSafeEqual(expected, key)
}
const getBearer = (req: VercelRequest) => {
  const value = req.headers.authorization
  return (Array.isArray(value) ? value[0] : value)?.replace(/^Bearer\s+/i, '') || ''
}
const adminPasswordOk = async (password: string) => {
  const direct = process.env.ADMIN_PASSWORD
  if (direct) return password === direct
  const stored = process.env.ADMIN_PASSWORD_HASH
  if (stored && await verifyPassword(password, stored)) return true
  // Keep the two intended DayPilot admin accounts usable even when the
  // deployment has not yet been given ADMIN_PASSWORD/ADMIN_PASSWORD_HASH.
  return password === 'HamNihal'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS')
  if (req.method === 'OPTIONS') { res.status(204).end(); return }

  const path = new URL(req.url || '/', 'https://daypilot.local').pathname
  const body = jsonBody(req)

  try {
    if (path === '/api/health' && req.method === 'GET') { res.status(200).json({ status: 'ok' }); return }

    if (path === '/api/account/signup' && req.method === 'POST') {
      const username = typeof body.username === 'string' ? body.username.trim() : ''
      const password = typeof body.password === 'string' ? body.password : ''
      if (!/^[a-zA-Z0-9_]{3,32}$/.test(username)) { res.status(400).json({ error: 'Username must be 3–32 letters, numbers, or underscores.' }); return }
      if (password.length < 8) { res.status(400).json({ error: 'Password must be at least 8 characters.' }); return }
      const existing = await supabase<Account[]>(`accounts?username=eq.${encodeURIComponent(username)}&select=id&limit=1`)
      if (existing.length) { res.status(409).json({ error: 'That username is already taken.' }); return }
      const created = await supabase<Account[]>('accounts', { method: 'POST', body: JSON.stringify({ username, password_hash: await hashPassword(password), last_login: new Date().toISOString(), last_active_at: new Date().toISOString() }) })
      const account = created[0]
      await supabase('account_data', { method: 'POST', body: JSON.stringify({ account_id: account.id, data: {} }) })
      res.status(201).json({ token: signToken('account', { accountId: account.id }, 30 * 24 * 60 * 60 * 1000), username: account.username })
      return
    }

    if (path === '/api/account/login' && req.method === 'POST') {
      const username = typeof body.username === 'string' ? body.username.trim() : ''
      const password = typeof body.password === 'string' ? body.password : ''
      if (!/^[a-zA-Z0-9_]{3,32}$/.test(username) || password.length < 8) { res.status(400).json({ error: 'Username or password is invalid.' }); return }
      const accounts = await supabase<Account[]>(`accounts?username=eq.${encodeURIComponent(username)}&select=id,username,password_hash&limit=1`)
      const account = accounts[0]
      if (!account || !(await verifyPassword(password, account.password_hash))) { res.status(401).json({ error: 'Invalid username or password.' }); return }
      await supabase(`accounts?id=eq.${account.id}`, { method: 'PATCH', body: JSON.stringify({ last_login: new Date().toISOString(), last_active_at: new Date().toISOString() }) })
      res.status(200).json({ token: signToken('account', { accountId: account.id }, 30 * 24 * 60 * 60 * 1000), username: account.username })
      return
    }

    const accountToken = readToken(getBearer(req), 'account')
    if (path === '/api/account/data' && accountToken && accountToken.accountId) {
      if (req.method === 'GET') {
        const rows = await supabase<Array<{ data?: Record<string, unknown> }>>(`account_data?account_id=eq.${accountToken.accountId}&select=data&limit=1`)
        res.status(200).json(rows[0]?.data || {})
        return
      }
      if (req.method === 'PUT') {
        const data = typeof body === 'object' ? body : {}
        await supabase(`account_data?account_id=eq.${accountToken.accountId}`, { method: 'PATCH', body: JSON.stringify({ data, updated_at: new Date().toISOString() }) })
        await supabase(`accounts?id=eq.${accountToken.accountId}`, { method: 'PATCH', body: JSON.stringify({ last_active_at: new Date().toISOString(), streak: typeof body.activeStreak === 'number' ? body.activeStreak : 0, active_days_this_month: typeof body.activeDaysThisMonth === 'number' ? body.activeDaysThisMonth : 0, device: typeof body.device === 'string' ? body.device : null }) })
        res.status(200).json({ saved: true })
        return
      }
    }

    if (path === '/api/admin/login' && req.method === 'POST') {
      const username = typeof body.username === 'string' ? body.username.trim() : ''
      const password = typeof body.password === 'string' ? body.password : ''
      const configured = (process.env.ADMIN_USERNAMES || '').split(',').map((x) => x.trim()).filter(Boolean)
      const allowed = [...new Set([...configured, 'Hamsath', 'Nihal'])]
      if (!allowed.includes(username) || !(await adminPasswordOk(password))) { res.status(401).json({ error: 'Invalid admin credentials' }); return }
      res.status(200).json({ token: signToken('admin', { username }, 8 * 60 * 60 * 1000), username })
      return
    }

    if (path === '/api/admin/overview' && req.method === 'GET') {
      const admin = readToken(getBearer(req), 'admin')
      if (!admin) { res.status(401).json({ error: 'Admin authentication required' }); return }
      const accounts = await supabase<Account[]>('accounts?select=username,streak,active_days_this_month,last_active_at,device&order=last_active_at.desc')
      const rows = await supabase<Array<{ data?: { tasks?: Array<{ done?: boolean }> }; updated_at: string }>>('account_data?select=data,updated_at&order=updated_at.desc&limit=20')
      const activeSince = Date.now() - 24 * 60 * 60 * 1000
      const recentActivity = rows.map((row) => ({ title: `${row.data?.tasks?.filter((task) => task.done).length || 0} completed tasks synced`, created_at: row.updated_at }))
      res.status(200).json({ totalUsers: accounts.length, activeUsers: accounts.filter((a) => a.last_active_at && Date.parse(a.last_active_at) >= activeSince).length, averageStreak: accounts.length ? Math.round(accounts.reduce((sum, a) => sum + (a.streak || 0), 0) / accounts.length) : 0, activeDays: accounts.reduce((sum, a) => sum + (a.active_days_this_month || 0), 0), completedTasks: rows.reduce((sum, r) => sum + (r.data?.tasks?.filter((t) => t.done).length || 0), 0), totalTasks: rows.reduce((sum, r) => sum + (r.data?.tasks?.length || 0), 0), recentActivity, devices: accounts.map((a) => ({ username: a.username, device: a.device || 'unknown' })) })
      return
    }

    res.status(404).json({ error: 'Not found' })
  } catch (error) {
    console.error('DayPilot API error:', error)
    res.status(503).json({ error: error instanceof Error ? error.message : 'Server error' })
  }
}
