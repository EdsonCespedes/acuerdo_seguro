import { norm } from './util'
import { oppScore, MIN_NEAR } from './match'
import { km } from './geo'

export type Gender = '' | 'mujer' | 'varón'
export type PreFilters = {
  must: string[]
  refCity: string; maxKm: number 
  gender: Gender; modality: '' | 'Remoto' | 'Presencial' | 'Mixta'
  maxRate: number; minHours: number; needExp: boolean; onlyApplied: boolean
  mode: 'recalificar' | 'filtrar'  
}
export const PRE_DEFAULT: PreFilters = { must: [], refCity: '', maxKm: 0, gender: '', modality: '', maxRate: 0, minHours: 0, needExp: false, onlyApplied: true, mode: 'recalificar' }

export type PreItem = { ai: number; reason: string; src: 'ia' | 'local' }
export type PreRun = { at: string; source: 'ia' | 'local'; items: Record<string, PreItem> }
export type PreRow = { user: any; app: any | null; base: number; score: number; reason: string; src: 'ia' | 'local'; flags: string[]; dist: number | null }

export const SHORT_MAX = 5, SHORT_MIN = 0.5

const hoursOf = (u: any) => Number(String(u.availability || '').match(/\d+/)?.[0] ?? 0)

export const activeCount = (f: PreFilters) =>
  f.must.length + (f.maxKm > 0 ? 1 : 0) + [f.gender, f.modality].filter(Boolean).length + (f.maxRate > 0 ? 1 : 0) + (f.minHours > 0 ? 1 : 0) + (f.needExp ? 1 : 0)

export function candidatePool(opp: any, workers: any[], apps: any[], max = 24): any[] {
  const applied = new Set(apps.filter((a) => a.opportunity_id === opp.id).map((a) => a.worker_id))
  const mine = workers.filter((u) => applied.has(u.id))
  const rest = workers.filter((u) => !applied.has(u.id)).map((u) => ({ u, s: oppScore(u, opp) })).filter((x) => x.s >= MIN_NEAR).sort((a, b) => b.s - a.s).map((x) => x.u)
  return [...mine, ...rest.slice(0, Math.max(0, max - mine.length))]
}

export const PRE_SYSTEM = 'Eres un asistente de selección de personal en Bolivia. Evalúas qué tan bien encaja el perfil profesional de cada persona con una convocatoria. Usa solo los datos recibidos y no inventes nada. Basa el puntaje solo en habilidades, herramientas, experiencia y afinidad con los entregables. Escribe UNA línea por persona, todas las personas, con el formato id|puntaje|razón. El puntaje es un entero de 0 a 100: 90 o más solo si cubre casi todo lo pedido, menos de 30 si casi no tiene relación. La razón tiene máximo 14 palabras, en español, con un punto fuerte y, si lo hay, lo que falta. Sin markdown ni texto extra.'

const cut = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t)

export function prePrompt(opp: any, people: any[]) {
  const head = `Convocatoria: ${opp.title}. Área: ${opp.specialty}. Qué necesitan: ${opp.description}. Habilidades pedidas: ${(opp.skills || []).join(', ')}. Entregables: ${(opp.deliverables || []).join(', ')}.`
  const need: string[] = opp.skills || []
  const lines = people.map((u) => {
    const have = new Set<string>((u.skills || []).map((x: string) => norm(x)))
    const hit = need.filter((s) => have.has(norm(s))).length
    return `${u.id} | ${u.headline} | Habilidades: ${(u.skills || []).join(', ')} | Herramientas: ${(u.tools || []).join(', ')} | Experiencia: ${(u.experience || []).map((e: string) => cut(e, 70)).join('; ') || 'ninguna'} | Cubre ${hit} de ${need.length} habilidades pedidas`
  })
  return [head, 'Personas:', ...lines].join('\n')
}

