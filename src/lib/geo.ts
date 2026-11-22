import { norm } from './util'

const CITY: Record<string, [number, number]> = {
  cochabamba: [-17.3895, -66.1568], quillacollo: [-17.3969, -66.2786], sacaba: [-17.3994, -66.0386],
  tiquipaya: [-17.3375, -66.2147], vinto: [-17.3869, -66.3036], tarata: [-17.6094, -66.0197],
}

export const knownCities = () => Object.keys(CITY).map((k) => k[0].toUpperCase() + k.slice(1)).sort()

export function km(a?: string, b?: string): number | null {
  const p = CITY[norm(a || '')], q = CITY[norm(b || '')]
  if (!p || !q) return null
  const r = (d: number) => (d * Math.PI) / 180
  const h = Math.sin(r(q[0] - p[0]) / 2) ** 2 + Math.cos(r(p[0])) * Math.cos(r(q[0])) * Math.sin(r(q[1] - p[1]) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}
