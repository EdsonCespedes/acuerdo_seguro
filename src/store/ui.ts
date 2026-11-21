import { create } from 'zustand'
import { Vec3, uid } from '../lib/util'
import { homeView, offersView, MODULE_POS, focusView } from '../lib/layout'
import { computeWorld, Lens } from '../lib/world'

export type Role = 'worker' | 'company'
type Sel = { kind: 'module' | 'opp' | 'company' | 'person'; id: string } | null
type Flight = { pos: Vec3; target: Vec3 } | null
type Toast = { id: string; msg: string; tone: 'ok' | 'warn' | 'err' }

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 900
const prefersReduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

type S = {
  role: Role; selected: Sel; view: 'scene' | 'list'; zone: 'offers' | 'modules'
  reduced: boolean; flight: Flight; query: string; branch: string | null; toasts: Toast[]
  tabs: Record<string, string>; ag: string; lens: Lens; applyMode: boolean
  setRole: (r: Role, silent?: boolean) => void
  selectModule: (id: string, tab?: string) => void
  selectOpp: (id: string) => void
  selectEntity: (kind: 'company' | 'person', id: string) => void
  setLens: (l: Lens) => void
  setApplyMode: (b: boolean) => void
  close: () => void
  openMenu: () => void
  showOffers: () => void
  pressCore: () => void
  setView: (v: 'scene' | 'list') => void
  setReduced: (b: boolean) => void
  setQuery: (q: string) => void
  setBranch: (b: string | null) => void
  setTab: (mod: string, tab: string) => void
  setAg: (id: string) => void
  toast: (msg: string, tone?: Toast['tone']) => void
}

export const useUi = create<S>((set, get_) => ({
  role: 'worker', selected: null, view: 'scene', zone: 'offers', reduced: prefersReduced(), flight: null, query: '', branch: null, toasts: [],
  tabs: {}, ag: 'agr_1', lens: 'opps', applyMode: false,
  setRole: (role, silent) => { set({ role, lens: 'opps', applyMode: false }); if (!silent) get_().toast(role === 'worker' ? 'Ahora eres trabajador' : 'Ahora eres empresa') },
  selectModule: (id, tab) => {
    const p = MODULE_POS[id]
    set((s) => ({
      selected: { kind: 'module', id }, zone: 'modules', flight: p ? focusView(p, 3.4, isMobile()) : null,
      tabs: tab ? { ...s.tabs, [id]: tab } : s.tabs,
    }))
  },
  selectOpp: (id) => {
    const p = computeWorld(get_().role, get_().lens).opps[id]
    set({ selected: { kind: 'opp', id }, zone: 'offers', flight: p ? focusView(p.pos, 7, isMobile()) : null })
  },
  selectEntity: (kind, id) => {
    const w = computeWorld(get_().role, get_().lens)
    const p = kind === 'company' ? w.companies[id] : w.people[id]
    set({ selected: { kind, id }, zone: 'offers', flight: p ? focusView(p.pos, 6, isMobile()) : null })
  },
  setLens: (lens) => set({ lens, selected: null, zone: 'offers', flight: offersView(isMobile()) }),
  setApplyMode: (applyMode) => set({ applyMode, selected: applyMode ? null : get_().selected }),
  close: () => set({ selected: null }),
  openMenu: () => set({ selected: null, zone: 'modules', flight: homeView(isMobile()) }),
  showOffers: () => set({ selected: null, zone: 'offers', flight: offersView(isMobile()) }),
  pressCore: () => (get_().zone === 'offers' ? get_().openMenu() : get_().showOffers()),
  setView: (view) => set({ view }),
  setReduced: (reduced) => set({ reduced }),
  setQuery: (query) => set({ query }),
  setBranch: (branch) => set({ branch }),
  setTab: (mod, tab) => set((s) => ({ tabs: { ...s.tabs, [mod]: tab } })),
  setAg: (ag) => set({ ag }),
  toast: (msg, tone = 'ok') => {
    const t = { id: uid('t'), msg, tone }
    set((s) => ({ toasts: [...s.toasts, t] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== t.id) })), 3200)
  },
}))
