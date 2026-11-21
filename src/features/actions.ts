import { all, get, upsert, remove } from '../lib/db'
import { uid, nowIso, ME, CO } from '../lib/util'
import { useUi } from '../store/ui'
import { emit } from '../store/tour'

export function pickOpp(id: string) { useUi.getState().selectOpp(id); emit('opp') }
export function pressCore() { useUi.getState().pressCore(); emit('core') }

export function applyTo(oppId: string) {
  const { role, toast } = useUi.getState()
  if (role !== 'worker') return toast('Cambia a trabajador para postularte', 'warn')
  if (all('applications').some((a) => a.opportunity_id === oppId && a.worker_id === ME)) return toast('Ya te postulaste', 'warn')
  upsert('applications', { id: uid('app'), opportunity_id: oppId, worker_id: ME, status: 'enviada', createdAt: nowIso() })
  toast('Postulación enviada'); emit('apply')
}

export function toggleSave(oppId: string) {
  const id = 'sv_' + oppId
  const { toast } = useUi.getState()
  if (get('saved', id)) { remove('saved', id); toast('Quitada de guardados') }
  else { upsert('saved', { id, opportunity_id: oppId, user_id: ME }); toast('Guardada') }
}

export function quickApply(oppId: string) { applyTo(oppId) }

export function acceptApplication(appId: string) {
  const a = get('applications', appId); if (!a) return
  upsert('applications', { ...a, status: 'aceptada' })
  const w = get('users', a.worker_id); const o = get('opportunities', a.opportunity_id)
  useUi.getState().toast(`Conexión formada: ${w?.name ?? 'persona'} y ${o?.title ?? 'publicación'}`)
  emit('connect')
}

export function simulateAccept(appId: string) { acceptApplication(appId) }

export const myConnections = () => {
  const { role } = useUi.getState()
  const mine = new Set(all('opportunities').filter((o) => o.company_id === CO).map((o) => o.id))
  return all('applications').filter((a) => a.status === 'aceptada' && (role === 'worker' ? a.worker_id === ME : mine.has(a.opportunity_id)))
}
