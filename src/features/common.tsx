import { useCollection } from '../lib/db'
import { useUi } from '../store/ui'
import { ME, CO, shortTitle } from '../lib/util'

export function useTab(mod: string, def: string): [string, (t: string) => void] {
  const t = useUi((s) => s.tabs[mod]) ?? def
  return [t, (x) => useUi.getState().setTab(mod, x)]
}

export function useMyAgs() {
  const role = useUi((s) => s.role)
  const ags = useCollection('agreements')
  return ags.filter((a) => (role === 'company' ? a.company_id === CO : a.worker_id === ME))
}

export function useAgNames() {
  const role = useUi((s) => s.role)
  const users = useCollection('users'); const opps = useCollection('opportunities')
  const nm = (id: string) => users.find((u) => u.id === id)?.name ?? ''
  const brief = (n: string) => { const p = n.split(' '); return p.length > 1 ? `${p[0]} ${p[1][0]}.` : n }
  const other = (ag: any) => (role === 'company' ? nm(ag.worker_id) : nm(ag.company_id))
  return {
    role, other,
    title: other,
    chip: (ag: any) => (role === 'company' ? brief(nm(ag.worker_id)) : ag.short),
    opp: (ag: any) => opps.find((o) => o.id === ag.opportunity_id)?.title ?? '',
    side: (party: 'company' | 'worker', ag: any) => (party === role ? 'Tú' : shortTitle(other(ag), 18)),
  }
}

export function AgPicker() {
  const ags = useMyAgs()
  const names = useAgNames()
  const ag = useAg()
  const setAg = useUi((s) => s.setAg)
  return (
    <div className="picker" role="tablist">
      {ags.map((a) => <button key={a.id} role="tab" aria-selected={ag?.id === a.id} className={'chip' + (ag?.id === a.id ? ' on' : '')} onClick={() => setAg(a.id)}>{names.chip(a)}</button>)}
    </div>
  )
}

export function useAg() {
  const id = useUi((s) => s.ag)
  const ags = useMyAgs()
  return ags.find((a) => a.id === id) ?? ags[0]
}
