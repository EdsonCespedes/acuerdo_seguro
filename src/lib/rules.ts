export type Version = {
  v: number; createdAt: string; scope: string; deliverables: { kind: string; qty: number }[]
  total_cents: number; advance_cents: number; days: number; revisions?: number
  acceptance?: string; cancellation?: string; changes?: string; responsibilities?: string; acceptedBy: string[]
}
export type Agreement = { id: string; versions: Version[]; [k: string]: any }

export const latest = (a: Agreement) => a.versions[a.versions.length - 1]
export const balance = (v: Version) => v.total_cents - v.advance_cents

export function semaforo(v: Version) {
  const red: string[] = []; const yellow: string[] = []
  if (!v.scope?.trim()) red.push('Alcance')
  if (!v.deliverables?.length || v.deliverables.some((d) => !(d.qty > 0))) red.push('Entregables y cantidades')
  if (!(v.total_cents > 0)) red.push('Precio total')
  if (!(v.days > 0)) red.push('Plazo')
  if (v.advance_cents > v.total_cents || v.advance_cents < 0) red.push('Anticipo coherente con el total')
  if (!(v.revisions! >= 0) || v.revisions === undefined) yellow.push('Número de revisiones')
  if (!v.acceptance?.trim()) yellow.push('Criterios de aceptación')
  if (!v.cancellation?.trim()) yellow.push('Condiciones de cancelación')
  if (!v.changes?.trim()) yellow.push('Gestión de cambios')
  if (!v.responsibilities?.trim()) yellow.push('Responsabilidades')
  const level: 'rojo' | 'amarillo' | 'verde' = red.length ? 'rojo' : yellow.length ? 'amarillo' : 'verde'
  return { level, red, yellow }
}

export function newVersion(a: Agreement, patch: Partial<Version>, now: string): Agreement {
  const last = latest(a)
  return { ...a, versions: [...a.versions, { ...last, ...patch, v: last.v + 1, createdAt: now, acceptedBy: [] }] }
}

export function acceptVersion(a: Agreement, v: number, party: 'company' | 'worker'): Agreement {
  const last = latest(a)
  if (v !== last.v) throw new Error('Solo se puede aceptar la versión vigente')
  if (last.acceptedBy.includes(party)) return a
  const versions = a.versions.map((x) => (x.v === v ? { ...x, acceptedBy: [...x.acceptedBy, party] } : x))
  return { ...a, versions }
}
export const isBilateral = (v: Version) => v.acceptedBy.includes('company') && v.acceptedBy.includes('worker')

export type PayState = 'programado' | 'pendiente' | 'vencido' | 'reportado_pagador' | 'confirmado_receptor' | 'verificado_proveedor' | 'en_controversia'

export function effectiveState(p: { state: PayState; due: string }, today = new Date()): PayState {
  if ((p.state === 'programado' || p.state === 'pendiente') && new Date(p.due + 'T23:59:59-04:00') < today) return 'vencido'
  return p.state
}

export function canPay(role: string, from: PayState, to: PayState): boolean {
  if (to === 'reportado_pagador') return role === 'company' && ['programado', 'pendiente', 'vencido'].includes(from)
  if (to === 'confirmado_receptor') return role === 'worker' && from === 'reportado_pagador'
  if (to === 'en_controversia') return (role === 'company' || role === 'worker') && ['reportado_pagador', 'confirmado_receptor', 'vencido'].includes(from)
  return false
}

export type DelState = 'pendiente' | 'entregado' | 'en_revision' | 'cambios_solicitados' | 'aprobado'
export function canDeliver(role: string, from: DelState, to: DelState): boolean {
  if (to === 'entregado') return role === 'worker' && (from === 'pendiente' || from === 'cambios_solicitados')
  if (to === 'en_revision') return role === 'company' && from === 'entregado'
  if (to === 'aprobado' || to === 'cambios_solicitados') return role === 'company' && from === 'en_revision'
  return false
}

export function reconcile(total_cents: number, pays: { amount_cents: number }[]) {
  const sum = pays.reduce((s, p) => s + p.amount_cents, 0)
  return { sum, ok: sum === total_cents, diff: total_cents - sum }
}
