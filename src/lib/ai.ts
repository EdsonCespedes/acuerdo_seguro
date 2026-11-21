const KEY = (import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined)?.trim()
const PICK = (import.meta.env.VITE_AI_MODEL as string | undefined)?.trim()

const MODELS = [...new Set([PICK, 'nvidia/nemotron-3-nano-30b-a3b:free', 'nvidia/nemotron-3-ultra-550b-a55b:free', 'nvidia/nemotron-nano-9b-v2:free'].filter(Boolean) as string[])]

export const aiReady = !!KEY

const clean = (t: string) => t.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

async function call(model: string, system: string, user: string): Promise<string> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 45000)
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${KEY}`, 'X-Title': 'Acuerdo Seguro' },
      body: JSON.stringify({ model, max_tokens: 2000, temperature: 0.4, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
    })
    if (!res.ok) throw new Error(String(res.status))
    const data = await res.json()
    const text = clean(data?.choices?.[0]?.message?.content ?? '')
    if (!text) throw new Error('empty')
    return text
  } finally { clearTimeout(timer) }
}

export async function askAi(system: string, user: string): Promise<string> {
  if (!KEY) throw new Error('no key')
  let last: unknown
  for (const m of MODELS) {
    try { return await call(m, system, user) } catch (e) { last = e }
  }
  throw last
}
