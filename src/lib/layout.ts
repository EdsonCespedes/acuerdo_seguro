import modules from '../data/modules.json'
import branches from '../data/branches.json'
import { rng, Vec3 } from './util'

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
const norm = (a: Vec3): Vec3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l] }
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
function basis(d: Vec3): [Vec3, Vec3] {
  let u = cross(d, [0, 1, 0]); if (Math.hypot(...u) < 0.01) u = cross(d, [1, 0, 0])
  u = norm(u); return [u, norm(cross(d, u))]
}

const RADII = [3.2, 4.2, 3.6, 4.5, 3.3, 4.3, 3.8, 4.6]
export const MODULE_POS: Record<string, Vec3> = {}
modules.forEach((m, i) => {
  const n = modules.length
  const y = 1 - ((i + 0.5) / n) * 2
  const r = Math.sqrt(1 - y * y)
  const a = i * 2.399963
  const R = RADII[i % RADII.length]
  MODULE_POS[m.id] = [Math.cos(a) * r * R, y * R * 0.85, Math.sin(a) * r * R]
})

export function dendritePoints(id: string, to: Vec3): Vec3[] {
  const r = rng('dend:' + id)
  const [u, v] = basis(norm(to))
  const w = (k: number): Vec3 => add(mul(u, (r() - 0.5) * k), mul(v, (r() - 0.5) * k))
  const d = norm(to)
  return [mul(d, 1.3), add(mul(to, 0.45), w(0.7)), add(mul(to, 0.75), w(0.4)), to]
}

const clusterDir = (i: number): Vec3 => {
  const a = (i / branches.length) * Math.PI * 2 + 0.5
  return norm([Math.cos(a) * 0.8, Math.sin(a) * 1.15, 0.4 * Math.sin(a * 2 + 1)])
}

export function offerPos(o: any): Vec3 {
  const bi = Math.max(0, branches.findIndex((b) => b.id === o.branch))
  const d = clusterDir(bi)
  const [u, v] = basis(d)
  const r = rng('opp:' + o.id)
  const dist = 8.5 + r() * 2
  const ang = r() * Math.PI * 2
  const rad = 0.6 + Math.sqrt(r()) * 3
  return add(add(mul(d, dist), mul(u, Math.cos(ang) * rad)), mul(v, Math.sin(ang) * rad))
}

export const homeView = (mobile: boolean) => ({ pos: (mobile ? [0, 1, 17] : [0, 1.2, 12]) as Vec3, target: [0, 0, 0] as Vec3 })
export const offersView = (mobile: boolean) => ({ pos: (mobile ? [0, 0, 40] : [0, 0, 28]) as Vec3, target: [0, 0, 0] as Vec3 })

export function focusView(p: Vec3, dist: number, lowerForSheet: boolean, origin: Vec3 = [0, 0, 0]): { pos: Vec3; target: Vec3 } {
  const n = norm([p[0] - origin[0], p[1] - origin[1], p[2] - origin[2]])
  const pos = add(add(p, mul(n, dist)), [0, dist * 0.18, 0])
  const target: Vec3 = lowerForSheet ? add(p, [0, -dist * 0.22, 0]) : p
  return { pos, target }
}
