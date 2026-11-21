import { create } from 'zustand'
import { all, get, upsert } from '../lib/db'
import { useUi } from './ui'
import { acceptVersion, latest, isBilateral } from '../lib/rules'
import { ME } from '../lib/util'

type Step = { title: string; text: string; wait?: string; enter?: () => void }

const ui = () => useUi.getState()

const freeOpp = () => {
  const applied = new Set(all('applications').filter((a) => a.worker_id === ME).map((a) => a.opportunity_id))
  return all('opportunities').find((o) => o.status === 'abierta' && !applied.has(o.id))?.id ?? 'op_001'
}

const bilateral = (id: string) => {
  let a = get('agreements', id)
  const v = latest(a)
  if (isBilateral(v)) return
  for (const p of ['company', 'worker'] as const) if (!latest(a).acceptedBy.includes(p)) a = acceptVersion(a, latest(a).v, p)
  upsert('agreements', a)
}

export const STEPS: Step[] = [
  { title: 'Convocatorias', text: 'Estas son ofertas de empleadores. Toca una.', wait: 'opp', enter: () => { ui().setRole('worker', true); ui().setView('scene'); ui().showOffers() } },
  { title: 'Postúlate', text: 'Revisa los datos y toca Postularme.', wait: 'apply', enter: () => { if (ui().selected?.kind !== 'opp') ui().selectOpp(freeOpp()) } },
  { title: 'El núcleo', text: 'Toca el núcleo para abrir tu menú.', wait: 'core', enter: () => ui().showOffers() },
  { title: 'Tu menú', text: 'Cada nodo es una sección con su propio menú.', enter: () => ui().openMenu() },
  { title: 'Perfil', text: 'Cambia algo y toca Guardar.', wait: 'save', enter: () => ui().selectModule('perfil', 'datos') },
  { title: 'Portafolio', text: 'Escribe un título y toca Agregar.', wait: 'evidence', enter: () => ui().selectModule('perfil', 'portafolio') },
  { title: 'CV con IA', text: 'Elige una convocatoria y toca Generar.', wait: 'cv', enter: () => ui().selectModule('cv', 'generar') },
  { title: 'Postulaciones', text: 'Aquí ves el estado de cada postulación.', enter: () => ui().selectModule('postulaciones', 'enviadas') },
  { title: 'Acuerdo', text: 'Revisa el acuerdo y toca Aceptar.', wait: 'accept', enter: () => { ui().setRole('worker', true); ui().setAg('agr_1'); ui().selectModule('acuerdos', 'acuerdo') } },
  { title: 'La otra parte', text: 'Ahora eres la empresa. Acepta la misma versión.', wait: 'accept', enter: () => { ui().setRole('company'); ui().selectModule('acuerdos', 'acuerdo') } },
  { title: 'Entregables', text: 'Marca un entregable como entregado.', wait: 'deliver', enter: () => { bilateral('agr_1'); ui().setAg('agr_1'); ui().setRole('worker'); ui().selectModule('acuerdos', 'entregables') } },
  { title: 'Pagos', text: 'Como empresa, reporta el pago del anticipo.', wait: 'pay', enter: () => { bilateral('agr_1'); ui().setAg('agr_1'); ui().setRole('company'); ui().selectModule('pagos', 'pagos') } },
  { title: 'Mensajes', text: 'Escribe un mensaje a la empresa.', wait: 'msg', enter: () => { ui().setAg('agr_1'); ui().setRole('worker', true); ui().selectModule('mensajes') } },
  { title: 'Listo', text: 'Ya recorriste todo. Sigue explorando.', enter: () => { ui().setRole('worker', true); ui().showOffers() } },
]

type T = { active: boolean; i: number; start: () => void; stop: () => void; go: (i: number) => void; next: () => void; prev: () => void; emit: (ev: string) => void }
let timer: ReturnType<typeof setTimeout> | null = null

export const useTour = create<T>((set, g) => ({
  active: false, i: 0,
  start: () => { ui().close(); set({ active: true }); g().go(0) },
  stop: () => { if (timer) clearTimeout(timer); set({ active: false, i: 0 }) },
  go: (i) => { set({ i }); STEPS[i].enter?.() },
  next: () => { if (timer) clearTimeout(timer); const n = g().i + 1; n >= STEPS.length ? g().stop() : g().go(n) },
  prev: () => { if (timer) clearTimeout(timer); g().go(Math.max(0, g().i - 1)) },
  emit: (ev) => {
    const { active, i } = g()
    if (!active || STEPS[i].wait !== ev) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { if (g().active && g().i === i) g().next() }, 1100)
  },
}))

export const emit = (ev: string) => useTour.getState().emit(ev)
