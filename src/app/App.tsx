import React, { Component, ReactNode, Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Orbit, List, Box, Zap, ZapOff, Search, Play, X, ChevronLeft, ChevronRight, Send, Link2, Building2, Users, LayoutGrid, Plus, LogOut } from 'lucide-react'
import modules from '../data/modules.json'
import branches from '../data/branches.json'
import { useUi } from '../store/ui'
import { useTour, stepsFor } from '../store/tour'
import { useAuth } from '../store/auth'
import Login from './Login'
import { useCollection, useRecord } from '../lib/db'
import { hasWebGL, fmtBs, fmtDay, leftLabel, shortOf, shortTitle, modLabel, modShort, modulesFor, norm, ROLE_LABEL, ME, CO } from '../lib/util'
import { companyRanking, peopleByPost } from '../lib/match'
import { oppMatches } from '../lib/filters'
import { Sheet, ease, dur } from '../design-system/ui'
import { pickOpp, pressCore } from '../features/actions'
import { Empresa, Persona, Prox } from '../features/Entities'

const loadScene = () => import('../scene/NeuronScene')
const NeuronScene = lazy(loadScene)
const Opportunity = lazy(() => import('../features/Opportunity'))
const PANELS: Record<string, React.LazyExoticComponent<() => JSX.Element>> = {
  perfil: lazy(() => import('../features/Perfil')), cv: lazy(() => import('../features/Cv')), postulaciones: lazy(() => import('../features/Postulaciones')),
  acuerdos: lazy(() => import('../features/Acuerdos')), pagos: lazy(() => import('../features/Pagos')), mensajes: lazy(() => import('../features/Mensajes')),
  cuenta: lazy(() => import('../features/Cuenta')), ayuda: lazy(() => import('../features/Ayuda')), publicar: lazy(() => import('../features/Publicar')),
}
if (typeof window !== 'undefined') (window.requestIdleCallback ?? ((f: () => void) => setTimeout(f, 1500)))(() => { import('../features/Opportunity'); import('../features/Postulaciones') })

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { bad: boolean }> {
  state = { bad: false }
  static getDerivedStateFromError() { return { bad: true } }
  render() { return this.state.bad ? this.props.fallback : this.props.children }
}

function Hud({ webgl }: { webgl: boolean }) {
  const { role, zone, view, setView, reduced, setReduced, selected, applyMode, setApplyMode } = useUi()
  const start = useTour((s) => s.start)
  const userId = useAuth((s) => s.userId); const logout = useAuth((s) => s.logout)
  const me = useRecord('users', userId ?? undefined)
  const touring = useTour((s) => s.active)
  return (
    <>
      <header className="hud-top">
        <b className="brand">Acuerdo Seguro</b>
        <div className="hud-right">
          <div className="who"><b>{shortTitle(me?.name ?? '', 14)}</b><small>{ROLE_LABEL[role]}</small></div>
          {!touring && <button className="pill" onClick={start}><Play size={14} /><span className="pill-t">Demo</span></button>}
          <button className="pill out" onClick={logout} aria-label="Cerrar sesión"><LogOut size={15} /></button>
        </div>
      </header>
      <nav className="hud-side" aria-label="Controles">
        {webgl && <button className="fab" onClick={() => setView(view === 'scene' ? 'list' : 'scene')} aria-label="Cambiar vista">{view === 'scene' ? <List size={20} /> : <Box size={20} />}<span>{view === 'scene' ? 'Lista' : 'Escena'}</span></button>}
        {webgl && role === 'worker' && view === 'scene' && <button className="fab" data-t="applymode" onClick={() => setApplyMode(!applyMode)} aria-pressed={applyMode} aria-label="Modo postular"><Send size={20} /><span>Postular</span></button>}
        {webgl && <button className="fab" onClick={() => setReduced(!reduced)} aria-pressed={reduced} aria-label="Reducir movimiento">{reduced ? <ZapOff size={20} /> : <Zap size={20} />}<span>Movimiento</span></button>}
      </nav>
      <div className={'cta-dock' + (role === 'company' ? ' two' : '')}>
        <AnimatePresence>
          {webgl && view === 'scene' && !selected && (
            <motion.button key={zone} className="cta" data-t="core" onClick={pressCore}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: dur.base, ease }}>
              <Orbit size={18} /> {zone === 'offers' ? 'Abrir menú' : 'Ver ofertas'}
            </motion.button>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {webgl && role === 'company' && view === 'scene' && !selected && (
            <motion.button key="new" className="cta cta-2" data-t="publish" onClick={() => useUi.getState().selectModule('publicar')}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: dur.base, ease }}>
              <Plus size={18} /> Crear oferta
            </motion.button>
          )}
        </AnimatePresence>
      </div>
      {applyMode && role === 'worker' && view === 'scene' && (
        <div className="mode-banner" role="status"><div>Modo postular<small>Toca una burbuja para enviar tu postulación</small></div><button className="btn btn-ghost" onClick={() => setApplyMode(false)}>Salir</button></div>
      )}
    </>
  )
}

