import { create } from 'zustand'
import { all, upsert } from '../lib/db'
import { setSession, uid, norm } from '../lib/util'
import { useUi } from './ui'
import { useTour } from './tour'

type Kind = 'worker' | 'company'
export type Register = { kind: Kind; name: string; email: string; password: string; headline?: string; skills?: string; gender?: '' | 'mujer' | 'varón'; rubro?: string; description?: string }
const KEY = 'as-session'
const read = () => { try { return sessionStorage.getItem(KEY) } catch { return null } }
const write = (id: string | null) => { try { id ? sessionStorage.setItem(KEY, id) : sessionStorage.removeItem(KEY) } catch { /* sin almacenamiento */ } }
const nfc = (s: string) => s.normalize('NFC')
const enter = (u: any) => { setSession(u); useUi.getState().resetForUser(u.role) }

type S = {
  userId: string | null
  login: (who: string, password: string) => string | null
  register: (r: Register) => string | null
  logout: () => void
}

const first = (() => { const id = read(); return id ? all('users').find((u) => u.id === id) ?? null : null })()
if (first) enter(first)

export const useAuth = create<S>((set) => ({
  userId: first?.id ?? null,
  login: (who, password) => {
    const q = norm(who.trim())
    const acc = all('accounts').find((a) => norm(a.username) === q || norm(a.email) === q)
    if (!q || !acc || nfc(acc.password) !== nfc(password)) return 'Usuario o contraseña incorrectos.'
    const u = all('users').find((x) => x.id === acc.user_id)
    if (!u) return 'Esta cuenta ya no existe.'
    enter(u); write(u.id); set({ userId: u.id }); return null
  },
  register: (r) => {
    const email = r.email.trim().toLowerCase(), name = r.name.trim()
    if (name.length < 3) return r.kind === 'company' ? 'Escribe el nombre de tu negocio.' : 'Escribe tu nombre completo.'
    if (!/^\S+@\S+\.\S+$/.test(email)) return 'Escribe un correo válido.'
    if (r.password.length < 6) return 'La contraseña necesita al menos 6 caracteres.'
    const username = email.split('@')[0]
    if (all('accounts').some((a) => norm(a.email) === norm(email) || norm(a.username) === norm(username))) return 'Ese correo ya tiene cuenta.'
    const list = (t = '') => t.split(',').map((x) => x.trim()).filter(Boolean)
    const since = new Date().toISOString().slice(0, 10)
    let user: any
    if (r.kind === 'worker') {
      if (!r.headline?.trim()) return 'Cuéntanos a qué te dedicas.'
      if (!list(r.skills).length) return 'Agrega al menos una habilidad.'
      user = { id: uid('u_w'), role: 'worker', name, city: 'Cochabamba', gender: r.gender ?? '', since, headline: r.headline.trim(), skills: list(r.skills), tools: [], availability: '10 horas por semana', modality: 'Remoto', rate_bs: 30, experience: [] }
    } else {
      if (!r.rubro?.trim()) return 'Escribe el rubro de tu negocio.'
      user = { id: uid('u_c'), role: 'company', name, rubro: r.rubro.trim(), city: 'Cochabamba', description: r.description?.trim() || 'Negocio en Cochabamba.', since }
    }
    upsert('users', user)
    upsert('accounts', { id: uid('acc'), user_id: user.id, username, email, password: r.password })
    enter(user); write(user.id); set({ userId: user.id }); return null
  },
  logout: () => {
    useTour.getState().stop(); write(null)
    useUi.getState().resetForUser('worker'); set({ userId: null })
  },
}))
