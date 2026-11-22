import { create } from 'zustand'
import { all, get, upsert } from '../lib/db'
import { useUi } from './ui'
import { acceptVersion, latest, isBilateral } from '../lib/rules'
import { ME, CO } from '../lib/util'

type Step = { title: string; text: string; wait?: string; enter?: () => void }

const ui = () => useUi.getState()

const freeOpp = () => {
  const applied = new Set(all('applications').filter((a) => a.worker_id === ME).map((a) => a.opportunity_id))
  return all('opportunities').find((o) => o.status === 'abierta' && !applied.has(o.id))?.id ?? 'op_001'
}

const bilateral = (id: string) => {
  let a = get('agreements', id)
  if (!a || (a.worker_id !== ME && a.company_id !== CO)) return
  if (isBilateral(latest(a))) return
  for (const p of ['company', 'worker'] as const) if (!latest(a).acceptedBy.includes(p)) a = acceptVersion(a, latest(a).v, p)
  upsert('agreements', a)
}

const WORKER: Step[] = [
  { title: 'Ofertas', text: 'Estas son ofertas de empresas. Toca una.', wait: 'opp', enter: () => { ui().setView('scene'); ui().showOffers() } },
  { title: 'Postúlate', text: 'Revisa los datos y toca Postularme.', wait: 'apply', enter: () => { if (ui().selected?.kind !== 'opp') ui().selectOpp(freeOpp()) } },
  { title: 'El núcleo', text: 'Toca el núcleo para abrir tu menú.', wait: 'core', enter: () => ui().showOffers() },
  { title: 'Tu menú', text: 'Cada nodo es una sección con su propio menú.', enter: () => ui().openMenu() },
  { title: 'Perfil', text: 'Cambia algo y toca Guardar.', wait: 'save', enter: () => ui().selectModule('perfil', 'datos') },
  { title: 'Portafolio', text: 'Escribe un título y toca Agregar.', wait: 'evidence', enter: () => ui().selectModule('perfil', 'portafolio') },
  { title: 'CV con IA', text: 'Elige una oferta y toca Generar.', wait: 'cv', enter: () => ui().selectModule('cv', 'generar') },
  { title: 'Postulaciones', text: 'Aquí ves el estado de cada postulación.', enter: () => ui().selectModule('postulaciones', 'enviadas') },
  { title: 'Acuerdo', text: 'Revisa el acuerdo y toca Aceptar.', wait: 'accept', enter: () => { ui().setAg('agr_1'); ui().selectModule('acuerdos', 'acuerdo') } },
  { title: 'Entregables', text: 'Marca un entregable como entregado.', wait: 'deliver', enter: () => { bilateral('agr_1'); ui().setAg('agr_1'); ui().selectModule('acuerdos', 'entregables') } },
  { title: 'Pagos', text: 'Aquí ves anticipo y saldo. Confirma lo que recibas.', enter: () => { ui().setAg('agr_1'); ui().selectModule('pagos', 'resumen') } },
  { title: 'Mensajes', text: 'Escribe un mensaje a la empresa.', wait: 'msg', enter: () => { ui().setAg('agr_1'); ui().selectModule('mensajes') } },
  { title: 'Listo', text: 'Las líneas amarillas son tus conexiones. Sigue explorando.', enter: () => ui().showOffers() },
]

const COMPANY: Step[] = [
  { title: 'Tus ofertas', text: 'Estas son tus ofertas. Las líneas amarillas son tus conexiones.', enter: () => { ui().setView('scene'); ui().showOffers() } },
  { title: 'Crea una oferta', text: 'Llena los datos y toca Publicar oferta.', wait: 'publish', enter: () => ui().selectModule('publicar', 'crear') },
  { title: 'Postulaciones', text: 'Aquí llegan las postulaciones a tus ofertas.', enter: () => ui().selectModule('postulaciones') },
  { title: 'Preselección IA', text: 'Toca Preseleccionar con IA en una de tus ofertas.', wait: 'pre', enter: () => ui().selectModule('cv', 'pre') },
  { title: 'Acuerdo', text: 'Revisa el acuerdo y toca Aceptar.', wait: 'accept', enter: () => { ui().setAg('agr_1'); ui().selectModule('acuerdos', 'acuerdo') } },
  { title: 'Pagos', text: 'Reporta el pago del anticipo.', wait: 'pay', enter: () => { bilateral('agr_1'); ui().setAg('agr_1'); ui().selectModule('pagos', 'pagos') } },
  { title: 'Mensajes', text: 'Escribe un mensaje a tu equipo.', wait: 'msg', enter: () => { ui().setAg('agr_1'); ui().selectModule('mensajes') } },
  { title: 'Listo', text: 'Ya recorriste todo. Sigue explorando.', enter: () => ui().showOffers() },
]

export const stepsFor = (role: string) => (role === 'company' ? COMPANY : WORKER)
const cur = () => stepsFor(ui().role)

type T = { active: boolean; i: number; start: () => void; stop: () => void; go: (i: number) => void; next: () => void; prev: () => void; emit: (ev: string) => void }
let timer: ReturnType<typeof setTimeout> | null = null

export const useTour = create<T>((set, g) => ({
  active: false, i: 0,
  start: () => { ui().close(); set({ active: true }); g().go(0) },
  stop: () => { if (timer) clearTimeout(timer); set({ active: false, i: 0 }) },
  go: (i) => { set({ i }); cur()[i]?.enter?.() },
  next: () => { if (timer) clearTimeout(timer); const n = g().i + 1; n >= cur().length ? g().stop() : g().go(n) },
  prev: () => { if (timer) clearTimeout(timer); g().go(Math.max(0, g().i - 1)) },
  emit: (ev) => {
    const { active, i } = g()
    if (!active || cur()[i]?.wait !== ev) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { if (g().active && g().i === i) g().next() }, 1100)
  },
}))

export const emit = (ev: string) => useTour.getState().emit(ev)