function useConnections() {
  const role = useUi((s) => s.role)
  const apps = useCollection('applications')
  const opps = useCollection('opportunities')
  const mine = new Set(opps.filter((o) => o.company_id === CO).map((o) => o.id))
  return apps.filter((a) => a.status === 'aceptada' && (role === 'worker' ? a.worker_id === ME : mine.has(a.opportunity_id))).length
}

function Filters({ inList }: { inList: boolean }) {
  const { query, setQuery, branch, setBranch, role, lens, setLens } = useUi()
  const conns = useConnections()
  const ref = useRef<HTMLInputElement>(null)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = box.current; if (!el) return
    const put = () => document.documentElement.style.setProperty('--filters-h', Math.ceil(el.getBoundingClientRect().bottom) + 12 + 'px')
    put(); const ro = new ResizeObserver(put); ro.observe(el); window.addEventListener('resize', put)
    return () => { ro.disconnect(); window.removeEventListener('resize', put) }
  }, [inList])
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === '/' && !(e.target as HTMLElement)?.matches?.('input,textarea,select')) { e.preventDefault(); ref.current?.focus() } }
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f)
  }, [])
  const alt = role === 'worker' ? { label: 'Empresas', icon: <Building2 size={14} /> } : { label: 'Personas', icon: <Users size={14} /> }
  return (
    <div className={'filters' + (inList ? ' on-list' : '')} ref={box}>
      <div className="row2">
        <div className="seg lens" role="group" aria-label="Vista">
          <button className={lens === 'opps' ? 'on' : ''} aria-pressed={lens === 'opps'} onClick={() => setLens('opps')}><LayoutGrid size={14} />Convocatorias</button>
          <button className={lens === 'group' ? 'on' : ''} aria-pressed={lens === 'group'} data-t="lens" onClick={() => setLens('group')}>{alt.icon}{alt.label}</button>
        </div>
        <span className="stat" aria-label="Conexiones formadas"><Link2 size={14} />Conexiones <b>{conns}</b></span>
      </div>
      <label className="search"><Search size={16} /><input ref={ref} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={lens === 'group' ? (role === 'worker' ? 'Buscar empresa' : 'Buscar persona o publicación') : 'Buscar convocatoria o empresa'} aria-label="Buscar" /><kbd aria-hidden>/</kbd></label>
      {lens === 'opps' && (
        <div className="chips scroll">
          <button className={'chip' + (!branch ? ' on' : '')} onClick={() => setBranch(null)}>Todas</button>
          {branches.map((b) => <button key={b.id} className={'chip' + (branch === b.id ? ' on' : '')} onClick={() => setBranch(b.id)}>{b.name}</button>)}
        </div>
      )}
    </div>
  )
}

