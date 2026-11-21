import { all } from './db'
import { ME, CO, rng, Vec3 } from './util'
import { offerPos } from './layout'
import { companyRanking, peopleByPost, MIN_NEAR } from './match'

export type Role = 'worker' | 'company'
export type Lens = 'opps' | 'group'
export type Placed = { pos: Vec3; show: boolean; score?: number }
export type World = { opps: Record<string, Placed>; companies: Record<string, Placed>; people: Record<string, Placed & { opp: string }> }

const fib = (i: number, n: number, R: number): Vec3 => {
  const y = 1 - ((i + 0.5) / n) * 2, r = Math.sqrt(1 - y * y), a = i * 2.399963
  return [Math.cos(a) * r * R, y * R * 0.85, Math.sin(a) * r * R]
}
const around = (c: Vec3, seed: string, rad: number): Vec3 => {
  const r = rng(seed), th = r() * 6.283, ph = Math.acos(2 * r() - 1)
  return [c[0] + rad * Math.sin(ph) * Math.cos(th), c[1] + rad * Math.cos(ph), c[2] + rad * Math.sin(ph) * Math.sin(th)]
}
const clear = (p: Vec3, min: number): Vec3 => { const l = Math.hypot(...p); return l >= min ? p : p.map((x) => (x / (l || 1)) * min) as Vec3 }

export function computeWorld(role: Role, lens: Lens): World {
  const opps = all('opportunities'), users = all('users')
  const w: World = { opps: {}, companies: {}, people: {} }
  for (const o of opps) w.opps[o.id] = { pos: offerPos(o), show: true }
  if (lens !== 'group') return w

  if (role === 'worker') {
    const rank = companyRanking(users.find((u) => u.id === ME), opps, users)
    const ids = users.filter((u) => u.role === 'company').map((u) => u.id)
    const max = Math.max(0.01, ...rank.map((r) => r.score))
    for (const r of rank) {
      const dir = fib(ids.indexOf(r.company.id), ids.length, 1)
      const R = 5.5 + (1 - r.score / max) * 9
      const L = Math.hypot(...dir) || 1
      const pos: Vec3 = [dir[0] / L * R, dir[1] / L * R, dir[2] / L * R]
      w.companies[r.company.id] = { pos, show: true, score: r.score }
      for (const x of r.opps) w.opps[x.opp.id] = { pos: around(pos, 'sat:' + x.opp.id, 1.5 + (1 - x.score) * 1.1), show: true, score: x.score }
    }
    return w
  }

  const mine = opps.filter((o) => o.company_id === CO)
  for (const o of opps) w.opps[o.id].show = o.company_id === CO
  mine.forEach((o, i) => { w.opps[o.id].pos = fib(i, mine.length, 6.5) })
  const placed = new Set<string>()
  for (const g of peopleByPost(mine, users)) {
    for (const p of g.people) {
      if (placed.has(p.user.id) || p.score < MIN_NEAR) continue
      const best = peopleByPost(mine, [p.user]).sort((a, b) => (b.people[0]?.score ?? 0) - (a.people[0]?.score ?? 0))[0]
      if (best.opp.id !== g.opp.id) continue
      placed.add(p.user.id)
      w.people[p.user.id] = { pos: clear(around(w.opps[g.opp.id].pos, 'per:' + p.user.id, 1.3 + (1 - p.score) * 3.6), 3.2), show: true, score: p.score, opp: g.opp.id }
    }
  }
  return w
}
