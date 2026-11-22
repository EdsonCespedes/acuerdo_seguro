export type Vec3 = [number, number, number]

export let ME = '__none__'
export let CO = '__none__'
export function setSession(u: { id: string; role: string }) {
  ME = u.role === 'worker' ? u.id : '__none__'
  CO = u.role === 'company' ? u.id : '__none__'
}

export const fmtBs = (cents: number) =>
  'Bs ' + (cents / 100).toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

const tz = 'America/La_Paz'
export const fmtDate = (iso: string) =>
  new Intl.DateTimeFormat('es-BO', { timeZone: tz, day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
export const fmtDay = (iso: string) =>
  new Intl.DateTimeFormat('es-BO', { timeZone: tz, day: 'numeric', month: 'short' }).format(new Date(iso.length === 10 ? iso + 'T12:00:00-04:00' : iso))
export const fmtDateTime = (iso: string) =>
  new Intl.DateTimeFormat('es-BO', { timeZone: tz, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

export const daysLeft = (isoDay: string) => Math.ceil((new Date(isoDay + 'T23:59:59-04:00').getTime() - Date.now()) / 86400000)
export const leftLabel = (isoDay: string) => {
  const d = daysLeft(isoDay)
  return d < 0 ? 'cerrada' : d === 0 ? 'cierra hoy' : d === 1 ? 'cierra mañana' : `cierra en ${d} días`
}

export const nowIso = () => new Date().toISOString()
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
export const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function rng(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) }
  let a = h >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const ROLE_LABEL: Record<string, string> = { worker: 'Trabajador', company: 'Empresa' }
export const hasWebGL = () => {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}
export const isLowEnd = () => (navigator.hardwareConcurrency || 4) <= 4 || /Android/i.test(navigator.userAgent)

export const shortOf = (o: any, n = 44) => { const t: string = o.short ?? o.description ?? ''; return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t }

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'e', 'o', 'en', 'con', 'para', 'por', 'un', 'una', 'a', 'al', 'su', 'sus'])
export const shortTitle = (t = '', n = 22) => {
  if (t.length <= n) return t
  const out: string[] = []
  for (const w of t.split(/\s+/)) { if ((out.join(' ') + ' ' + w).trim().length > n) break; out.push(w) }
  while (out.length > 1 && STOP.has(norm(out[out.length - 1]))) out.pop()
  return out.join(' ') || t.slice(0, n - 1).trimEnd() + '…'
}

export const modLabel = (m: any, role: string) => (role === 'company' && m.alt ? m.alt.label : m.label)
export const modShort = (m: any, role: string) => (role === 'company' && m.alt ? m.alt.short : m.short)
export const modulesFor = (mods: any[], role: string) => mods.filter((m) => !m.role || m.role === role)