function GroupList() {
  const { role, query, selectEntity } = useUi()
  const opps = useCollection('opportunities'); const users = useCollection('users')
  const q = norm(query.trim())
  if (role === 'worker') {
    const rank = companyRanking(users.find((u) => u.id === ME), opps, users).filter((r) => !q || norm(r.company.name + ' ' + r.opps.map((x) => x.opp.title).join(' ')).includes(q))
    return (
      <>
        <h2>Empresas · {rank.length} · de la más cercana a tu perfil</h2>
        {rank.map((r) => (
          <div key={r.company.id}>
            <div className="group-h"><button onClick={() => selectEntity('company', r.company.id)}>{r.company.name}</button><Prox s={r.score} /></div>
            <small className="compat-sub">{r.company.rubro} · {r.opps.length} publicaciones</small>
            <ul className="opps sub">
              {r.opps.map((x) => (
                <li key={x.opp.id}><button onClick={() => pickOpp(x.opp.id)}><span><b>{shortTitle(x.opp.title, 30)}</b><small>{shortOf(x.opp, 44)}</small></span><Prox s={x.score} /></button></li>
              ))}
            </ul>
          </div>
        ))}
        {!rank.length && <p className="empty">Nada coincide. Prueba otra palabra.</p>}
      </>
    )
  }
  const groups = peopleByPost(opps.filter((o) => o.company_id === CO), users)
  return (
    <>
      <h2>Tus ofertas · personas cerca del perfil buscado</h2>
      {!groups.length && <p className="empty">Publica tu primera oferta para ver personas cercanas.</p>}
      {groups.map((g) => {
        const people = g.people.filter((p) => !q || norm(p.user.name + ' ' + g.opp.title + ' ' + p.user.headline).includes(q))
        return (
          <div key={g.opp.id}>
            <div className="group-h"><button onClick={() => pickOpp(g.opp.id)}>{shortTitle(g.opp.title, 30)}</button><small>{people.length} personas</small></div>
            <small className="compat-sub">{(g.opp.skills || []).slice(0, 2).join(' · ')}</small>
            <ul className="opps sub">
              {people.map((p) => (
                <li key={p.user.id}><button onClick={() => selectEntity('person', p.user.id)}><span><b>{p.user.name}</b><small>{p.user.headline}</small></span><Prox s={p.score} /></button></li>
              ))}
              {!people.length && <li className="empty">Sin personas cercanas todavía.</li>}
            </ul>
          </div>
        )
      })}
    </>
  )
}

function ListView({ compat }: { compat: boolean }) {
  const { query, branch, selectModule, lens, role } = useUi()
  const opps = useCollection('opportunities')
  const users = useCollection('users')
  const names = useMemo(() => new Map<string, string>(users.map((u) => [u.id, shortTitle(u.name, 22)])), [users])
  const shown = useMemo(() => opps.filter((o) => oppMatches(o, query, branch)).sort((a, b) => a.deadline.localeCompare(b.deadline)), [opps, query, branch])
  return (
    <motion.div className="listview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: dur.base }}>
      {compat && <p className="compat" role="status">Tu dispositivo no soporta la escena 3D. Todo sigue disponible aquí.</p>}
      <h2>Menú</h2>
      <div className="mods">
        {modulesFor(modules, role).map((m) => <button key={m.id} onClick={() => selectModule(m.id)}><b>{modLabel(m, role)}</b><small>{modShort(m, role)}</small></button>)}
      </div>
      {lens === 'group' ? <GroupList /> : <>
      <h2>Ofertas · {shown.length}</h2>
      <ul className="opps">
        {shown.map((o) => (
          <li key={o.id}>
            <button onClick={() => pickOpp(o.id)}>
              <span><b>{shortTitle(o.title, 30)}</b><small>{names.get(o.company_id)} · {leftLabel(o.deadline)}</small></span>
              <span className="num">{fmtBs(o.budget_cents)}</span>
            </button>
          </li>
        ))}
        {!shown.length && <li className="empty">Nada coincide. Prueba otra palabra.</li>}
      </ul></>}
    </motion.div>
  )
}

