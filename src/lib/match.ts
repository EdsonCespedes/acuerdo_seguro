import { norm } from './util'

const STOP = new Set(['para', 'con', 'de', 'del', 'la', 'el', 'los', 'las', 'en', 'y', 'por', 'una', 'uno', 'sus'])
const stems = (xs: string[]) => {
  const out = new Set<string>()
  for (const x of xs) for (const w of norm(x).split(/[^a-z0-9]+/)) if (w.length >= 4 && !STOP.has(w)) out.add(w.slice(0, 5))
  return out
}
const cover = (need: Set<string>, have: Set<string>) => {
  if (!need.size) return 0
  let n = 0; need.forEach((s) => { if (have.has(s)) n++ })
  return n / need.size
}

export function oppScore(user: any, opp: any): number {
  if (!user || !opp) return 0
  const have = new Set<string>((user.skills || []).map((s: string) => norm(s)))
  const need: string[] = opp.skills || []
  const exact = need.length ? need.filter((s) => have.has(norm(s))).length / need.length : 0
  const soft = cover(stems([...need, opp.specialty, opp.title]), stems([...(user.skills || []), ...(user.tools || []), user.headline || '', ...(user.experience || [])]))
  return Math.min(1, exact * 0.65 + soft * 0.35)
}

export const pct = (s: number) => Math.round(s * 100)
export const MIN_NEAR = 0.1

export type RankedOpp = { opp: any; score: number }
export type RankedCompany = { company: any; score: number; opps: RankedOpp[] }
export type PostGroup = { opp: any; people: { user: any; score: number }[] }

export function companyRanking(me: any, opps: any[], users: any[]): RankedCompany[] {
  const out: RankedCompany[] = []
  for (const c of users.filter((u) => u.role === 'company')) {
    const mine: RankedOpp[] = opps.filter((o) => o.company_id === c.id).map((opp) => ({ opp, score: oppScore(me, opp) })).sort((a, b) => b.score - a.score)
    if (!mine.length) continue
    const top = mine.slice(0, 3).reduce((s, x) => s + x.score, 0) / Math.min(3, mine.length)
    out.push({ company: c, score: mine[0].score * 0.6 + top * 0.4, opps: mine })
  }
  return out.sort((a, b) => b.score - a.score)
}

export function peopleByPost(myOpps: any[], users: any[]): PostGroup[] {
  const workers = users.filter((u) => u.role === 'worker')
  return myOpps.map((opp) => ({
    opp,
    people: workers.map((user) => ({ user, score: oppScore(user, opp) })).filter((p) => p.score >= MIN_NEAR).sort((a, b) => b.score - a.score),
  }))
}
