import { describe, it, expect } from 'vitest'
import { oppScore, companyRanking, peopleByPost, MIN_NEAR } from '../src/lib/match'
import users from '../src/data/users.json'
import opps from '../src/data/opportunities.json'

const me: any = users.find((u) => u.id === 'u_w1')
const A: any[] = opps

describe('cercanía', () => {
  it('queda entre 0 y 1 y premia habilidades iguales', () => {
    const design = A.find((o) => o.id === 'op_001'), books = A.find((o) => o.id === 'op_013')
    for (const o of A) { const s = oppScore(me, o); expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThanOrEqual(1) }
    expect(oppScore(me, design)).toBeGreaterThan(oppScore(me, books))
  })
  it('empresas ordenadas de más a menos cercana', () => {
    const r = companyRanking(me, A, users as any[])
    expect(r.length).toBe(20)
    for (let i = 1; i < r.length; i++) expect(r[i - 1].score).toBeGreaterThanOrEqual(r[i].score)
    for (const c of r) for (let i = 1; i < c.opps.length; i++) expect(c.opps[i - 1].score).toBeGreaterThanOrEqual(c.opps[i].score)
  })
  it('personas por publicación, ordenadas y sobre el mínimo', () => {
    const mine = A.filter((o) => o.company_id === 'u_c01')
    expect(mine.length).toBe(8)
    for (const g of peopleByPost(mine, users as any[])) {
      expect(g.people.length).toBeGreaterThan(0)
      for (let i = 0; i < g.people.length; i++) { expect(g.people[i].score).toBeGreaterThanOrEqual(MIN_NEAR); if (i) expect(g.people[i - 1].score).toBeGreaterThanOrEqual(g.people[i].score) }
    }
  })
})
