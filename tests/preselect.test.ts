import { describe, it, expect } from 'vitest'
import { PRE_DEFAULT, PreRun, buildRun, candidatePool, parseResults, prePrompt, recalify, shortlist, activeCount } from '../src/lib/preselect'
import { km } from '../src/lib/geo'
import users from '../src/data/users.json'
import opps from '../src/data/opportunities.json'
import apps from '../src/data/applications.json'

const W: any[] = users.filter((u) => u.role === 'worker')
const opp: any = opps.find((o) => o.id === 'op_001')
const A: any[] = apps
const run = (scores: Record<string, number>): PreRun => ({ at: '', source: 'ia', items: Object.fromEntries(Object.entries(scores).map(([id, ai]) => [id, { ai, reason: 'r', src: 'ia' as const }])) })

describe('respuesta de la IA', () => {
  it('lee id|puntaje|razón, con % y barras de tabla', () => {
    const r = parseResults('u_w1|92|Cubre diseño y video.\n- u_w2 | 40 % | Le falta edición.\n| u_w3 | 150 | Exceso | \nruido sin formato')
    expect(r.u_w1).toEqual({ ai: 0.92, reason: 'Cubre diseño y video.' })
    expect(r.u_w2.ai).toBe(0.4)
    expect(r.u_w3).toEqual({ ai: 1, reason: 'Exceso' })
    expect(Object.keys(r).length).toBe(3)
  })
  it('el prompt no incluye nombre ni sexo', () => {
    const p = prePrompt(opp, W.slice(0, 5))
    for (const u of W.slice(0, 5)) { expect(p).toContain(u.id); expect(p).not.toContain(u.name); expect(p).not.toContain(u.gender === 'mujer' ? 'mujer' : 'varón') }
  })
  it('lo que la IA no devuelve se estima en local', () => {
    const r = buildRun(opp, W.slice(0, 3), { [W[0].id]: { ai: 0.9, reason: 'x' } })
    expect(r.source).toBe('ia'); expect(r.items[W[0].id].src).toBe('ia'); expect(r.items[W[1].id].src).toBe('local')
    expect(buildRun(opp, W.slice(0, 3), null).source).toBe('local')
  })
})

describe('grupo analizado', () => {
  it('incluye a todos los postulantes de la convocatoria', () => {
    const o = opps.find((x) => A.filter((a) => a.opportunity_id === x.id).length > 1) as any
    const pool = candidatePool(o, W, A).map((u) => u.id)
    for (const a of A.filter((a) => a.opportunity_id === o.id)) expect(pool).toContain(a.worker_id)
    expect(pool.length).toBeLessThanOrEqual(24)
  })
})

describe('recalificar', () => {
  const [a, b, c] = W
  const base = run({ [a.id]: 0.9, [b.id]: 0.8, [c.id]: 0.7 })
  const f = { ...PRE_DEFAULT, onlyApplied: false }
  it('sin filtros conserva el % de la IA y el orden', () => {
    const rows = recalify(opp, base, W, [], f, 'Cochabamba')
    expect(rows.map((r) => r.user.id)).toEqual([a.id, b.id, c.id]); expect(rows[0].score).toBe(0.9); expect(rows.every((r) => !r.flags.length)).toBe(true)
  })
  it('el sexo baja el % y puede reordenar; en modo filtrar oculta', () => {
    const other = [a, b, c].find((u) => u.gender !== a.gender)!
    const g = { ...f, gender: other.gender }
    const rows = recalify(opp, base, W, [], g, 'Cochabamba')
    expect(rows.find((r) => r.user.id === a.id)!.score).toBeCloseTo(0.45)
    expect(recalify(opp, base, W, [], { ...g, mode: 'filtrar' }, 'Cochabamba').every((r) => r.user.gender === other.gender)).toBe(true)
  })
  it('ubicación cercana usa la distancia a la ciudad de referencia', () => {
    const far = { ...f, maxKm: 5 }
    for (const r of recalify(opp, base, W, [], far, 'Cochabamba')) {
      const d = km(r.user.city, 'Cochabamba')
      expect(r.flags.some((x) => x.includes('km'))).toBe(d !== null && d > 5)
    }
    expect(km('Cochabamba', 'Quillacollo')).toBeGreaterThan(10); expect(km('Cochabamba', 'Cochabamba')).toBe(0); expect(km('Cochabamba', 'Marte')).toBeNull()
  })
  it('solo postulantes, preselección y filtros activos', () => {
    const ap = [{ id: 'x', opportunity_id: opp.id, worker_id: b.id, status: 'enviada' }]
    const rows = recalify(opp, base, W, ap, { ...PRE_DEFAULT }, 'Cochabamba')
    expect(rows.map((r) => r.user.id)).toEqual([b.id]); expect(shortlist(rows).map((r) => r.user.id)).toEqual([b.id])
    expect(shortlist(recalify(opp, run({ [b.id]: 0.3 }), W, ap, PRE_DEFAULT, 'Cochabamba'))).toEqual([])
    expect(activeCount({ ...PRE_DEFAULT, gender: 'mujer', maxKm: 20, must: ['x'] })).toBe(3)
  })
})