function Coach() {
  const { active, i, next, prev, stop } = useTour()
  const role = useUi((s) => s.role)
  const steps = stepsFor(role)
  const step = steps[i] ?? steps[0]
  return (
    <AnimatePresence>
      {active && (
        <motion.div className="coach" role="status" key="coach" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: dur.base, ease }}>
          <div className="coach-top"><small>Demo · {i + 1} de {steps.length}</small><button className="icon-btn sm" aria-label="Salir de la demo" onClick={stop}><X size={16} /></button></div>
          <b>{step.title}</b>
          <p>{step.text}</p>
          <div className="coach-bar"><i style={{ width: `${((i + 1) / steps.length) * 100}%` }} /></div>
          <div className="coach-actions">
            <button className="btn btn-ghost" onClick={prev} disabled={i === 0}><ChevronLeft size={16} /> Atrás</button>
            <button className="btn btn-primary" onClick={next}>{i === steps.length - 1 ? 'Terminar' : step.wait ? 'Saltar' : 'Siguiente'} {i < steps.length - 1 && <ChevronRight size={16} />}</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Toasts() {
  const toasts = useUi((s) => s.toasts)
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>{toasts.map((t) => (
        <motion.div key={t.id} className={'toast ' + t.tone} layout initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: dur.base, ease }}>{t.msg}</motion.div>
      ))}</AnimatePresence>
    </div>
  )
}

function Main() {
  const [webgl, setWebgl] = useState(hasWebGL)
  const { selected, close, reduced, view, zone, role } = useUi()
  const { active, i } = useTour()
  const opp = useRecord('opportunities', selected?.kind === 'opp' ? selected.id : undefined)
  const ent = useRecord('users', selected?.kind === 'company' || selected?.kind === 'person' ? selected.id : undefined)
  useEffect(() => { const f = () => setWebgl(false); window.addEventListener('as-webgl-lost', f); return () => window.removeEventListener('as-webgl-lost', f) }, [])
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape' && !(e.target as HTMLElement)?.matches?.('input,textarea,select')) close() }
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f)
  }, [close])
  useEffect(() => { document.body.dataset.tour = active ? stepsFor(role)[i]?.wait ?? '' : ''; document.body.dataset.touring = active ? '1' : '' }, [active, i, role])

  const mod = selected?.kind === 'module' ? modules.find((m) => m.id === selected.id) : null
  const Panel = mod ? PANELS[mod.id] : null
  const title = mod ? modLabel(mod, role) : opp ? shortTitle(opp.title, 32) : ent ? shortTitle(ent.name, 28) : ''
  const kicker = mod ? 'Menú' : opp ? `Cierra ${fmtDay(opp.deadline)}` : ent ? (selected?.kind === 'company' ? 'Empresa' : 'Persona') : ''
  const showList = view === 'list' || !webgl
  useEffect(() => { document.body.dataset.view = showList ? 'list' : 'scene' }, [showList])
  const showFilters = !active && (showList || zone === 'offers') && !selected

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <div className="app">
        {webgl && (
          <Boundary fallback={<ListView compat />}>
            <Suspense fallback={<div className="boot">Cargando…</div>}>
              <div style={{ position: 'absolute', inset: 0, visibility: view === 'scene' ? 'visible' : 'hidden' }}><NeuronScene /></div>
            </Suspense>
          </Boundary>
        )}
        <Hud webgl={webgl} />
        <AnimatePresence>{showList && <ListView key="lv" compat={!webgl} />}</AnimatePresence>
        {showFilters && <Filters inList={showList} />}
        <Sheet open={!!selected && !!(Panel || opp || ent)} onClose={close} title={title} kicker={kicker}>
          <Suspense fallback={null}>
            {Panel ? <Panel /> : selected?.kind === 'opp' ? <Opportunity id={selected.id} /> : selected?.kind === 'company' ? <Empresa id={selected.id} /> : selected?.kind === 'person' ? <Persona id={selected.id} /> : null}
          </Suspense>
        </Sheet>
        <Coach />
        <Toasts />
      </div>
    </MotionConfig>
  )
}

export default function App() {
  const userId = useAuth((s) => s.userId)
  useEffect(() => { if (!userId) loadScene() }, [userId])
  return userId ? <Main key={userId} /> : <Login />
}