export function parseResults(text: string): Record<string, { ai: number; reason: string }> {
  const out: Record<string, { ai: number; reason: string }> = {}
  for (const l of text.split('\n')) {
    const m = l.match(/^\W*(u_\w+)\s*\|\s*(\d{1,3})\s*%?\s*\|\s*(.+)$/)
    if (m) out[m[1]] = { ai: Math.min(100, Number(m[2])) / 100, reason: m[3].replace(/\|\s*$/, '').trim() }
  }
  return out
}

export function localReason(user: any, opp: any) {
  const have = new Set<string>((user.skills || []).map((x: string) => norm(x)))
  const need: string[] = opp.skills || []
  const hit = need.filter((s) => have.has(norm(s))), miss = need.filter((s) => !have.has(norm(s)))
  if (!hit.length) return 'Afinidad por experiencia y herramientas.'
  return `Coincide en ${hit.length} de ${need.length}: ${hit.slice(0, 2).join(', ')}.` + (miss.length ? ` Le falta ${miss[0]}.` : '')
}

export const localItem = (user: any, opp: any): PreItem => ({ ai: oppScore(user, opp), reason: localReason(user, opp), src: 'local' })

export function buildRun(opp: any, people: any[], parsed: Record<string, { ai: number; reason: string }> | null): PreRun {
  const items: Record<string, PreItem> = {}
  for (const u of people) {
    const p = parsed?.[u.id]
    items[u.id] = p ? { ai: p.ai, reason: p.reason, src: 'ia' } : localItem(u, opp)
  }
  return { at: new Date().toISOString(), source: parsed && Object.keys(parsed).length ? 'ia' : 'local', items }
}

export function recalify(opp: any, run: PreRun, workers: any[], apps: any[], f: PreFilters, homeCity: string): PreRow[] {
  const applied = new Map<string, any>(apps.filter((a) => a.opportunity_id === opp.id).map((a) => [a.worker_id, a]))
  const ref = f.refCity || homeCity
  const rows: PreRow[] = []
  for (const user of workers) {
    const it = run.items[user.id]
    if (!it) continue
    let s = it.ai
    const flags: string[] = []
    const have = new Set<string>((user.skills || []).map((x: string) => norm(x)))
    const miss = f.must.filter((m) => !have.has(norm(m)))
    if (miss.length) { s *= Math.pow(0.6, miss.length); flags.push('Falta ' + miss.join(', ')) }
    const dist = km(user.city, ref)
    if (f.maxKm > 0 && dist !== null && dist > f.maxKm) { s *= user.modality === 'Remoto' && opp.modality === 'Remoto' ? 0.9 : 0.75; flags.push(`${user.city} · ${Math.round(dist)} km`) }
    if (f.gender && user.gender !== f.gender) { s *= 0.5; flags.push(user.gender === 'mujer' ? 'Mujer' : user.gender === 'varón' ? 'Varón' : 'Sin indicar') }
    if (f.modality && user.modality !== f.modality && user.modality !== 'Mixta') { s *= 0.8; flags.push(user.modality) }
    if (f.maxRate > 0 && user.rate_bs > f.maxRate) { s *= 0.8; flags.push(`Bs ${user.rate_bs}/h`) }
    if (f.minHours > 0 && hoursOf(user) < f.minHours) { s *= 0.85; flags.push(`${hoursOf(user) || '—'} h/sem`) }
    if (f.needExp && !(user.experience || []).length) { s *= 0.7; flags.push('Sin experiencia') }
    rows.push({ user, app: applied.get(user.id) ?? null, base: it.ai, score: Math.min(1, s), reason: it.reason, src: it.src, flags, dist })
  }
  let pool = f.onlyApplied ? rows.filter((r) => r.app) : rows
  if (f.mode === 'filtrar') pool = pool.filter((r) => !r.flags.length)
  return pool.sort((a, b) => b.score - a.score || b.base - a.base)
}

export const shortlist = (rows: PreRow[]) => rows.filter((r) => r.app && r.score >= SHORT_MIN).slice(0, SHORT_MAX)
