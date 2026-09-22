module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return res.status(503).json({ error: 'OpenAI assistant is not configured on the server' })
  const tasks = Array.isArray(req.body?.tasks) ? req.body.tasks.slice(0, 50) : []
  const reminders = Array.isArray(req.body?.reminders) ? req.body.reminders.slice(0, 50) : []
  const prompt = typeof req.body?.prompt === 'string' && req.body.prompt.trim() ? req.body.prompt.trim().slice(0, 500) : 'Plan my evening.'
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', temperature: 0.4, max_tokens: 300,
        messages: [
          { role: 'system', content: 'You are DayPilot AI, a concise personal productivity assistant. Give practical, friendly advice based only on the provided tasks and reminders. Do not claim to have completed actions. Return plain text with short paragraphs or bullets.' },
          { role: 'user', content: JSON.stringify({ request: prompt, tasks, reminders }) },
        ]
      })
    })
    const result = await response.json()
    if (!response.ok) return res.status(502).json({ error: 'The AI assistant could not respond' })
    const answer = result.choices?.[0]?.message?.content?.trim()
    if (!answer) return res.status(502).json({ error: 'The AI assistant returned an empty response' })
    return res.status(200).json({ answer })
  } catch { return res.status(502).json({ error: 'The AI assistant could not respond' }) }
}
