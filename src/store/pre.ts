import { create } from 'zustand'
import { all, get, upsert } from '../lib/db'
import { useUi } from './ui'
import { emit } from './tour'
import { askAi, aiReady } from '../lib/ai'
import { PRE_DEFAULT, PRE_SYSTEM, PreFilters, PreRun, buildRun, candidatePool, parseResults, prePrompt } from '../lib/preselect'

type S = {
  runs: Record<string, PreRun>
  busy: Record<string, boolean>
  filters: Record<string, PreFilters>
  setFilters: (oppId: string, p: Partial<PreFilters>) => void
  resetFilters: (oppId: string) => void
}

export const usePre = create<S>((set, g) => ({
  runs: {}, busy: {}, filters: {},
  setFilters: (id, p) => set((s) => ({ filters: { ...s.filters, [id]: { ...(s.filters[id] ?? PRE_DEFAULT), ...p } } })),
  resetFilters: (id) => set((s) => ({ filters: { ...s.filters, [id]: { ...PRE_DEFAULT, onlyApplied: (s.filters[id] ?? PRE_DEFAULT).onlyApplied } } })),
}))

export async function runPreselection(oppId: string) {
  const st = usePre.getState()
  if (st.busy[oppId]) return
  const opp = get('opportunities', oppId); if (!opp) return
  const { toast } = useUi.getState()
  const workers = all('users').filter((u) => u.role === 'worker')
  const apps = all('applications')
  const people = candidatePool(opp, workers, apps)
  if (!people.length) return toast('No hay candidatos para analizar en esta convocatoria', 'warn')
  if (!apps.some((a) => a.opportunity_id === oppId)) st.setFilters(oppId, { onlyApplied: false })
  usePre.setState((s) => ({ busy: { ...s.busy, [oppId]: true } }))
  let parsed: ReturnType<typeof parseResults> | null = null
  try {
    parsed = parseResults(await askAi(PRE_SYSTEM, prePrompt(opp, people), { maxTokens: 3500 }))
    if (!Object.keys(parsed).length) throw new Error('sin formato')
  } catch {
    parsed = null
    toast(aiReady ? 'La IA no respondió, se usó el análisis básico' : 'Falta la clave de IA, se usó el análisis básico', 'warn')
  }
  const run = buildRun(opp, people, parsed)
  usePre.setState((s) => ({ runs: { ...s.runs, [oppId]: run }, busy: { ...s.busy, [oppId]: false } }))
  emit('pre')
}

export function syncShortlist(oppId: string, ids: string[]) {
  const keep = new Set(ids)
  for (const a of all('applications')) {
    if (a.opportunity_id !== oppId) continue
    if (keep.has(a.worker_id) && (a.status === 'enviada' || a.status === 'en revisión')) upsert('applications', { ...a, status: 'preseleccionada', ai: true })
    else if (!keep.has(a.worker_id) && a.status === 'preseleccionada' && a.ai) upsert('applications', { ...a, status: 'en revisión', ai: false })
  }
}
