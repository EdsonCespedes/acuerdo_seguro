import { useCollection } from '../lib/db'
import { useUi } from '../store/ui'

export function useTab(mod: string, def: string): [string, (t: string) => void] {
  const t = useUi((s) => s.tabs[mod]) ?? def
  return [t, (x) => useUi.getState().setTab(mod, x)]
}

export function AgPicker() {
  const ags = useCollection('agreements')
  const ag = useUi((s) => s.ag)
  const setAg = useUi((s) => s.setAg)
  return (
    <div className="picker" role="tablist">
      {ags.map((a) => <button key={a.id} role="tab" aria-selected={ag === a.id} className={'chip' + (ag === a.id ? ' on' : '')} onClick={() => setAg(a.id)}>{a.short}</button>)}
    </div>
  )
}

export function useAg() {
  const id = useUi((s) => s.ag)
  const ags = useCollection('agreements')
  return ags.find((a) => a.id === id) ?? ags[0]
}
